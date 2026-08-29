---
layout: home
hero:
  name: RxJS Multicast Strategies
  text: From multicast to configurable share()
  tagline: Every multicasting strategy from RxJS 4 to RxJS 7 — mechanics, runnable samples, and the migration map. Scope is RxJS 7 only.
  actions:
    - theme: brand
      text: Start with the Fundamentals
      link: /guide/fundamentals
    - theme: alt
      text: Migration Guide
      link: /guide/migration
features:
  - title: One machine, many policies
    details: Every strategy is the same underlying machine — a Subject between one source execution and many subscribers. What changes is which Subject, when it connects, and when it resets.
  - title: A runnable sample per strategy
    details: Each page embeds a self-contained TypeScript sample from src/samples/ that you can run directly with Node 24 — no build step.
  - title: Faithful migration, spelled out
    details: The legacy-to-modern mapping including the load-bearing gotcha — reproducing publishX().refCount() requires all three reset flags set to false.
---

## The lineage at a glance

Every generation of the multicasting API automates the same three decisions: **which Subject** (memory), **when to connect** (demand), and **when to reset** (lifecycle). This table is the backbone of the guide — each row links to a page with mechanics and a runnable sample. The model behind the three decisions has its own page: [the Subject Router Algebra](/guide/router-algebra).

| # | Era | Strategy | What it automated / replaced | Lifecycle control |
|---|-----|----------|------------------------------|-------------------|
| 0 | primitive | [manual `Subject` bridge](/guide/fundamentals) | nothing — the raw pattern | fully manual |
| 1 | RxJS 4–6 | [`multicast()` → `ConnectableObservable`](/guide/multicast) | wraps the Subject wiring | `.connect()` manual, or `.refCount()` |
| 2 | RxJS 4–6 | [`publish` / `publishBehavior` / `publishReplay` / `publishLast`](/guide/publish-variants) | the boilerplate of `multicast(<flavor>)` | same — plus the instance-subject trap |
| 3 | RxJS 5–6 | [`share()`](/guide/share-classic) | `multicast(() => new Subject()).refCount()`, with factory-based restart | automatic; resets on complete / error / zero |
| 4 | RxJS 5.4+ | [`shareReplay(n)`](/guide/sharereplay) | replay-flavored share, tuned for caching | stays connected by default (leak risk) |
| 5 | RxJS 7 | [`connectable()`](/guide/connectable) | `multicast(subject)` + `.connect()` | manual, factory-based, resettable |
| 6 | RxJS 7 | [`connect(selector)`](/guide/connect) | `publish(selector)` / `multicast(factory, selector)` | scoped to the outer subscriber |
| 7 | RxJS 7 | [`share({ ... })`](/guide/share-config) | every `publishX().refCount()` combo, `refCount` itself, and `shareReplay` internals | four explicit knobs, notifier-capable |

::: info Scope: RxJS 7 only
This documentation targets `rxjs@7.x`. The legacy operators are **deprecated in RxJS 7 but fully functional** — the reason to prefer the modern APIs is that they are semantically better (factory connectors, no `ConnectableObservable` cast, explicit reset control), not version pressure. See the [Migration Guide](/guide/migration).
:::

## Running the samples

Each strategy page embeds its sample from [`src/samples/`](https://github.com/hansschenker/rxjs-subject-multicast-strategies/tree/main/src/samples). The project's tsconfig uses only erasable TypeScript syntax, so Node 24 runs them directly:

```sh
node src/samples/05-share-classic.ts
```

All samples are type-checked by `npm run build`.
