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

`share()` with no arguments keeps its [classic behavior](/guide/share-classic) — all resets `true`, plain `Subject`. Note that regardless of `resetOnRefCountZero`, `share` always *disconnects from the upstream source* when the subscriber count hits zero; the flag only decides whether the **Subject and its state** survive to the next subscriber.

## The 8 reset profiles

The three booleans `[resetOnRefCountZero, resetOnComplete, resetOnError]` yield 8 profiles. All are algebraically valid; they are far from equally useful:

| Profile | Name | Utility |
|---|---|---|
| `[t, t, t]` | **Clean-slate broadcast** (default) | Transient realtime data — WebSocket feeds, mouse moves, telemetry. Fresh Subject and fresh upstream for every wave of subscribers. |
| `[f, f, t]` | **Resilient Static Cache** | *The* headline production pattern, paired with `ReplaySubject(1)`: **cache success, retry failure.** Success is retained forever; an error discards the Subject so the next subscriber retries. |
| `[t, f, f]` | **Garbage-collected UI state cache** | SPA screen caching: terminal state is held while components are mounted; the last unmount evicts it, so returning to the screen refetches. |
| `[f, f, f]` | **Permanent application singleton** | One-time startup work (config, session bootstrap) where failure is fatal and retry is deliberately banned. The terminal state is locked in forever. |
| `[t, f, t]` | Completed-cache with unsubscription eviction | Like the GC cache but stricter on errors: errors reset immediately. |
| `[f, t, t]` | Reconnecting source with state continuity | Idle disconnects the upstream but keeps the Subject; a caching connector then hands late arrivals history while reconnecting. |
| `[t, t, f]` | Temporary error lock | An error is held as fatal for current subscribers, but clears once everyone leaves. |
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

Start from the default. Reach for `[f, f, t]` + `ReplaySubject(1)` when the source is a finite fetch worth caching. Reach for `[t, f, f]` when UI demand should garbage-collect the cache. Reach for `[f, f, f]` only when a retry would be *wrong*. If you find yourself wanting anything else, write down which of the three lifecycle events should discard state — the flags then write themselves.
