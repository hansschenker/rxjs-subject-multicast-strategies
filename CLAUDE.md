# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A research/prototype project on RxJS Subject multicasting strategies. `docs/` is a wired-up VitePress site (config in `docs/.vitepress/config.mts`) documenting every strategy with a guide page per era plus a migration guide; the raw research notes (NotebookLM exports, transcript) sit in the same folder but are excluded from the site via `srcExclude`. `src/samples/` holds one runnable, type-checked TypeScript sample per multicast strategy (run directly with `node src/samples/<file>.ts` — Node 24 executes erasable-syntax TS natively); `src/main.ts` is still the untouched Vite starter. `vitest` is installed but not yet wired up (no test files, no config, no `test` script). Repository: https://github.com/hansschenker/rxjs-subject-multicast-strategies (commit directly to `main`). **Scope: RxJS 7 only** (`rxjs@^7.8.2`) — RxJS 8 may never be published and is out of scope; treat the deprecated-to-modern operator mapping as an intra-v7 modernization, never as a v8 migration.

## Commands

- `npm run dev` — Vite dev server
- `npm run build` — `tsc` type-check (noEmit) then `vite build`; any TS error fails the build
- `npm run preview` — serve the production build
- `npm run docs:dev` / `npm run docs:build` / `npm run docs:preview` — VitePress docs site; pushes to `main` auto-deploy it to GitHub Pages via `.github/workflows/deploy-docs.yml` (config sets `base: /rxjs-subject-multicast-strategies/`) (guide pages embed the `src/samples/` files via `<<<` snippet imports, so renaming a sample breaks the docs build)
- There is no `test` script yet. Vitest is installed; when adding the first tests, also add `"test": "vitest"` to package.json. Single file: `npx vitest run path/to/file.test.ts`.

## TypeScript constraints

`tsconfig.json` (covers `src/` only) sets `erasableSyntaxOnly` and `verbatimModuleSyntax`: no enums, no namespaces, no constructor parameter properties, and type-only imports must use `import type`. `allowImportingTsExtensions` is on and relative imports keep the `.ts` extension (see `src/main.ts`: `import { setupCounter } from './counter.ts'`).

## The conceptual model in docs/ (the actual content)

The notes develop a mental model called the **Subject Router Algebra**: a Subject is a network router (input port, routing table of listeners, memory buffer, lifecycle), and every multicast operator is an administrative policy layered on top. Named policy axes: Ingress (what may enter — the full next/error/complete protocol), Routing (dispatch to registered listeners), Memory (what is cached — this is what distinguishes `Subject` / `BehaviorSubject` / `ReplaySubject` / `AsyncSubject`), Late-Subscriber, Terminal-Signal, Demand (refCount), and Reset.

Two load-bearing results recur throughout the notes:

1. **The 8 reset profiles** — the permutations of `share()`'s `[resetOnRefCountZero, resetOnComplete, resetOnError]` flags, graded by production utility: `[t,t,t]` default clean-slate broadcast (transient realtime data); `[f,f,t]` **Resilient Static Cache** — "cache success, retry failure", paired with `ReplaySubject(1)` (the headline production pattern); `[t,f,f]` garbage-collected UI state cache; `[f,f,f]` permanent application singleton; `[f,t,f]` the useless theoretical outlier (resets on success, permanently locks on failure).
2. **The RxJS 7 deprecation mapping** — for each legacy operator (`multicast`, `publish`, `publishBehavior`, `publishReplay`, `publishLast`, `refCount`, `ConnectableObservable`) there are three refactoring scenarios: manual-connect usage → `connectable(source, { connector, resetOnDisconnect: false })`; `.refCount()` chains → `share({ connector, resetOnError: false, resetOnComplete: false, resetOnRefCountZero: false })`; selector usage → `connect(selector, { connector })`. The connector supplies the Memory Policy (`publish` → `Subject`, `publishBehavior(x)` → `BehaviorSubject(x)`, `publishReplay(n)` → `ReplaySubject(n)`, `publishLast` → `AsyncSubject`). **The all-`false` reset triple is required for faithful legacy behavior** — legacy operators never auto-reset their subject; this caveat is repeated in every refactor note and is easy to get wrong.

## docs/ file conventions and known gaps

- `notebooklm-chat-thoughts-expand-more…-2026-08-29.md` files are NotebookLM chat exports (YAML frontmatter, `## 引用来源` citation footer). Filenames are slugs of the answer's opening sentence, so they read as fragments.
- `All_notes_8_29_2026.md` is fundamentals only (Subject dual identity, cold→hot multicasting), not a compilation of the corpus, and contains one section pasted twice.
- Most exports cite "All notes 8/28/2026" as their primary source — **that file is not in the repo**. Two artifacts described as created — the "RxJS 7 Multicasting Refactoring Cheat Sheet" and the "Subject Router Algebra Reference Sheet" — exist only in NotebookLM's Studio panel and were never exported here.
