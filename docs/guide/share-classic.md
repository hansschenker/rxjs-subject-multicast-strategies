# share() — the Classic Workhorse

**Era: RxJS 5–6, still current in RxJS 7 (where it also gained [configuration](/guide/share-config)).**

`share()` is the fusion of the two most common decisions — a **factory** Subject plus `refCount()`:

```ts
// share() ≈ multicast(() => new Subject()).refCount()
const shared$ = source$.pipe(share());
```

## The lifecycle, step by step

1. First subscriber → create a fresh `Subject`, connect to the source.
2. More subscribers join the live stream (no new executions).
3. Last subscriber leaves → disconnect, tear down the source.
4. Source completes or errors → connection closed, the spent Subject is discarded.
5. **A new subscriber after any of that → brand-new Subject, the source re-executes from scratch.**

Because it always uses a factory, `share()` fixed the [dead-subject trap](/guide/publish-variants#the-dead-subject-trap). That restart-on-resubscribe behavior is also what makes `share()` compose correctly with `retry()` and `repeat()` — a completed Subject can never emit again, so discarding it and spawning a fresh one is the only safe reset.

Ben Lesh's standing advice: when you just want to multicast, use `share` — it has the fewest footguns.

## Sample

<<< ../../src/samples/05-share-classic.ts

```sh
node src/samples/05-share-classic.ts
```

Expected output: one `SOURCE: new execution` for the A+B wave, teardown when both leave mid-flight, then a **second** `SOURCE: new execution` when C arrives — the restart that `publish().refCount()` could never do.

## What share() does not do

`share()` has no memory: a late subscriber joining a live stream receives only future values, and a subscriber arriving after completion triggers a full re-execution rather than receiving a cached result. When you want "compute once, replay to everyone later", you want [`shareReplay()`](/guide/sharereplay) — or in RxJS 7, [`share({ connector: () => new ReplaySubject(1), ... })`](/guide/share-config) with explicit reset flags.
