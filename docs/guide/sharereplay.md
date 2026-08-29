# shareReplay() — Sharing as a Cache

**Era: RxJS 5.4+, still current — in RxJS 7 it is a thin wrapper over the configurable [`share()`](/guide/share-config).**

`shareReplay(n)` shares through a `ReplaySubject(n)` — "cache the last *n* values for late subscribers" — with deliberately *different* lifecycle defaults from `share()`:

```ts
const user$ = http.get('/user').pipe(shareReplay(1));
```

## The defaults, and why they differ

- **`refCount: false`** (the default): once connected, `shareReplay` **never disconnects from the source**, even when the last subscriber leaves. For a one-shot HTTP result this is exactly right — the cache survives idle periods. For an **infinite source it is a subscription leak**: the upstream keeps producing forever.
- **No reset on complete**: late subscribers still receive the cached final values — that is the point of a cache.
- **Reset on error**: a failed execution is discarded, so the next subscriber can retry instead of replaying a stale error.
- `shareReplay({ bufferSize: 1, refCount: true })` restores disconnect-on-last-unsubscribe.

In RxJS 7, `shareReplay(bufferSize)` is literally implemented as:

```ts
share({
  connector: () => new ReplaySubject(bufferSize),
  resetOnError: true,
  resetOnComplete: false,
  resetOnRefCountZero: refCount, // false by default
});
```

`share` and `shareReplay` are two hard-coded points in a larger space of behaviors — which Subject, reset when. RxJS 7 turned that whole space into [explicit configuration](/guide/share-config).

## Sample

<<< ../../src/samples/06-sharereplay-cache.ts

```sh
node src/samples/06-sharereplay-cache.ts
```

Expected output in three acts: (1) B receives the cached `2` instantly with **no** second `SOURCE:` log — the cache works; (2) the leaky source **keeps logging** `LEAKY SOURCE producing:` after its consumer unsubscribed — the default `refCount: false` leak; (3) with `refCount: true` the producing logs stop the moment the consumer leaves.

## Rule of thumb

Use `shareReplay(1)` for finite, completing sources you want cached (HTTP). For infinite sources, either pass `{ refCount: true }` or state the reset policy explicitly with `share({ connector: () => new ReplaySubject(1), ... })` so the lifecycle is visible at the call site.
