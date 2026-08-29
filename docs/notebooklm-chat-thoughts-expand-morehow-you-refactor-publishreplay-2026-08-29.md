---
exported: 2026-08-29T09:24:34.619Z
source: NotebookLM
type: chat
title: "Thoughts expand_moreHow you refactor publishReplay..."
---

# Thoughts expand_moreHow you refactor publishReplay...

导出时间: 8/29/2026, 11:24:34 AM

---

Thoughts

How you refactor `publishReplay` depends on which pattern you are replacing: creating a manually controlled `ConnectableObservable`, auto-connecting via `refCount()`, or utilizing a selector function\[1\].

Here are the three direct refactoring paths for replacing deprecated `publishReplay` setups:

* * *

### Scenario 1: Creating a `ConnectableObservable`

If you are using `publishReplay` purely to create a `ConnectableObservable` (which you manually `.connect()` later), you should replace it with the `connectable` creator function paired with a `ReplaySubject` connector\[1\]\[4\].

**Deprecated Code:**

```
import { timer, publishReplay, ConnectableObservable } from 'rxjs';

// Deprecated
const tick$ = timer(1_000).pipe(
  publishReplay(1)
) as ConnectableObservable<number>;

tick$.connect();
```

**Suggested Refactor:**

```
import { connectable, timer, ReplaySubject } from 'rxjs';

// Modern approach
const tick$ = connectable(timer(1_000), {
  connector: () => new ReplaySubject<number>(1),
  resetOnDisconnect: false
});

tick$.connect();
```

_(Setting resetOnDisconnect: false matches the legacy behavior of not resetting the shared subscription if a disconnect occurs_\[1\]_.)_

* * *

### Scenario 2: Used with `refCount()`

If you are using `publishReplay` and immediately chaining `refCount()` to automatically connect and disconnect based on active observers, you should replace the entire chain with the newly highly configurable `share` operator using a `ReplaySubject` connector\[2\]\[3\].

**Deprecated Code:**

```
import { timer, publishReplay, refCount } from 'rxjs';

// Deprecated
const tick$ = timer(1_000).pipe(
  publishReplay(1),
  refCount()
);
```

**Suggested Refactor:**

```
import { timer, share, ReplaySubject } from 'rxjs';

// Modern approach
const tick$ = timer(1_000).pipe(
  share({
    connector: () => new ReplaySubject(1),
    resetOnError: false,
    resetOnComplete: false,
    resetOnRefCountZero: false
  })
);
```

_(Passing the configuration properties explicitly reproduces the exact behavior of publishReplay().refCount(), which by default did not automatically reset on errors, completions, or when observer count dropped to zero_\[2\]\[3\]_.)_

* * *

### Scenario 3: Used with a Selector Function

If you are using `publishReplay` with a selector function (to restrict the multicast scope locally), you should refactor it using the `connect` operator configured with a `ReplaySubject` connector\[3\]\[5\].

**Deprecated Code:**

```
import { timer, publishReplay, combineLatest } from 'rxjs';

// Deprecated
const tick$ = timer(1_000).pipe(
  publishReplay(1, undefined, (source) => combineLatest([source, source]))
);
```

**Suggested Refactor:**

```
import { timer, connect, combineLatest, ReplaySubject } from 'rxjs';

// Modern approach
const tick$ = timer(1_000).pipe(
  connect((source) => combineLatest([source, source]), {
    connector: () => new ReplaySubject(1)
  })
);
```

* * *

💡 Would you like to look at how to refactor other common patterns, like `publishBehavior` or `publishLast`?
---

## 引用来源

[1] RxJS - Multicasting
[2] RxJS - Multicasting
[3] RxJS - Multicasting
[4] RxJS - Multicasting
[5] RxJS - Multicasting
