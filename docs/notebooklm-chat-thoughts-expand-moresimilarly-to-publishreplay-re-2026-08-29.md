---
exported: 2026-08-29T09:25:49.050Z
source: NotebookLM
type: chat
title: "Thoughts expand_moreSimilarly to publishReplay, re..."
---

# Thoughts expand_moreSimilarly to publishReplay, re...

导出时间: 8/29/2026, 11:25:49 AM

---

Thoughts

Similarly to `publishReplay`, refactoring the deprecated `publishBehavior` operator depends on how you manage subscription connections in your stream\[1\]\[2\]:

### Scenario 1: Creating a `ConnectableObservable`

If you are using `publishBehavior` to obtain a `ConnectableObservable` that you manually connect later, you can replace it by calling the `connectable` function and providing a `BehaviorSubject` inside the `connector` option\[1\]\[3\].

**Deprecated Code:**

```
import { timer, publishBehavior, ConnectableObservable } from 'rxjs';

// Deprecated
const tick$ = timer(1_000).pipe(
  publishBehavior(0)
) as ConnectableObservable<number>;

tick$.connect();
```

**Suggested Refactor:**

```
import { connectable, timer, BehaviorSubject } from 'rxjs';

// Modern approach
const tick$ = connectable(timer(1_000), {
  connector: () => new BehaviorSubject(0),
  resetOnDisconnect: false
});

tick$.connect();
```

_(Setting resetOnDisconnect: false ensures that the connection behavior matches the original design by not resetting the subject if a disconnect occurs_\[3\]_.)_

* * *

### Scenario 2: Used with `refCount()`

If you are chaining `publishBehavior` with `refCount()` to automate the connection lifetime, you should replace the entire chain with the `share` operator, specifying a `BehaviorSubject` factory for the `connector` parameter\[2\]\[4\].

**Deprecated Code:**

```
import { timer, publishBehavior, refCount } from 'rxjs';

// Deprecated
const tick$ = timer(1_000).pipe(
  publishBehavior(0),
  refCount()
);
```

**Suggested Refactor:**

```
import { timer, share, BehaviorSubject } from 'rxjs';

// Modern approach
const tick$ = timer(1_000).pipe(
  share({
    connector: () => new BehaviorSubject(0),
    resetOnError: false,
    resetOnComplete: false,
    resetOnRefCountZero: false
  })
);
```

_(Explicitly passing false to all reset parameters is required to replicate the legacy refCount behavior, preventing the multicast source from automatically resetting when an error occurs, completes, or when active subscribers drop to zero_\[4\]_.)_

* * *

⏳ Would you like to see how to refactor `publishLast` (which transitions to `AsyncSubject`) next?
---

## 引用来源

[1] RxJS - Multicasting
[2] RxJS - Multicasting
[3] RxJS - Multicasting
[4] RxJS - Multicasting
