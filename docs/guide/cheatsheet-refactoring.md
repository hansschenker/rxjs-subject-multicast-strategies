# RxJS 7 Multicasting Refactoring Cheat Sheet

::: info Provenance
This sheet was described in the research notes as generated in NotebookLM's Studio panel but was never exported. It is reconstructed here from the notes corpus and the official RxJS multicasting deprecation guidance, and corrected against this repo's executable specs (`npm test`). For the narrative version with the reasoning, see the [Migration Guide](/guide/migration).
:::

## The rule: three shapes, one lookup

Every legacy usage is one of three shapes. Find your shape, then pick the connector below.

| Your legacy shape | Replace with |
|---|---|
| `X()` cast to `ConnectableObservable`, manual `.connect()` | `connectable(source$, { connector, resetOnDisconnect: false })` |
| `X()` chained with `.refCount()` | `share({ connector, resetOnError: false, resetOnComplete: false, resetOnRefCountZero: false })` |
| `X(selector)` | `connect(selector, { connector })` |

## Connector lookup (the memory policy)

| Legacy operator | `connector` |
|---|---|
| `publish()` / `multicast(new Subject())` | `() => new Subject()` |
| `publishBehavior(x)` | `() => new BehaviorSubject(x)` |
| `publishReplay(n)` | `() => new ReplaySubject(n)` |
| `publishLast()` | `() => new AsyncSubject()` |
| `multicast(factory)` | the same factory |

## Deprecated and surviving APIs

- **Deprecated in RxJS 7** (fully functional, no longer recommended): `ConnectableObservable`, `multicast`, `publish`, `publishBehavior`, `publishLast`, `publishReplay`, `refCount`.
- **The modern surface**: `connectable` (manual connect), `connect` (selector scope), `share` (demand-driven, fully configurable), `shareReplay` (now a thin preset over `share`).

## Before / after, per operator

::: details multicast — all four scenarios

```ts
// 1) Factory → ConnectableObservable → connectable()
const tick$ = timer(1_000).pipe(multicast(() => new Subject())) as ConnectableObservable<number>;
// becomes
const tick$ = connectable(timer(1_000), { connector: () => new Subject() });

// 2) Subject INSTANCE → connectable() with resetOnDisconnect: false
const tick$ = timer(1_000).pipe(multicast(new Subject())) as ConnectableObservable<number>;
// becomes
const tick$ = connectable(timer(1_000), {
  connector: () => new Subject(),
  resetOnDisconnect: false, // legacy never installed a fresh Subject after disconnect
});

// 3) multicast + refCount → share()
const tick$ = timer(1_000).pipe(multicast(() => new Subject()), refCount());
// becomes
const tick$ = timer(1_000).pipe(share({ connector: () => new Subject() }));

// 4) Selector → connect()
const tick$ = timer(1_000).pipe(
  multicast(() => new Subject(), (source) => combineLatest([source, source]))
);
// becomes
const tick$ = timer(1_000).pipe(
  connect((source) => combineLatest([source, source]), { connector: () => new Subject() })
);
```

:::

::: details publish

```ts
// Manual connect
const tick$ = timer(1_000).pipe(publish()) as ConnectableObservable<number>;
tick$.connect();
// becomes
const tick$ = connectable(timer(1_000), {
  connector: () => new Subject<number>(),
  resetOnDisconnect: false,
});
tick$.connect();

// With refCount — FAITHFUL port needs all three resets false
const tick$ = timer(1_000).pipe(publish(), refCount());
// becomes
const tick$ = timer(1_000).pipe(
  share({ resetOnError: false, resetOnComplete: false, resetOnRefCountZero: false })
);

// With a selector
const tick$ = timer(1_000).pipe(publish((source) => combineLatest([source, source])));
// becomes
const tick$ = timer(1_000).pipe(connect((source) => combineLatest([source, source])));
```

:::

::: details publishBehavior

```ts
// Manual connect
const tick$ = timer(1_000).pipe(publishBehavior(0)) as ConnectableObservable<number>;
// becomes
const tick$ = connectable(timer(1_000), {
  connector: () => new BehaviorSubject(0),
  resetOnDisconnect: false,
});

// With refCount
const tick$ = timer(1_000).pipe(publishBehavior(0), refCount());
// becomes
const tick$ = timer(1_000).pipe(
  share({
    connector: () => new BehaviorSubject(0),
    resetOnError: false,
    resetOnComplete: false,
    resetOnRefCountZero: false,
  })
);
```

:::

::: details publishReplay

```ts
// Manual connect
const tick$ = timer(1_000).pipe(publishReplay(1)) as ConnectableObservable<number>;
tick$.connect();
// becomes
const tick$ = connectable(timer(1_000), {
  connector: () => new ReplaySubject<number>(1),
  resetOnDisconnect: false,
});
tick$.connect();

// With refCount
const tick$ = timer(1_000).pipe(publishReplay(1), refCount());
// becomes
const tick$ = timer(1_000).pipe(
  share({
    connector: () => new ReplaySubject(1),
    resetOnError: false,
    resetOnComplete: false,
    resetOnRefCountZero: false,
  })
);

// With a selector
const tick$ = timer(1_000).pipe(
  publishReplay(1, undefined, (source) => combineLatest([source, source]))
);
// becomes
const tick$ = timer(1_000).pipe(
  connect((source) => combineLatest([source, source]), {
    connector: () => new ReplaySubject(1),
  })
);
```

:::

::: details publishLast

```ts
// Manual connect
const tick$ = timer(1_000).pipe(publishLast()) as ConnectableObservable<number>;
tick$.connect();
// becomes
const tick$ = connectable(timer(1_000), {
  connector: () => new AsyncSubject<number>(),
  resetOnDisconnect: false,
});
tick$.connect();

// With refCount
const tick$ = timer(1_000).pipe(publishLast(), refCount());
// becomes
const tick$ = timer(1_000).pipe(
  share({
    connector: () => new AsyncSubject(),
    resetOnError: false,
    resetOnComplete: false,
    resetOnRefCountZero: false,
  })
);

// With a selector
const tick$ = timer(1_000).pipe(publishLast((source) => combineLatest([source, source])));
// becomes
const tick$ = timer(1_000).pipe(
  connect((source) => combineLatest([source, source]), {
    connector: () => new AsyncSubject(),
  })
);
```

:::

## The gotchas

::: warning The all-false rule
A **faithful** port of any `publishX().refCount()` requires `resetOnError: false, resetOnComplete: false, resetOnRefCountZero: false` — the legacy chain owned one Subject for life and never reset it. Plain `share()` (all resets `true`) is usually *better* behavior, but it is **not the same** behavior. Choose deliberately: faithful port or upgrade.
:::

1. **Manual-connect ports need `resetOnDisconnect: false`** — legacy `ConnectableObservable` did not install a fresh Subject after a disconnect; `connectable`'s default (`true`) does.
2. **One residual divergence even in the all-false port** (spec-proven): legacy `refCount()` *disconnected the upstream* at zero subscribers; `share` with `resetOnRefCountZero: false` keeps the upstream connected while idle. Unobservable for quickly-completing sources; real for long-lived ones. No flag combination reproduces "pause upstream at zero but keep the Subject".
3. **`shareReplay(n)` is already modern** — it is `share({ connector: () => new ReplaySubject(n), resetOnError: true, resetOnComplete: false, resetOnRefCountZero: refCount })`. Mind the default `refCount: false` leak on infinite sources.

Verify any port against the [Reset Flags Playground](/guide/playground) or the spec suite (`npm test`).
