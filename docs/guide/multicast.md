# multicast() and ConnectableObservable

**Era: RxJS 4–6. Status in RxJS 7: deprecated, fully functional. Modern replacements: [`connectable()`](/guide/connectable) and [`share({ ... })`](/guide/share-config).**

`multicast` packages the manual Subject wiring into an operator. It is the general mechanism every later shorthand builds on.

## multicast(subject) → ConnectableObservable

```ts
const shared$ = source$.pipe(
  multicast(new Subject<number>())
) as ConnectableObservable<number>;

shared$.subscribe(a); // nothing happens yet
shared$.subscribe(b); // still nothing
const conn = shared$.connect(); // NOW the producer starts, exactly once
conn.unsubscribe();             // tears down the source for everyone
```

Step by step:

1. `multicast(subject)` returns a **`ConnectableObservable`** — an Observable subclass with an extra `.connect()` method.
2. `.subscribe()` does **not** start the source; it only registers the subscriber on the internal Subject.
3. `.connect()` performs `source$.subscribe(subject)` — the producer starts once — and returns the master `Subscription`.
4. Unsubscribing that master switch disconnects the source from all subscribers at once.

This is **maximum manual control**: you decide the exact moment data flows (for example, wire up all listeners during bootstrap, then connect).

## refCount(): automating connect/disconnect

For the common case — "start when someone listens, stop when nobody does" — the `refCount()` operator counts subscribers on a `ConnectableObservable`: 0→1 connects, 1→0 disconnects.

```ts
const shared$ = source$.pipe(
  multicast(() => new Subject<number>()), // note: a FACTORY
  refCount()
);
```

## Instance vs. factory — the crucial difference

A Subject is single-use: once it completes or errors, it is spent forever.

- `multicast(new Subject())` — one **instance**. After the source completes, reconnecting reuses the dead Subject: new subscribers get an instant `complete` and the source never re-runs.
- `multicast(() => new Subject())` — a **factory**. Each fresh connection creates a new Subject, so the pipeline is fully restartable after completion, error, or refCount reaching zero.

This one distinction is the root of most historical multicasting bugs, and it is why every modern RxJS 7 API takes a connector *factory*.

## Samples

Manual connect — the master switch:

<<< ../../src/samples/02-multicast-manual-connect.ts

Automated with `refCount()` and a factory:

<<< ../../src/samples/03-multicast-refcount.ts

```sh
node src/samples/02-multicast-manual-connect.ts
node src/samples/03-multicast-refcount.ts
```

In the second sample, the "second wave" subscriber C triggers a **new** `SOURCE: producer started` log — the factory made the pipeline restartable. Swap the factory for `multicast(new Subject())` and C receives nothing.

## Why it was deprecated

- The `ConnectableObservable` **type gets lost** the moment you `.pipe()` anything after it, so `.connect()` required casts and `refCount()`'s typing could not be guaranteed.
- The instance/factory footgun lived one keystroke away.
- In RxJS 7 the same two usages split cleanly into [`connectable()`](/guide/connectable) (manual connect) and [`share({ ... })`](/guide/share-config) (refCount-style), with the selector overload becoming [`connect()`](/guide/connect).
