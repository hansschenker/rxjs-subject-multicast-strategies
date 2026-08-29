# The Subject Router Algebra

The strategy pages describe what each operator *does*. This page gives the model that makes them all one thing: a **Subject is a network router**, and every multicasting API is an **administrative policy** wrapped around it. The model is distilled from the research notes behind this site and — where marked — amended by the repo's executable specs.

## The paradigm shift

"A Subject is both an observer and an observable" is true but underpowered. Model it instead as a router with four parts:

- an **ingress port** (the observer side) that accepts the complete Observable protocol — `next`, `error`, `complete` — and does nothing else: strictly reception, never delivery;
- a **routing table** (the observable side): the private list of registered subscribers; every arriving signal is looped over the table and forwarded to each entry;
- a **memory buffer**: whatever the router caches to hand to late arrivals;
- a **lifecycle**: live → terminal (permanent, the moment any terminal signal arrives) → possibly *reset*, meaning the spent router is discarded and a fresh one takes its place.

Under this model, `multicast`, the `publish` family, `share`, `connectable`, and `connect` stop being separate features. They are the *same router* with different administrative policies bolted on.

## The policy axes

| Axis | Question it answers | Where it lives in RxJS 7 |
|---|---|---|
| **Ingress** | What may enter the hub? | Fixed by the Subject contract: the full `next` / `error` / `complete` protocol |
| **Routing** | Where are signals dispatched? | Fixed: broadcast to every registered subscriber |
| **Terminal-Signal** | What happens on `complete` / `error`? | Fixed: forwarded to all routes; the hub enters a permanent terminal state |
| **Memory** | What is cached? | Your `connector` choice — see the flavor table below |
| **Late-Subscriber** | What does an arrival receive about the past? | Derived: Memory × terminal state |
| **Demand / Connection** | When does the upstream execution run? | Your API choice: [`connectable()`](/guide/connectable) (manual), [`connect()`](/guide/connect) (selector-scoped), [`share()`](/guide/share-config) (demand-driven) |
| **Reset** | When is the router discarded and replaced? | `share()`'s three reset flags or notifiers; `connectable()`'s `resetOnDisconnect` |

The first three axes are invariants — the Subject's contract itself. The last four are the design space, and `ShareConfig` is almost exactly its configurable surface:

```ts
interface ShareConfig<T> {
  connector?: () => SubjectLike<T>;                            // Memory policy (⇒ Late-Subscriber)
  resetOnError?: boolean | ((error: any) => ObservableInput<any>); // Reset — errored regime
  resetOnComplete?: boolean | (() => ObservableInput<any>);        // Reset — completed regime
  resetOnRefCountZero?: boolean | (() => ObservableInput<any>);    // Reset + Demand — idle regime
}
```

What `ShareConfig` does *not* contain is the Demand axis itself: `share` hard-codes demand-driven connection. Choosing a different point on that axis means choosing a different API — `connectable()` for manual control, `connect()` for a selector-scoped lifetime. And the notifier forms extend Reset from a boolean into a *temporal* policy: discard now, keep forever, or discard when a notifier fires (the grace-period pattern).

## Memory policy: the four router flavors

| Connector | Memory | Late subscriber, stream live | Late subscriber, terminal state retained |
|---|---|---|---|
| `Subject` | none | future values only | the terminal signal only |
| `BehaviorSubject(x)` | the current value | current value, then future | the terminal signal only |
| `ReplaySubject(n)` | the last *n* values | last *n*, then future | last *n*, then the terminal signal |
| `AsyncSubject` | the final value | nothing until completion | final value + `complete` (after an error: the error only) |

## Composing a strategy

Every strategy in this guide is one point in the space **Memory × Connection × Reset**:

- `share()` — `Subject` × demand-driven × `[t, t, t]`
- `shareReplay(1)` — `ReplaySubject(1)` × demand-driven × `[f, f, t]` — the [resilient static cache](/guide/share-config#the-8-reset-profiles) as a preset (with the idle-`f` leak that entails)
- `connectable(src, { connector })` — any flavor × manual × `resetOnDisconnect`
- `connect(selector, { connector })` — any flavor × selector-scoped × lifetime of the outer subscription
- legacy `publishX().refCount()` — flavor × demand-driven × no resets ever, with a single non-replaceable subject: the [dead-subject trap](/guide/publish-variants#the-dead-subject-trap) is the algebra's degenerate point

The [8 reset profiles](/guide/share-config#the-8-reset-profiles) are the Reset plane of this space, one row per corner of the `[z, c, e]` cube.

## Two amendments the specs proved

The research notes treat the axes as fully independent. The executable specs in `src/tests/share-reset-profiles.test.ts` proved two corrections:

1. **Demand and Reset are fused in the idle regime.** `resetOnRefCountZero: false` does not merely retain the Subject — it keeps the *upstream connection* running while nobody is subscribed (the `shareReplay` leak). There is no point in the space meaning "pause the upstream at zero but keep the Subject"; the legacy `refCount()` behaved that way, and the modern algebra cannot express it.
2. **Terminal state gates the idle flag.** Once the source completes or errors, `resetOnRefCountZero` becomes inert: subscribers leaving can never evict a retained terminal Subject. Retention after a terminal event is decided solely by the matching terminal flag.

Which yields the cleanest statement of the whole algebra:

::: tip The partition law
The three reset flags do not overlap — they partition the router's lifecycle into three disjoint regimes: **idle** (`resetOnRefCountZero`), **completed** (`resetOnComplete`), **errored** (`resetOnError`). Each flag owns exactly one regime, and a `false` in that regime means the router — buffer, state, and (in the idle regime) the live upstream connection — survives it.
:::

## The proof

The invariants are executable — this is the exact code that pinned the two amendments:

<<< ../../src/tests/share-reset-profiles.test.ts#invariants

The same machinery is interactive in the [Reset Flags Playground](/guide/playground) — toggle the flags and drive a live pipeline. Run the full suite — all 8 profiles across all three regimes:

```sh
npm test
```
