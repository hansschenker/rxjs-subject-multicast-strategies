# Reset Flags Playground

Everything below runs through a **real `share()` pipeline from `rxjs@7`** — the same code path the repo's [specs](/guide/share-config#choosing-a-profile) pin. The upstream source is instrumented exactly like the spec harness: each execution gets its own driver, so the log shows you executions starting, values flowing, and teardowns happening as they really occur.

- **Toggling a flag or changing the connector rebuilds the pipeline** (a `share()` config is fixed at creation) and clears the state.
- The **source buttons** drive the *current upstream execution* — they are disabled while the upstream is disconnected, because then there is nothing to drive: a new execution starts only when demand arrives.
- Watch the **upstream badge** and the **SOURCE lines** in the log — they are the ground truth for what the reset flags actually do.

<ResetFlagsPlayground />

## Experiments worth running

1. **The resilient static cache `[f, f, t]`** — set `resetOnRefCountZero` and `resetOnComplete` off, keep `resetOnError` on, connector `ReplaySubject(3)`. Add a subscriber, push a value, complete. Now add a late subscriber: it gets the replay + `complete` with **no new execution**. Rebuild, then instead *error* the source and add a subscriber: execution #2 starts — cache success, retry failure.
2. **The `shareReplay` leak** — turn `resetOnRefCountZero` off, add a subscriber, push a value, then unsubscribe it. The upstream badge stays **connected**: push more values with zero subscribers, then add a subscriber and watch the retained buffer replay them.
3. **The partition law** — profile `[t, f, f]`: add a subscriber, complete the source (the subscriber closes, refCount is zero). Add a new subscriber: the terminal cache is intact and no re-execution happens — `resetOnRefCountZero` is inert after a terminal event.
4. **The dead default vs. the outlier** — compare `[t, t, t]` (every wave of subscribers gets a fresh execution) against `[f, t, f]` after an error: the outlier locks the error in forever, even for brand-new subscribers.
5. **Memory policies** — repeat experiment 1 with `AsyncSubject` (only the final value, on completion) or `BehaviorSubject(0)` (a seed value immediately) and watch the Late-Subscriber axis change while the Reset axis stays put.

The concepts behind every knob here: [the Subject Router Algebra](/guide/router-algebra). The full profile table: [share() with Config](/guide/share-config#the-8-reset-profiles).
