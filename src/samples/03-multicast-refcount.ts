// Strategy 2 (RxJS 4/5) — refCount() automates connect/disconnect:
// first subscriber connects, last unsubscribe disconnects.
// The subject FACTORY (not instance) is what makes the pipeline restartable.
// Run: node src/samples/03-multicast-refcount.ts
import { defer, interval, multicast, refCount, Subject, take } from 'rxjs';

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const source$ = defer(() => {
  console.log('SOURCE: producer started');
  return interval(100).pipe(take(3));
});

const shared$ = source$.pipe(
  multicast(() => new Subject<number>()), // factory ⇒ a FRESH Subject per connection
  refCount()
);

console.log('--- first wave of subscribers ---');
shared$.subscribe((v) => console.log('A got', v)); // refCount 0→1: connects
shared$.subscribe((v) => console.log('B got', v)); // refCount 1→2: joins silently

await delay(400); // source completed (take(3)), all subscribers finished, refCount hit 0

console.log('--- second wave, after completion ---');
shared$.subscribe((v) => console.log('C got', v));
// Because the connector is a FACTORY, a fresh Subject is created and the
// producer runs AGAIN for C. With multicast(new Subject()) — an instance —
// C would have received an instant complete and nothing else.
