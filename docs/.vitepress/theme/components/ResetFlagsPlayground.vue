<script setup lang="ts">
import { computed, nextTick, onUnmounted, reactive, ref, watch } from 'vue';
import {
  AsyncSubject,
  BehaviorSubject,
  Observable,
  ReplaySubject,
  share,
  Subject,
} from 'rxjs';
import type { Subscription } from 'rxjs';

type ConnectorKind = 'Subject' | 'BehaviorSubject(0)' | 'ReplaySubject(3)' | 'AsyncSubject';
type LogKind = 'source' | 'share' | 'action' | 'subscriber';
type SubStatus = 'live' | 'unsubscribed' | 'completed' | 'errored';

interface LogEntry {
  seq: number;
  kind: LogKind;
  label: string;
  text: string;
}

interface SubRecord {
  id: number;
  events: string[];
  status: SubStatus;
}

const CONNECTORS: ConnectorKind[] = ['ReplaySubject(3)', 'Subject', 'BehaviorSubject(0)', 'AsyncSubject'];

const PROFILE_NAMES: Record<string, string> = {
  ttt: 'Clean-slate broadcast (the default)',
  ftt: 'Live idle cache',
  tft: 'Completed-state cache, error resets',
  ttf: 'Error lock',
  fft: 'Resilient static cache — cache success, retry failure',
  ftf: 'The theoretical outlier — reset on success, lock on failure',
  tff: 'Terminal-state cache',
  fff: 'Permanent application singleton',
};

const flags = reactive({ z: true, c: true, e: true });
const connectorKind = ref<ConnectorKind>('ReplaySubject(3)');

const subscriberRecords = reactive<SubRecord[]>([]);
const log = reactive<LogEntry[]>([]);
const executions = ref(0);
const teardowns = ref(0);
const logEl = ref<HTMLElement | null>(null);

let shared$: Observable<number> | null = null;
let drivers: Subject<number>[] = [];
const liveSubs = new Map<number, Subscription>();
let nextSubscriberId = 1;
let nextValue = 1;
let seq = 0;

const connected = computed(() => executions.value > teardowns.value);
const activeCount = computed(() => subscriberRecords.filter((s) => s.status === 'live').length);
const profileKey = computed(
  () => `${flags.z ? 't' : 'f'}${flags.c ? 't' : 'f'}${flags.e ? 't' : 'f'}`,
);
const profileLabel = computed(
  () => `[${flags.z ? 't' : 'f'}, ${flags.c ? 't' : 'f'}, ${flags.e ? 't' : 'f'}]`,
);
const profileName = computed(() => PROFILE_NAMES[profileKey.value]);

function addLog(kind: LogKind, label: string, text: string): void {
  seq += 1;
  log.push({ seq, kind, label, text });
  if (log.length > 200) log.splice(0, log.length - 200);
}

function makeConnector(): () => Subject<number> {
  switch (connectorKind.value) {
    case 'BehaviorSubject(0)':
      return () => new BehaviorSubject(0);
    case 'ReplaySubject(3)':
      return () => new ReplaySubject<number>(3);
    case 'AsyncSubject':
      return () => new AsyncSubject<number>();
    default:
      return () => new Subject<number>();
  }
}

function rebuild(): void {
  for (const sub of liveSubs.values()) sub.unsubscribe();
  liveSubs.clear();
  subscriberRecords.splice(0);
  log.splice(0);
  drivers = [];
  executions.value = 0;
  teardowns.value = 0;
  nextSubscriberId = 1;
  nextValue = 1;
  seq = 0;

  const source$ = new Observable<number>((subscriber) => {
    const driver = new Subject<number>();
    drivers.push(driver);
    const n = drivers.length;
    executions.value = n;
    addLog('source', 'SOURCE', `execution #${n} started`);
    const sub = driver.subscribe(subscriber);
    return () => {
      teardowns.value += 1;
      addLog('source', 'SOURCE', `execution #${n} torn down — upstream disconnected`);
      sub.unsubscribe();
    };
  });

  shared$ = source$.pipe(
    share({
      connector: makeConnector(),
      resetOnRefCountZero: flags.z,
      resetOnComplete: flags.c,
      resetOnError: flags.e,
    }),
  );
  addLog('share', 'SHARE', `pipeline built: ${profileLabel.value} × ${connectorKind.value}`);
}

function addSubscriber(): void {
  if (!shared$) return;
  const id = nextSubscriberId;
  nextSubscriberId += 1;
  const record = reactive<SubRecord>({ id, events: [], status: 'live' });
  subscriberRecords.push(record);
  addLog('action', 'ACTION', `S${id} subscribes`);
  const sub = shared$.subscribe({
    next: (v) => {
      record.events.push(`next:${v}`);
      addLog('subscriber', `S${id}`, `received next:${v}`);
    },
    error: (err: Error) => {
      record.events.push(`error:${err.message}`);
      record.status = 'errored';
      addLog('subscriber', `S${id}`, `received error:${err.message}`);
    },
    complete: () => {
      record.events.push('complete');
      record.status = 'completed';
      addLog('subscriber', `S${id}`, 'received complete');
    },
  });
  if (record.status === 'live') {
    liveSubs.set(id, sub);
  }
}

function removeSubscriber(id: number): void {
  const sub = liveSubs.get(id);
  const record = subscriberRecords.find((s) => s.id === id);
  if (!sub || !record || record.status !== 'live') return;
  addLog('action', 'ACTION', `S${id} unsubscribes`);
  sub.unsubscribe();
  record.status = 'unsubscribed';
  liveSubs.delete(id);
}

function currentDriver(): Subject<number> | null {
  return connected.value && drivers.length > 0 ? drivers[drivers.length - 1] : null;
}

function pushNext(): void {
  const d = currentDriver();
  if (!d) return;
  addLog('action', 'ACTION', `source pushes next(${nextValue})`);
  d.next(nextValue);
  nextValue += 1;
}

function pushComplete(): void {
  const d = currentDriver();
  if (!d) return;
  addLog('action', 'ACTION', 'source completes');
  d.complete();
}

function pushError(): void {
  const d = currentDriver();
  if (!d) return;
  addLog('action', 'ACTION', 'source errors (boom)');
  d.error(new Error('boom'));
}

watch(
  () => [flags.z, flags.c, flags.e, connectorKind.value],
  () => rebuild(),
);

watch(
  () => log.length,
  async () => {
    await nextTick();
    if (logEl.value) logEl.value.scrollTop = logEl.value.scrollHeight;
  },
);

onUnmounted(() => {
  for (const sub of liveSubs.values()) sub.unsubscribe();
  liveSubs.clear();
});

rebuild();
</script>

<template>
  <div class="playground">
    <div class="controls">
      <div class="toggles">
        <label class="toggle">
          <input v-model="flags.z" type="checkbox" />
          <span><code>resetOnRefCountZero</code><small>idle regime</small></span>
        </label>
        <label class="toggle">
          <input v-model="flags.c" type="checkbox" />
          <span><code>resetOnComplete</code><small>completed regime</small></span>
        </label>
        <label class="toggle">
          <input v-model="flags.e" type="checkbox" />
          <span><code>resetOnError</code><small>errored regime</small></span>
        </label>
        <label class="toggle connector">
          <span><code>connector</code><small>memory policy</small></span>
          <select v-model="connectorKind">
            <option v-for="k in CONNECTORS" :key="k" :value="k">{{ k }}</option>
          </select>
        </label>
      </div>
      <div class="profile">
        <span class="profile-key">{{ profileLabel }}</span>
        <span class="profile-name">{{ profileName }}</span>
      </div>
    </div>

    <div class="status">
      <span class="badge">executions: <strong>{{ executions }}</strong></span>
      <span class="badge" :class="connected ? 'ok' : 'off'">
        upstream: <strong>{{ connected ? 'connected' : 'disconnected' }}</strong>
      </span>
      <span class="badge">active subscribers: <strong>{{ activeCount }}</strong></span>
    </div>

    <div class="actions">
      <button class="btn primary" @click="addSubscriber">+ add subscriber</button>
      <button class="btn" :disabled="!connected" @click="pushNext">source next({{ nextValue }})</button>
      <button class="btn" :disabled="!connected" @click="pushComplete">source complete</button>
      <button class="btn danger" :disabled="!connected" @click="pushError">source error</button>
      <button class="btn ghost" @click="rebuild">reset demo</button>
    </div>

    <p v-if="executions === 0" class="hint">
      The upstream runs on demand — add a subscriber to start execution #1.
    </p>

    <div v-if="subscriberRecords.length" class="subscribers">
      <div
        v-for="s in subscriberRecords"
        :key="s.id"
        class="sub-card"
        :class="`st-${s.status}`"
      >
        <span class="sub-id">S{{ s.id }}</span>
        <span class="sub-status">{{ s.status }}</span>
        <span class="sub-events">{{ s.events.join('  ') || '(waiting)' }}</span>
        <button v-if="s.status === 'live'" class="btn tiny" @click="removeSubscriber(s.id)">
          unsubscribe
        </button>
      </div>
    </div>

    <div ref="logEl" class="log">
      <div v-for="entry in log" :key="entry.seq" class="log-line" :class="`k-${entry.kind}`">
        <span class="seq">{{ entry.seq }}</span>
        <span class="label">{{ entry.label }}</span>
        <span class="text">{{ entry.text }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.playground {
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 16px;
  margin: 24px 0;
  background: var(--vp-c-bg-soft);
  font-size: 14px;
}
.controls {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: flex-start;
  justify-content: space-between;
}
.toggles {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 18px;
}
.toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}
.toggle input {
  accent-color: var(--vp-c-brand-1);
  width: 16px;
  height: 16px;
}
.toggle span {
  display: flex;
  flex-direction: column;
  line-height: 1.25;
}
.toggle small {
  color: var(--vp-c-text-2);
  font-size: 11px;
}
.toggle select {
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  padding: 4px 8px;
}
.profile {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  min-width: 220px;
}
.profile-key {
  font-family: var(--vp-font-family-mono);
  font-weight: 700;
  color: var(--vp-c-brand-1);
}
.profile-name {
  color: var(--vp-c-text-2);
  text-align: right;
}
.status {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 14px 0 10px;
}
.badge {
  border: 1px solid var(--vp-c-divider);
  border-radius: 999px;
  padding: 2px 12px;
  background: var(--vp-c-bg);
}
.badge.ok {
  border-color: var(--vp-c-green-2);
  color: var(--vp-c-green-1);
}
.badge.off {
  color: var(--vp-c-text-2);
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}
.btn {
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 6px 14px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  cursor: pointer;
  font-size: 13px;
  transition: border-color 0.15s, background 0.15s;
}
.btn:hover:not(:disabled) {
  border-color: var(--vp-c-brand-1);
}
.btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.btn.primary {
  background: var(--vp-c-brand-soft);
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
  font-weight: 600;
}
.btn.danger:hover:not(:disabled) {
  border-color: var(--vp-c-red-1);
  color: var(--vp-c-red-1);
}
.btn.ghost {
  background: transparent;
}
.btn.tiny {
  padding: 1px 8px;
  font-size: 11px;
}
.hint {
  color: var(--vp-c-text-2);
  font-style: italic;
  margin: 8px 0;
}
.subscribers {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}
.sub-card {
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 5px 10px;
  background: var(--vp-c-bg);
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
}
.sub-id {
  font-weight: 700;
  color: var(--vp-c-brand-1);
}
.sub-status {
  font-size: 11px;
  color: var(--vp-c-text-2);
  min-width: 84px;
}
.st-completed .sub-status { color: var(--vp-c-green-1); }
.st-errored .sub-status { color: var(--vp-c-red-1); }
.sub-events {
  flex: 1;
  overflow-x: auto;
  white-space: nowrap;
}
.log {
  max-height: 260px;
  overflow-y: auto;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-code-block-bg);
  padding: 8px 10px;
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  line-height: 1.7;
}
.log-line {
  display: flex;
  gap: 10px;
  white-space: nowrap;
}
.seq {
  color: var(--vp-c-text-3);
  min-width: 26px;
  text-align: right;
}
.label {
  min-width: 62px;
  font-weight: 600;
}
.k-source .label { color: var(--vp-c-yellow-1, #b8860b); }
.k-share .label { color: var(--vp-c-purple-1, #7c3aed); }
.k-action .label { color: var(--vp-c-brand-1); }
.k-subscriber .label { color: var(--vp-c-green-1, #16a34a); }
.text {
  color: var(--vp-c-text-1);
}
</style>
