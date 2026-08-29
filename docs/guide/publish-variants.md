# The publish Family

**Era: RxJS 4–6. Status in RxJS 7: deprecated, fully functional. Modern replacement: [`share({ connector })`](/guide/share-config), [`connectable()`](/guide/connectable), or [`connect()`](/guide/connect) depending on usage.**

Nobody wanted to type `multicast(new ReplaySubject(1))` every time, so RxJS shipped named shorthands. **They add zero new mechanics** — each is `multicast` with a pre-chosen Subject flavor (the *memory policy*):

| Shorthand | Equivalent to | Late subscriber (while connected) receives |
|---|---|---|
| `publish()` | `multicast(new Subject())` | only future values |
| `publishBehavior(init)` | `multicast(new BehaviorSubject(init))` | current value, then future values |
| `publishReplay(n)` | `multicast(new ReplaySubject(n))` | last *n* values, then future values |
| `publishLast()` | `multicast(new AsyncSubject())` | the final value, when the source completes |
| `publish(selector)` | `multicast(() => new Subject(), selector)` | (selector mode — see [`connect()`](/guide/connect)) |

All of them (except the selector form) return a `ConnectableObservable`, finished with either `.connect()` or `.refCount()`:

```ts
// "Cache the latest value, start on first subscriber, stop on last":
const cached$ = source$.pipe(publishReplay(1), refCount());
```

## The dead-subject trap

What `publish` fixed was ergonomics. What it kept — and made worse — is the **single-instance Subject**:

```ts
const shared$ = of(1, 2, 3).pipe(publish(), refCount());

shared$.subscribe((v) => console.log('A', v)); // A 1, A 2, A 3 — then source completes
shared$.subscribe((v) => console.log('B', v)); // …nothing. Instant complete.
```

Step by step: A drives refCount to 1 → connect → the source emits and **completes** → the internal `Subject` completes and is now dead → B arrives, refCount tries to reconnect **the same dead Subject** → B gets only `complete`. Worse still, `publishReplay(n).refCount()` in this situation replays the old buffer *and* completes — stale data that looks alive.

This trap is the single biggest reason the modern APIs exist, and why they all take connector **factories**.

## Sample

<<< ../../src/samples/04-publish-family.ts

```sh
node src/samples/04-publish-family.ts
```

The first section shows the trap directly: `SOURCE: executed` logs once for the trapped pipeline (B gets nothing), while `share()` — which uses a factory — executes the source freshly for both C and D. The remaining sections tour the memory-policy flavors: `publishBehavior` seeds with a current value, `publishReplay(2)` replays the last two to the late arrival, `publishLast` delivers only the final value at completion.

## Where each flavor went in RxJS 7

The flavor is just the connector. Migration is mechanical — see the [Migration Guide](/guide/migration):

- `publish()` → `connector: () => new Subject()`
- `publishBehavior(x)` → `connector: () => new BehaviorSubject(x)`
- `publishReplay(n)` → `connector: () => new ReplaySubject(n)`
- `publishLast()` → `connector: () => new AsyncSubject()`
