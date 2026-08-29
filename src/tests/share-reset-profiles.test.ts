// Specs for the 8 reset profiles of share():
// [resetOnRefCountZero, resetOnComplete, resetOnError].
// Each profile is pinned by its behavior across the three lifecycle events:
// all subscribers leaving mid-stream (idle), upstream complete, upstream error.
import { describe, expect, it } from 'vitest';
import { Observable, ReplaySubject, share, Subject } from 'rxjs';
import type { Subscription } from 'rxjs';

type ResetProfile = readonly [
  resetOnRefCountZero: boolean,
  resetOnComplete: boolean,
  resetOnError: boolean,
];

interface Harness {
  shared$: Observable<number>;
  /** One externally-driven Subject per upstream execution — length = execution count. */
  drivers: Subject<number>[];
  /** How many upstream executions have been torn down (disconnected). */
  teardowns: () => number;
}

function makeHarness(profile: ResetProfile): Harness {
  const [resetOnRefCountZero, resetOnComplete, resetOnError] = profile;
  const drivers: Subject<number>[] = [];
  let teardownCount = 0;
  const source$ = new Observable<number>((subscriber) => {
    const driver = new Subject<number>();
    drivers.push(driver);
    const sub = driver.subscribe(subscriber);
    return () => {
      teardownCount++;
      sub.unsubscribe();
    };
  });
  return {
    shared$: source$.pipe(
      share({
        connector: () => new ReplaySubject<number>(10),
        resetOnRefCountZero,
        resetOnComplete,
        resetOnError,
      }),
    ),
    drivers,
    teardowns: () => teardownCount,
  };
}

function collect(shared$: Observable<number>): { events: string[]; sub: Subscription } {
  const events: string[] = [];
  const sub = shared$.subscribe({
    next: (v) => events.push(`next:${v}`),
    error: (e: Error) => events.push(`error:${e.message}`),
    complete: () => events.push('complete'),
  });
  return { events, sub };
}

interface ProfileSpec {
  profile: ResetProfile;
  name: string;
  idle: { upstreamDisconnected: boolean; reExecutes: boolean; lateReplay: string[] };
  afterComplete: { reExecutes: boolean; lateEvents: string[] };
  afterError: { reExecutes: boolean; lateEvents: string[] };
}

const FRESH: string[] = []; // a fresh execution replays nothing

const PROFILES: ProfileSpec[] = [
  {
    profile: [true, true, true],
    name: '[t,t,t] clean-slate broadcast (default)',
    idle: { upstreamDisconnected: true, reExecutes: true, lateReplay: FRESH },
    afterComplete: { reExecutes: true, lateEvents: FRESH },
    afterError: { reExecutes: true, lateEvents: FRESH },
  },
  {
    profile: [false, true, true],
    name: '[f,t,t] live idle cache - never lets go while non-terminal',
    idle: { upstreamDisconnected: false, reExecutes: false, lateReplay: ['next:1', 'next:2'] },
    afterComplete: { reExecutes: true, lateEvents: FRESH },
    afterError: { reExecutes: true, lateEvents: FRESH },
  },
  {
    profile: [true, false, true],
    name: '[t,f,t] completed-state cache, error resets',
    idle: { upstreamDisconnected: true, reExecutes: true, lateReplay: FRESH },
    afterComplete: { reExecutes: false, lateEvents: ['next:1', 'complete'] },
    afterError: { reExecutes: true, lateEvents: FRESH },
  },
  {
    profile: [true, true, false],
    name: '[t,t,f] error lock, complete resets',
    idle: { upstreamDisconnected: true, reExecutes: true, lateReplay: FRESH },
    afterComplete: { reExecutes: true, lateEvents: FRESH },
    afterError: { reExecutes: false, lateEvents: ['next:1', 'error:boom'] },
  },
  {
    profile: [false, false, true],
    name: '[f,f,t] resilient static cache - cache success, retry failure',
    idle: { upstreamDisconnected: false, reExecutes: false, lateReplay: ['next:1', 'next:2'] },
    afterComplete: { reExecutes: false, lateEvents: ['next:1', 'complete'] },
    afterError: { reExecutes: true, lateEvents: FRESH },
  },
  {
    profile: [false, true, false],
    name: '[f,t,f] the theoretical outlier - reset on success, lock on failure',
    idle: { upstreamDisconnected: false, reExecutes: false, lateReplay: ['next:1', 'next:2'] },
    afterComplete: { reExecutes: true, lateEvents: FRESH },
    afterError: { reExecutes: false, lateEvents: ['next:1', 'error:boom'] },
  },
  {
    profile: [true, false, false],
    name: '[t,f,f] terminal-state cache with pre-terminal eviction',
    idle: { upstreamDisconnected: true, reExecutes: true, lateReplay: FRESH },
    afterComplete: { reExecutes: false, lateEvents: ['next:1', 'complete'] },
    afterError: { reExecutes: false, lateEvents: ['next:1', 'error:boom'] },
  },
  {
    profile: [false, false, false],
    name: '[f,f,f] permanent application singleton',
    idle: { upstreamDisconnected: false, reExecutes: false, lateReplay: ['next:1', 'next:2'] },
    afterComplete: { reExecutes: false, lateEvents: ['next:1', 'complete'] },
    afterError: { reExecutes: false, lateEvents: ['next:1', 'error:boom'] },
  },
];

for (const spec of PROFILES) {
  describe(spec.name, () => {
    it('idle: all subscribers leave before any terminal event', () => {
      const h = makeHarness(spec.profile);
      const a = collect(h.shared$);
      h.drivers[0].next(1);
      a.sub.unsubscribe();

      expect(h.teardowns(), 'upstream disconnected at refCount zero').toBe(
        spec.idle.upstreamDisconnected ? 1 : 0,
      );

      // Emitted while nobody is subscribed - only a still-connected,
      // retained Subject can capture this value.
      h.drivers[0].next(2);

      const b = collect(h.shared$);
      expect(h.drivers.length, 'source executions after resubscribe').toBe(
        spec.idle.reExecutes ? 2 : 1,
      );
      expect(b.events, 'replay handed to the late subscriber').toEqual(spec.idle.lateReplay);
      b.sub.unsubscribe();
    });

    it('after complete: what a late subscriber gets', () => {
      const h = makeHarness(spec.profile);
      const a = collect(h.shared$);
      h.drivers[0].next(1);
      h.drivers[0].complete();
      expect(a.events).toEqual(['next:1', 'complete']);

      const b = collect(h.shared$);
      expect(h.drivers.length, 'source executions after resubscribe').toBe(
        spec.afterComplete.reExecutes ? 2 : 1,
      );
      expect(b.events, 'events handed to the late subscriber').toEqual(
        spec.afterComplete.lateEvents,
      );
      b.sub.unsubscribe();
    });

    it('after error: what a late subscriber gets', () => {
      const h = makeHarness(spec.profile);
      const a = collect(h.shared$);
      h.drivers[0].next(1);
      h.drivers[0].error(new Error('boom'));
      expect(a.events).toEqual(['next:1', 'error:boom']);

      const b = collect(h.shared$);
      expect(h.drivers.length, 'source executions after resubscribe').toBe(
        spec.afterError.reExecutes ? 2 : 1,
      );
      expect(b.events, 'events handed to the late subscriber').toEqual(spec.afterError.lateEvents);
      b.sub.unsubscribe();
    });
  });
}

describe('cross-profile invariants', () => {
  it('post-terminal retention is governed only by the matching terminal flag - resetOnRefCountZero cannot evict a retained terminal Subject', () => {
    // [t,f,f]: complete, everyone leaves (refCount 0), yet the cache survives.
    const h = makeHarness([true, false, false]);
    const a = collect(h.shared$);
    h.drivers[0].next(1);
    h.drivers[0].complete(); // a's subscription closes here - refCount is 0
    expect(a.events).toEqual(['next:1', 'complete']);

    const b = collect(h.shared$);
    expect(h.drivers.length).toBe(1); // no re-execution
    expect(b.events).toEqual(['next:1', 'complete']); // cache intact
    b.sub.unsubscribe();
  });

  it('resetOnRefCountZero: false keeps the upstream RUNNING while nobody listens (the shareReplay-style leak)', () => {
    const h = makeHarness([false, true, true]);
    const a = collect(h.shared$);
    h.drivers[0].next(1);
    a.sub.unsubscribe();
    expect(h.teardowns()).toBe(0); // upstream was NOT disconnected

    h.drivers[0].next(2); // produced with zero subscribers...
    h.drivers[0].next(3);

    const b = collect(h.shared$);
    expect(b.events).toEqual(['next:1', 'next:2', 'next:3']); // ...and captured
    b.sub.unsubscribe();
  });

  it('the resilient static cache [f,f,t] retries failures and then caches success for everyone', () => {
    const h = makeHarness([false, false, true]);
    const a = collect(h.shared$);
    h.drivers[0].error(new Error('network timeout'));
    expect(a.events).toEqual(['error:network timeout']);

    const b = collect(h.shared$); // triggers attempt #2
    expect(h.drivers.length).toBe(2);
    h.drivers[1].next(42);
    h.drivers[1].complete();
    expect(b.events).toEqual(['next:42', 'complete']);

    const c = collect(h.shared$); // no attempt #3 - served from cache
    expect(h.drivers.length).toBe(2);
    expect(c.events).toEqual(['next:42', 'complete']);
    c.sub.unsubscribe();
  });
});
