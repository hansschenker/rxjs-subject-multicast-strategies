---
exported: 2026-08-29T10:04:47.146Z
source: NotebookLM
type: chat
title: "Thoughts expand_moreIn the RxJS share() operator, ..."
---

# Thoughts expand_moreIn the RxJS share() operator, ...

导出时间: 8/29/2026, 12:04:47 PM

---

Thoughts

In the RxJS `share()` operator, the **Reset Policy** (which manages the physical lifespan of the underlying Subject router) is controlled by three boolean configuration options\[1\]:

1.  `resetOnRefCountZero`: Resets the router when all downstream subscribers unsubscribe (refCount hits 0)\[1\]\[2\].
2.  `resetOnComplete`: Resets the router when the upstream source successfully completes\[1\]\[2\].
3.  `resetOnError`: Resets the router when the upstream source terminates with an error\[1\]\[2\].

By toggling these three options between `true` and `false`, you create **8 possible configuration profiles**\[1\]\[2\]. Under the Subject Router Algebra, these configurations dictate whether the active Subject is discarded (reset) or kept (retained) under different lifecycle conditions\[2\].

* * *

### The 8 `share()` Configuration Profiles

1\. `[true, true, true]` — The Highly Self-Cleaning Router (Default)

-   **Configuration**: `resetOnRefCountZero: true`, `resetOnComplete: true`, `resetOnError: true`\[1\]\[2\].
-   **Effect**: This is the default behavior of `share()`\[1\]. The Subject router is aggressively cleared and discarded whenever it completes, errors, or loses all subscribers\[1\]\[2\]. Any subsequent observer will always trigger a **completely fresh Subject** and a brand-new upstream execution\[1\]\[3\].

2\. `[false, true, true]` — Upstream Retrying with Shared State Cache

-   **Configuration**: `resetOnRefCountZero: false`, `resetOnComplete: true`, `resetOnError: true`\[1\]\[2\].
-   **Effect**: If all subscribers disconnect (`refCount` hits 0), `share()` unsubscribes from the upstream source to conserve resources, but it **does not discard the Subject**\[4\].
    -   If a new subscriber arrives _before_ the stream completes or errors, they reuse the **same Subject**\[4\].
    -   If the Subject is a caching router (like a `ReplaySubject`), late subscribers will immediately receive cached historical emissions even though the upstream connection is re-established\[4\]\[5\].
    -   If the stream completes or errors, the router is immediately reset\[1\]\[2\].

3\. `[true, false, true]` — Persistent Completion Cache with Clean Error Resets

-   **Configuration**: `resetOnRefCountZero: true`, `resetOnComplete: false`, `resetOnError: true`\[1\]\[2\].
-   **Effect**: The Subject router is discarded if subscribers drop to 0 or if the source errors\[1\]\[2\]. However, if the source successfully completes, **the Subject is not reset**\[2\]. It remains in memory in its terminal completed state.
    -   Any subscriber that arrives _after_ completion will immediately receive a "complete" notification from the stale Subject without ever triggering a new upstream subscription\[4\].
    -   If everyone unsubscribes, the Subject is finally cleared\[1\]\[2\].

4\. `[true, true, false]` — Persistent Error Cache with Clean Completion Resets

-   **Configuration**: `resetOnRefCountZero: true`, `resetOnComplete: true`, `resetOnError: false`\[1\]\[2\].
-   **Effect**: The Subject router is discarded on completion or when subscribers hit 0\[1\]\[2\]. But if the source errors, **the Subject is not reset**\[2\].
    -   The router stays locked in its terminal "errored" state. Any future subscriber will immediately receive the cached error notification\[4\].
    -   This is useful when you want to treat an upstream error as a terminal, fatal state that future subscribers cannot retry unless the stream is completely evacuated of subscribers first\[4\].

5\. `[true, false, false]` — Permanent Terminal Caching with Active Eviction

-   **Configuration**: `resetOnRefCountZero: true`, `resetOnComplete: false`, `resetOnError: false`\[1\]\[2\].
-   **Effect**: The router **retains its completed or errored terminal state indefinitely** once the upstream source finishes\[2\]\[4\].
    -   If active subscribers remain, any new late subscribers will immediately receive that cached terminal complete or error signal without restarting the upstream execution\[4\]\[6\].
    -   The terminal Subject is **only discarded** if the subscriber count drops to zero (`refCount` hits 0)\[1\]\[2\], effectively allowing active subscribers to "hold open" the terminal state until the system is fully cleared.

6\. `[false, true, false]` — Complete-Only Reset with Permanent Error Locking

-   **Configuration**: `resetOnRefCountZero: false`, `resetOnComplete: true`, `resetOnError: false`\[1\]\[2\].
-   **Effect**: The Subject is reset _only_ when the stream successfully completes\[1\]\[2\].
    -   If the stream errors, the error state is locked into the Subject forever\[2\]\[4\].
    -   Because `resetOnRefCountZero` is `false`, even if all subscribers disconnect and reconnect, they will still receive the cached error and the source is never re-subscribed\[4\].
    -   A successful completion is the only way this router is ever cleaned up and replaced\[2\].

7\. `[false, false, true]` — Error-Only Reset with Permanent Completion Caching

-   **Configuration**: `resetOnRefCountZero: false`, `resetOnComplete: false`, `resetOnError: true`\[1\]\[2\].
-   **Effect**: The Subject is reset _only_ when the stream errors\[1\]\[2\].
    -   If the stream completes successfully, it is locked in that completed state permanently\[2\]\[4\]. Even if the active subscriber count drops to 0, the next subscriber gets the completion signal\[4\].
    -   If the stream errors, however, the router is cleanly reset, allowing subsequent subscribers to trigger a fresh, retry-able connection upstream\[1\]\[2\].

8\. `[false, false, false]` — The Permanent Router (No Resets)

-   **Configuration**: `resetOnRefCountZero: false`, `resetOnComplete: false`, `resetOnError: false`\[1\]\[2\].
-   **Effect**: The router has a permanent lifetime\[2\].
    -   While `share()` will still unsubscribe from the upstream source if subscribers drop to 0 (thanks to its Tracked demand policy)\[7\]\[8\], it **never discards the Subject**\[4\].
    -   Once the stream completes or errors, it stays in that terminal state permanently\[2\]\[4\].
    -   Future subscribers will immediately receive that terminal signal and can **never** trigger a new connection or execution, regardless of whether they disconnect or if the stream is idle\[4\]. This is ideal for caching single-time calculations or errors permanently.

* * *

🔄 Since we've mapped out how `share` manages these resets internally, would you like to run a quick live code simulation in our environment to trace and log how subscription activity, completions, and errors interact with one of these specific configurations?
---

## 引用来源

[1] All notes 8/28/2026
[2] All notes 8/28/2026
[3] All notes 8/28/2026
[4] All notes 8/28/2026
[5] All notes 8/28/2026
[6] All notes 8/28/2026
[7] All notes 8/28/2026
[8] All notes 8/28/2026
