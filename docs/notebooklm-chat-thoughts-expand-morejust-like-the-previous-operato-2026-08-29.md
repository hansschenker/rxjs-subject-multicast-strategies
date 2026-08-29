---
exported: 2026-08-29T09:27:06.555Z
source: NotebookLM
type: chat
title: "Thoughts expand_moreJust like the previous operato..."
---

# Thoughts expand_moreJust like the previous operato...

导出时间: 8/29/2026, 11:27:06 AM

---

Thoughts

Just like the previous operators, refactoring the deprecated `publish` operator depends on how you are connecting to your shared source:

### Scenario 1: Creating a `ConnectableObservable`

If you are using `publish` without arguments to create a `ConnectableObservable` that you manually connect later, you can replace it by calling the `connectable` creator function with a default `Subject` inside the `connector` option\[1\].

**Deprecated Code:**\[1\]

```
import { timer, publish, ConnectableObservable } from 'rxjs';

// Deprecated
const tick$ = timer(1_000).pipe(
  publish()
) as ConnectableObservable<number>;

tick$.connect();
```

**Suggested Refactor:**\[1\]\[2\]

```
import { connectable, timer, Subject } from 'rxjs';

// Modern approach
const tick$ = connectable(timer(1_000), {
  connector: () => new Subject<number>(),
  resetOnDisconnect: false
});

tick$.connect();
```

_(Setting resetOnDisconnect: false ensures that the shared connection behaves the same as the original publish operator by not resetting the subject upon disconnecting_\[1\]\[2\]_.)_

* * *

### Scenario 2: Used with `refCount()`

If you are chaining `publish` with `refCount()` to automate subscription lifetimes, you should replace the entire pattern using the modern `share` operator\[2\].

**Deprecated Code:**\[2\]

```
import { timer, publish, refCount } from 'rxjs';

// Deprecated
const tick$ = timer(1_000).pipe(
  publish(),
  refCount()
);
```

**Suggested Refactor:**\[3\]

```
import { timer, share } from 'rxjs';

// Modern approach
const tick$ = timer(1_000).pipe(
  share({
    resetOnError: false,
    resetOnComplete: false,
    resetOnRefCountZero: false
  })
);
```

_(Providing these explicit false overrides prevents the multicast stream from automatically resetting when an error occurs, completes, or when active subscribers drop to zero, which preserves the original publish().refCount() behavior_\[3\]_.)_

* * *

### Scenario 3: Used with a Selector Function

If you are calling `publish` with a selector function (to scope the multicast locally within a pipe), you can replace it directly with the pipeable `connect` operator\[3\].

**Deprecated Code:**\[4\]

```
import { timer, publish, combineLatest } from 'rxjs';

// Deprecated
const tick$ = timer(1_000).pipe(
  publish((source) => combineLatest([source, source]))
);
```

**Suggested Refactor:**\[4\]\[5\]

```
import { timer, connect, combineLatest } from 'rxjs';

// Modern approach
const tick$ = timer(1_000).pipe(
  connect((source) => combineLatest([source, source]))
);
```

* * *

📝 Would you like me to compile all of these multicasting refactoring patterns into a structured reference guide or cheat sheet that you can save to your notebook?
---

## 引用来源

[1] RxJS - Multicasting
[2] RxJS - Multicasting
[3] RxJS - Multicasting
[4] RxJS - Multicasting
[5] RxJS - Multicasting
