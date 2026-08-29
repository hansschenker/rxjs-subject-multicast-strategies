// Strategy 1 (RxJS 4/5) — multicast(subject) wraps the Subject wiring into a
// ConnectableObservable: subscribers queue up silently until you call .connect().
// Run: node src/samples/02-multicast-manual-connect.ts
import { interval, multicast, Subject, take } from 'rxjs';
import type { ConnectableObservable } from 'rxjs';

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const shared$ = interval(100).pipe(
  take(5),
  multicast(new Subject<number>())
) as ConnectableObservable<number>; // the cast the modern API made unnecessary

shared$.subscribe((v) => console.log('A got', v)); // registered — but nothing flows yet
shared$.subscribe((v) => console.log('B got', v));
console.log('subscribers are wired up and waiting — no producer running');

const connection = shared$.connect(); // NOW the interval starts, exactly once
console.log('connected — one shared execution feeds A and B');

await delay(250);
console.log('flipping the master switch off (before the 5 values finish)');
connection.unsubscribe(); // tears down the source for everyone at once
