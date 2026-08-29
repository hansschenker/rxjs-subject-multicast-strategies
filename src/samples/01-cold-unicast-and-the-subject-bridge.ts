// Strategy 0 — the primitive every operator automates:
// a Subject sitting between ONE source execution and many subscribers.
// Run: node src/samples/01-cold-unicast-and-the-subject-bridge.ts
import { Observable, Subject } from 'rxjs';

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const source$ = new Observable<number>((subscriber) => {
  console.log('SOURCE: producer started');
  let n = 0;
  const id = setInterval(() => subscriber.next(n++), 100);
  return () => {
    console.log('SOURCE: torn down');
    clearInterval(id);
  };
});

console.log('--- Part 1: cold & unicast — every subscriber gets its OWN producer ---');
const subA = source$.subscribe((v) => console.log('A got', v));
const subB = source$.subscribe((v) => console.log('B got', v));
// "SOURCE: producer started" logs TWICE: two intervals, two independent executions.

await delay(250);
subA.unsubscribe();
subB.unsubscribe();

console.log('--- Part 2: the manual Subject bridge — ONE producer, many listeners ---');
const hub = new Subject<number>();
hub.subscribe((v) => console.log('C got', v)); // 1. register listeners first…
hub.subscribe((v) => console.log('D got', v));
const connection = source$.subscribe(hub);     // 2. …then start the ONE execution

await delay(250);
connection.unsubscribe();                      // 3. master switch: stops it for everyone
