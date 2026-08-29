# Subject Router Algebra Reference Sheet

::: info Provenance
This sheet was described in the research notes as generated in NotebookLM's Studio panel but was never exported; the notes list its contents as the paradigm shift, the 10 policy axes, the algebraic Subject mappings, the 8 `share()` configurations grouped by utility, and the Custom Routing Blueprints. It is reconstructed here from the notes corpus and corrected against this repo's executable specs. The teaching version is [The Subject Router Algebra](/guide/router-algebra).
:::

## The paradigm in one sentence

A **Subject is a network router** — ingress port, routing table, memory buffer, lifecycle — and every multicasting API (`multicast`, `publish*`, `share`, `connectable`, `connect`) is an **administrative policy** wrapped around that same router.

## The 10 policy axes

Axes 1–3 are the Subject's fixed contract; 4–10 are the design space you configure.

| # | Axis | Question | Configured by |
|---|---|---|---|
| 1 | **Ingress** | What may enter the hub? | Fixed: the full `next` / `error` / `complete` protocol; reception only, never delivery |
| 2 | **Routing** | Where are signals dispatched? | Fixed: broadcast to every entry in the routing table |
| 3 | **Terminal-Signal** | What happens on `complete` / `error`? | Fixed: forwarded to all routes; the hub enters a permanent terminal state |
| 4 | **Memory** | What is cached? | Connector flavor: `Subject` / `BehaviorSubject` / `ReplaySubject(n)` / `AsyncSubject` |
| 5 | **Late-Subscriber** | What does an arrival receive about the past? | Derived: Memory × terminal state (table below) |
| 6 | **Demand** | Who counts the listeners? | `share()`'s internal refCount; hitting zero *triggers* the Reset axis (idle regime) |
| 7 | **Reset** | When is the router discarded and replaced? | `share()`'s `[resetOnRefCountZero, resetOnComplete, resetOnError]`; `connectable()`'s `resetOnDisconnect` |
| 8 | **Connection timing** | When does the upstream run? | API choice: `connectable()` manual · `connect()` selector-scoped · `share()` demand-driven |
| 9 | **Reset temporality** | Discard *when*, exactly? | Boolean (now / never) vs. notifier factory (when it fires — grace periods) |
| 10 | **Connector provenance** | One Subject for life, or a fresh one per connection? | Instance (the legacy dead-subject trap) vs. factory (all modern APIs) |

## Algebraic mappings: Subject flavor → Memory × Late-Subscriber

| Connector | Memory | Late arrival, live | Late arrival, retained terminal |
|---|---|---|---|
| `Subject` | none | future values only | terminal signal only |
| `BehaviorSubject(x)` | current value | current, then future | terminal signal only |
| `ReplaySubject(n)` | last *n* values | last *n*, then future | last *n*, then terminal |
| `AsyncSubject` | final value | nothing until completion | final value + `complete` (after error: error only) |

## The 8 share() profiles, grouped by real-world utility

Flags in order `[resetOnRefCountZero, resetOnComplete, resetOnError]`. All descriptions are spec-verified.

**Production workhorses**

- `[t, t, t]` **Clean-slate broadcast** (default) — fresh Subject and fresh upstream for every wave of subscribers. Transient realtime data.
- `[f, f, t]` **Resilient static cache** — pair with `ReplaySubject(1)`: cache success forever, retry failure. The headline HTTP-cache pattern (and what `shareReplay(1)` presets).

**Terminal caches**

- `[t, f, f]` **Terminal-state cache** — complete *or* error is cached permanently; abandoning mid-stream resets.
- `[t, f, t]` **Completed-state cache, error resets** — success cached permanently, failure retried, mid-stream abandonment resets.

**Idle-persistent**

- `[f, t, t]` **Live idle cache** — idle keeps the Subject *and the upstream connection*; any terminal event resets.
- `[f, f, f]` **Permanent application singleton** — nothing ever resets; failure is fatal by design.

**Locks and the outlier**

- `[t, t, f]` **Error lock** — an error is locked permanently; only a successful completion (or mid-stream abandonment) resets.
- `[f, t, f]` **The theoretical outlier** — resets on success, locks on failure: the inverse of resilience. No practical use.

::: tip The partition law (spec-proven)
The three flags partition the router's lifecycle into disjoint regimes — idle (`z`), completed (`c`), errored (`e`) — each flag owning exactly one. Two corollaries the original notes got wrong: `resetOnRefCountZero: false` keeps the upstream **connected** while idle (not merely the Subject retained), and after a terminal event `resetOnRefCountZero` is **inert** — subscribers leaving can never evict a retained terminal Subject.
:::

## Custom Routing Blueprints

The structural rule for selective delivery: **separate the multicast transport from the routing logic.**

- The **transport** is one shared pipeline (`share`, `connectable`, or `connect`). It owns the lifecycle policy — connector, reset flags — and nothing else.
- **Routes** are derived observables: key or predicate `filter`s layered *on top of* the transport. They carry no lifecycle policy of their own and inherit the transport's late-subscriber semantics uniformly.
- Never bake a route into the transport (one Subject per key subscribing the source separately multiplies upstream executions), and never give two routes different reset policies over the same source — split the transport instead.

<<< ../../src/samples/11-custom-routing-blueprint.ts

```sh
node src/samples/11-custom-routing-blueprint.ts
```

Three routes subscribe — key routes for `temp` and `humidity`, a predicate route for alerts — and `TRANSPORT: upstream started` logs exactly once. Routing never multiplies executions; that is the whole blueprint.

For scoped, self-managing variants of the same idea, build the routes inside a [`connect()`](/guide/connect) selector — the transport then lives and dies with the outer subscription.
