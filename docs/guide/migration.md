# Migration Guide — Legacy to Modern, Inside RxJS 7

Looking for the compact lookup version? See the [Refactoring Cheat Sheet](/guide/cheatsheet-refactoring).

**Scope: this is an intra-v7 modernization.** The legacy operators — `multicast`, `publish`, `publishBehavior`, `publishReplay`, `publishLast`, `refCount`, and `ConnectableObservable` — are deprecated in RxJS 7 but remain fully functional. The reason to migrate is that the modern APIs are semantically better: factory connectors eliminate the dead-subject trap, there is no `ConnectableObservable` cast to lose in a pipe, and reset behavior is explicit at the call site.

## The three-scenario rule

Every legacy usage falls into one of three shapes, and each shape has exactly one modern home:

| Legacy shape | Modern replacement |
|---|---|
| `X()` cast to `ConnectableObservable`, manual `.connect()` | `connectable(source, { connector, resetOnDisconnect: false })` |
| `X()` chained with `.refCount()` | `share({ connector, resetOnError: false, resetOnComplete: false, resetOnRefCountZero: false })` |
| `X(selector)` | `connect(selector, { connector })` |

The **connector supplies the memory policy** — it is the only thing that differs between the operators being replaced:

| Legacy operator | Connector |
|---|---|
| `publish` / `multicast(new Subject())` | `() => new Subject()` |
| `publishBehavior(x)` | `() => new BehaviorSubject(x)` |
| `publishReplay(n)` | `() => new ReplaySubject(n)` |
| `publishLast()` | `() => new AsyncSubject()` |
| `multicast(factory)` | the same factory |

## The load-bearing gotcha: all three resets false

A **faithful** port of any `publishX().refCount()` requires `resetOnError: false, resetOnComplete: false, resetOnRefCountZero: false`.

Why: the legacy chain owned exactly **one** Subject instance for its whole life. It never swapped it out — not on error, not on completion, not when the subscriber count hit zero. Any `true` flag therefore introduces behavior the legacy code never had.

One subtle divergence remains even in the all-`false` port, pinned by this repo's specs: legacy `refCount()` *disconnected the upstream* when the count hit zero, while `share` with `resetOnRefCountZero: false` keeps the upstream connected during idle. For sources that complete quickly — the typical cached HTTP call — this is unobservable; for long-lived sources, the modern port keeps consuming while idle where the legacy chain paused. If that matters, there is no flag combination that reproduces "pause upstream at zero but keep the Subject" — reconsider whether you actually want a reset notifier or the defaults.

The corollary: plain `share()` — all resets `true` — is usually **better** behavior than the code you are migrating, but it is not the **same** behavior. Decide explicitly whether you want a faithful port (all `false`) or an upgrade (defaults), and say so in the code review.

## Worked example: publishReplay(1).refCount()

```ts
// Legacy (deprecated, still works in RxJS 7):
const cached$ = source$.pipe(publishReplay(1), refCount());

// Faithful modern port — identical terminal behavior (see idle caveat above):
const cached$ = source$.pipe(
  share({
    connector: () => new ReplaySubject(1),
    resetOnError: false,
    resetOnComplete: false,
    resetOnRefCountZero: false,
  })
);
```

Both retain the spent `ReplaySubject` after completion: late subscribers get the replayed last value plus `complete`, and the source is never re-executed — dead-subject behavior included, faithfully.

## Sample — the proof

<<< ../../src/samples/10-migration-faithful-port.ts

```sh
node src/samples/10-migration-faithful-port.ts
```

Actual output:

```
LEGACY: source executed
FAITHFUL: source executed
legacy   early: 0
faithful early: 0
legacy   early: 1
faithful early: 1
legacy   early: 2
faithful early: 2
legacy   late : 2
faithful late : 2
```

One execution each; the late subscribers on both pipelines receive only the replayed `2` — no re-execution, identical semantics.

## Manual-connect migrations: resetOnDisconnect

For the `.connect()` scenario, pass `resetOnDisconnect: false` to `connectable` to match legacy behavior — the legacy `ConnectableObservable` did not install a fresh Subject after a disconnect. Omit it (default `true`) only when you *want* the modern restartable behavior, as shown on the [`connectable()`](/guide/connectable) page.

## Migration checklist

1. Identify the shape: manual connect, `.refCount()` chain, or selector.
2. Pick the connector from the operator's Subject flavor.
3. Faithful port? All resets `false` (and `resetOnDisconnect: false` for manual connect). Upgrade? Take the defaults — and re-test retry/repeat paths, late-subscriber paths, and completion paths, because those are exactly the behaviors that change.
