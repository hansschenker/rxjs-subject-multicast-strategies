// Strategy 6 (RxJS 7) — connectable(): the modern replacement for
// multicast(subject) + manual .connect(). A creation function, not an
// operator — so there is no ConnectableObservable cast to lose in a pipe.
// Run: node src/samples/07-connectable.ts
import { connectable, defer, interval, Subject, take } from 'rxjs';

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const tick$ = connectable(
  defer(() => {
    console.log('SOURCE: producer started');
    return interval(100).pipe(take(5));
  }),
  {
    connector: () => new Subject<number>(), // always a FACTORY — no dead-subject trap
    // resetOnDisconnect: true is the default: a fresh Subject after each disconnect
  }
);

tick$.subscribe((v) => console.log('A got', v));
tick$.subscribe((v) => console.log('B got', v));
console.log('listeners wired — nothing flowing yet');

const connection = tick$.connect(); // deliberate start, exactly as with multicast
await delay(250);
console.log('master switch off');
connection.unsubscribe();

console.log('--- reconnecting: resetOnDisconnect gave us a fresh Subject ---');
tick$.subscribe((v) => console.log('C got', v));
tick$.connect(); // the producer starts again from 0 for the second connection
await delay(600);
