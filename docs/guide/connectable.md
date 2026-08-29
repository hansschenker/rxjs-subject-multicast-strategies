# connectable() — Manual Connect, Modernized

**Era: RxJS 7. Replaces: `multicast(subject)` / `publishX()` followed by a manual `.connect()`.**

`connectable()` is a **creation function**, not an operator:

```ts
const tick$ = connectable(source$, {
  connector: () => new Subject<number>(), // always a factory
  resetOnDisconnect: true,                // default: fresh Subject after disconnect
});

tick$.subscribe(a);
tick$.subscribe(b);
const conn = tick$.connect(); // deliberate start, exactly as before
```

## What changed versus multicast + connect

- **No subclass, no cast.** `multicast` returned a `ConnectableObservable` whose type was lost the moment you piped anything after it. `connectable` wraps the source *outside* the pipe and returns a `Connectable` — an Observable with a `.connect()` method that survives.
- **Factory-only connector.** You cannot hand it a raw Subject instance, so the dead-subject trap is unrepresentable.
- **`resetOnDisconnect`.** With the default `true`, disconnecting installs a fresh Subject, so wire-up → connect → disconnect → reconnect works cleanly. Set it to `false` to reproduce the legacy single-instance behavior — see the [Migration Guide](/guide/migration).

The semantics are otherwise identical to the [multicast era](/guide/multicast): subscribers register silently, `.connect()` starts the single shared execution, and the returned `Subscription` is the master switch.

## When to reach for it

Whenever *you* — not subscriber demand — should decide the exact moment data starts flowing: wiring several consumers during application bootstrap before opening a socket, coordinating a test harness, or gating an expensive source behind an explicit go-signal. If "first subscriber starts it" is what you want, use [`share()`](/guide/share-config) instead.

## Sample

<<< ../../src/samples/07-connectable.ts

```sh
node src/samples/07-connectable.ts
```

Expected output: nothing flows until `connect()`; the master switch cuts A and B off mid-stream; and the reconnect section logs a fresh `SOURCE: producer started` — `resetOnDisconnect: true` installed a new Subject.
