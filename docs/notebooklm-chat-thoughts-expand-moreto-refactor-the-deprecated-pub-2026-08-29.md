---
exported: 2026-08-29T09:27:37.532Z
source: NotebookLM
type: chat
title: "Thoughts expand_moreTo refactor the deprecated pub..."
---

# Thoughts expand_moreTo refactor the deprecated pub...

导出时间: 8/29/2026, 11:27:37 AM

---

Thoughts

To refactor the deprecated `publishLast` operator, you will transition to using an `AsyncSubject`. Because `publishLast` only emits the final value of the stream upon completion, the `AsyncSubject` is the perfect modern replacement.

Here is how you can refactor `publishLast` across its three common usage scenarios:

### Scenario 1: Creating a `ConnectableObservable`

If you use `publishLast` without arguments to create a `ConnectableObservable` that you manually connect later, replace it with the `connectable` creator function paired with an `AsyncSubject` connector.

**Deprecated Code:**

```
import { timer, publishLast, ConnectableObservable } from 'rxjs';

// Deprecated
const tick$ = timer(1_000).pipe(
  publishLast()
) as ConnectableObservable<number>;

tick$.connect();
```

**Suggested Refactor:**

```
import { connectable, timer, AsyncSubject } from 'rxjs';

// Modern approach
const tick$ = connectable(timer(1_000), {
  connector: () => new AsyncSubject<number>(),
  resetOnDisconnect: false
});

tick$.connect();
```

_(Setting resetOnDisconnect: false ensures the underlying AsyncSubject does not reset if a manual disconnection occurs, keeping the legacy behavior intact.)_

* * *

### Scenario 2: Used with `refCount()`

If you chain `publishLast` with `refCount()` to automatically handle connection lifetimes, you should replace both operators with the unified `share` operator, configured with an `AsyncSubject`.

**Deprecated Code:**

```
import { timer, publishLast, refCount } from 'rxjs';

// Deprecated
const tick$ = timer(1_000).pipe(
  publishLast(),
  refCount()
);
```

**Suggested Refactor:**

```
import { timer, share, AsyncSubject } from 'rxjs';

// Modern approach
const tick$ = timer(1_000).pipe(
  share({
    connector: () => new AsyncSubject(),
    resetOnError: false,
    resetOnComplete: false,
    resetOnRefCountZero: false
  })
);
```

_(Passing false to the reset properties matches the original behavior where the shared subscription did not reset when an error occurred, when it completed, or when active subscriber counts fell to zero.)_

* * *

### Scenario 3: Used with a Selector Function

If you are passing a selector function to `publishLast` to scope the multicast locally, replace it using the modern pipeable `connect` operator configured with an `AsyncSubject` connector.

**Deprecated Code:**

```
import { timer, publishLast, combineLatest } from 'rxjs';

// Deprecated
const tick$ = timer(1_000).pipe(
  publishLast((source) => combineLatest([source, source]))
);
```

**Suggested Refactor:**

```
import { timer, connect, combineLatest, AsyncSubject } from 'rxjs';

// Modern approach
const tick$ = timer(1_000).pipe(
  connect((source) => combineLatest([source, source]), {
    connector: () => new AsyncSubject()
  })
);
```

* * *

📘 Would you like me to compile all of these refactoring patterns—for `publish`, `publishReplay`, `publishBehavior`, `publishLast`, and `multicast`—into a unified markdown cheat sheet in your notebook?