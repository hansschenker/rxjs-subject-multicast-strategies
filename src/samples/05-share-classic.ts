// Strategy 4 (RxJS 5/6) — share(): factory Subject + refCount fused into one
// operator. Connects on first subscriber, tears down on last, restarts cleanly.
// Run: node src/samples/05-share-classic.ts
import { defer, interval, share, take } from 'rxjs';

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const shared$ = defer(() => {
  console.log('SOURCE: new execution');
  return interval(100).pipe(take(5));
}).pipe(share());

const a = shared$.subscribe((v) => console.log('A got', v)); // refCount 0→1: connects
const b = shared$.subscribe((v) => console.log('B got', v)); // joins the live stream

await delay(250);
a.unsubscribe();
b.unsubscribe(); // refCount 1→0: disconnect, source torn down mid-flight
console.log('everyone left — upstream disconnected');

await delay(150);
shared$.subscribe((v) => console.log('C got', v));
// A fresh Subject is created and the source re-executes from 0 — this
// restartability is what publish().refCount() could never do.
await delay(600);
