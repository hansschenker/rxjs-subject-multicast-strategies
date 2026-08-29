# The Multicasting Problem

**Era: the primitive.** Everything in this guide — every operator from `multicast` to the configurable `share()` — is an automation of the manual pattern on this page.

## Cold and unicast by default

A plain `Observable` is **cold and unicast**: the producer function runs once *per subscriber*.

```ts
const source$ = new Observable<number>((subscriber) => {
  console.log('SOURCE: producer started'); // side effect: HTTP call, socket, interval…
  let n = 0;
  const id = setInterval(() => subscriber.next(n++), 100);
  return () => clearInterval(id);
});

source$.subscribe((v) => console.log('A', v));
source$.subscribe((v) => console.log('B', v));
// "SOURCE: producer started" logs TWICE — two intervals, two independent streams.
```

If that producer is an HTTP request, two components subscribing means two identical network calls. That duplication is the entire problem multicasting solves.

## The Subject as the multicasting hub

**Multicasting** means: run the producer **once** and fan its notifications out to many subscribers. The one primitive that can do this is a `Subject`, because it is both:

- an **observer** — it has `next` / `error` / `complete`, so you can feed a source into it (its *ingress* port), and
- an **observable** — it has `subscribe`, so many listeners can register on it.

Internally a Subject keeps a private list of registered subscribers. When a value arrives, it loops over that list and forwards the value to each — one execution, many listeners.

## The three decisions every strategy answers

The manual wiring makes three decisions explicit. Every operator in this guide is a different way of automating them:

1. **Which Subject?** `Subject` (no memory), `BehaviorSubject` (current value), `ReplaySubject(n)` (last *n* values), `AsyncSubject` (final value on completion). This is the *memory policy*.
2. **When does the source start?** Manually, or automatically when the first subscriber arrives (reference counting). This is the *demand policy*.
3. **When and how does it reset?** Never, on last unsubscribe, on error, on complete — and can it restart with a *fresh* Subject afterwards? This is the *reset policy*. A Subject is single-use: once it errors or completes it is spent forever, so "fresh Subject or not" decides whether a pipeline is restartable.

## Sample

<<< ../../src/samples/01-cold-unicast-and-the-subject-bridge.ts

Run it:

```sh
node src/samples/01-cold-unicast-and-the-subject-bridge.ts
```

Expected output (abbreviated): part 1 logs `SOURCE: producer started` **twice** with A and B counting independently; part 2 logs it **once**, with C and D receiving the same values from one execution, and the master `connection.unsubscribe()` tearing it down for everyone.

## Why this needed automating

The manual pattern works, but you now own the bookkeeping: connecting at the right moment, disconnecting when nobody listens, and never reusing a spent Subject. Forgetting any of these produces the classic bugs — duplicate requests, leaked intervals, and streams that silently never emit again. The first automation was [`multicast()`](/guide/multicast).
