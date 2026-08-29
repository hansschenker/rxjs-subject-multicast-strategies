// Strategy 7 (RxJS 7) — connect(selector): the modern replacement for
// publish(selector) / multicast(factory, selector). Inside the selector the
// source is multicast — use it many times, it executes once.
// Run: node src/samples/08-connect-selector.ts
import { connect, defer, filter, interval, map, merge, take } from 'rxjs';

const number$ = defer(() => {
  console.log('SOURCE: producer started (watch — this logs ONCE)');
  return interval(100).pipe(take(6));
});

const labeled$ = number$.pipe(
  connect((shared$) =>
    merge(
      shared$.pipe(filter((n) => n % 2 === 0), map((n) => `even ${n}`)),
      shared$.pipe(filter((n) => n % 2 === 1), map((n) => `odd  ${n}`))
    )
  )
);

// shared$ is consumed TWICE inside the selector, yet the producer runs once,
// and the whole lifecycle is scoped to this one outer subscription:
labeled$.subscribe((v) => console.log(v));
