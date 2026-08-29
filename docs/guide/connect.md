# connect() — Multicast Scoped to a Selector

**Era: RxJS 7. Replaces: `publish(selector)` / `multicast(subjectFactory, selector)`.**

`connect()` is a pipeable operator for the "fork one stream into several derived streams and recombine" pattern:

```ts
const out$ = source$.pipe(
  connect((shared$) =>
    merge(
      shared$.pipe(filter(isEven), map(label)),
      shared$.pipe(filter(isOdd), map(label))
    )
  )
);
```

## Mechanics, step by step

For each subscriber to `out$`:

1. The connector factory creates a Subject (a plain `Subject` unless you pass `{ connector }`).
2. Your selector runs with the **multicast** view of the source (`shared$`).
3. The subscriber is subscribed to the selector's result.
4. The Subject is subscribed to the source — **one** source execution, no matter how many times `shared$` appears inside the selector.

There is no `.connect()` call and no reference counting to think about: the shared execution's lifecycle is scoped to the one outer subscription. When the outer subscriber unsubscribes, everything inside tears down.

## When to reach for it

Any time you would otherwise subscribe to the same source twice inside one pipeline — splitting by predicate, computing an aggregate alongside the raw stream, pairing a stream with its own debounced copy. Without `connect`, each inner use of the source would trigger its own execution (or force you to hand-manage a Subject).

## Sample

<<< ../../src/samples/08-connect-selector.ts

```sh
node src/samples/08-connect-selector.ts
```

Expected output: `SOURCE: producer started (watch — this logs ONCE)` appears a single time, then interleaved `even N` / `odd N` lines — two consumers of `shared$`, one execution.

## connectable vs. connect

| | [`connectable()`](/guide/connectable) | `connect()` |
|---|---|---|
| API form | standalone creation function | pipeable operator |
| Where | outside `.pipe()` | inside `.pipe()` |
| Connection trigger | manual `.connect()` | automatic, scoped to the selector |
| Replaces | selector-less `multicast` / `publishX` + `.connect()` | `multicast` / `publish` **with** a selector |
