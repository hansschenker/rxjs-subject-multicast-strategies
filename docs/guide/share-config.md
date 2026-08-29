# share() with Config — the Whole Space, Explicit

**Era: RxJS 7. Replaces: every `publishX().refCount()` combination, `refCount` itself, and the internals of `shareReplay`.**

RxJS 7 turned the old zoo of shorthands into four orthogonal knobs:

```ts
share({
  connector: () => new Subject(),   // WHICH Subject (memory policy)
  resetOnError: true,               // discard the Subject after an error?
  resetOnComplete: true,            // discard it after completion?
  resetOnRefCountZero: true,        // discard it when the last subscriber leaves?
})
```

`share()` with no arguments keeps its [classic behavior](/guide/share-classic) — all resets `true`, plain `Subject`. Two facts about the flags are easy to get wrong, and both are pinned by this repo's Vitest specs (`npm test`):

- **`resetOnRefCountZero: false` keeps the upstream *connected* while nobody is subscribed.** Values keep flowing into the retained Subject during idle — exactly the `shareReplay` leak. Only `true` (or a notifier) disconnects and discards at zero.
- **After a terminal event, only the matching terminal flag matters.** A Subject retained by `resetOnComplete: false` or `resetOnError: false` can never be evicted by subscribers leaving — the refCount-zero reset applies only *before* a terminal event.

Both facts are consequences of the [Router Algebra partition law](/guide/router-algebra#two-amendments-the-specs-proved): each reset flag owns exactly one disjoint lifecycle regime.

## The 8 reset profiles

The three booleans `[resetOnRefCountZero, resetOnComplete, resetOnError]` yield 8 profiles. All are algebraically valid; they are far from equally useful:

| Profile | Name | Utility |
|---|---|---|
| `[t, t, t]` | **Clean-slate broadcast** (default) | Transient realtime data — WebSocket feeds, mouse moves, telemetry. Fresh Subject and fresh upstream for every wave of subscribers. |
| `[f, f, t]` | **Resilient Static Cache** | *The* headline production pattern, paired with `ReplaySubject(1)`: **cache success, retry failure.** Success is retained forever; an error discards the Subject so the next subscriber retries. |
| `[t, f, f]` | **Terminal-state cache** | Once the source completes *or* errors, that terminal state is cached permanently — subscribers leaving cannot evict it. The `t` matters only mid-stream: abandon the stream before any terminal event and it resets. |
| `[f, f, f]` | **Permanent application singleton** | One-time startup work (config, session bootstrap) where failure is fatal and retry is deliberately banned. The terminal state is locked in forever, and the upstream stays connected while idle. |
| `[t, f, t]` | Completed-state cache, error resets | A successful completion is cached permanently; an error resets for retry; abandoning the stream mid-flight resets. |
| `[f, t, t]` | Live idle cache | Idle keeps the Subject **and the upstream connection** alive — values produced while nobody listens are captured and replayed to the next subscriber. Any terminal event resets. |
| `[t, t, f]` | Error lock | An error is locked in permanently — subscribers leaving cannot clear it. A successful completion resets; abandoning mid-stream resets. |
| `[f, t, f]` | *The theoretical outlier* | Resets on **success**, permanently locks on **failure** — the exact inverse of resilience. Virtually zero real-world use. |

## Reset notifiers — beyond true/false

Each reset flag also accepts a **notifier factory**, a power the legacy API never had. The classic use is a disconnect grace period, so a quick route change does not tear down and re-fire an expensive source:

```ts
share({
  connector: () => new ReplaySubject(1),
  resetOnRefCountZero: () => timer(2000), // linger 2 s after the last unsubscribe
});
```

## Sample

<<< ../../src/samples/09-share-config.ts

```sh
node src/samples/09-share-config.ts
```

Expected output, first section: attempt&nbsp;#1 fails and A sees the error; B triggers attempt&nbsp;#2 which succeeds; C then gets the payload **from cache with no attempt&nbsp;#3** — cache success, retry failure, proven by the attempt counter. Second section: G leaves, but H arrives inside the 200&nbsp;ms grace window and joins the **same execution** (no second `GRACE SOURCE: started`), picking up at the live edge.

## Choosing a profile

Start from the default. Reach for `[f, f, t]` + `ReplaySubject(1)` when the source is a finite fetch worth caching. Reach for `[t, f, f]` when terminal results should be cached for good but an abandoned in-flight stream should start over. Reach for `[f, f, f]` only when a retry would be *wrong*. If you find yourself wanting anything else, write down which of the three lifecycle events should discard state — the flags then write themselves.

Every row of the table above is executable: `src/tests/share-reset-profiles.test.ts` pins all 8 profiles across the three lifecycle events (idle, complete, error) plus the two invariants at the top of this page — run `npm test`. Or drive the profiles interactively in the [Reset Flags Playground](/guide/playground).
