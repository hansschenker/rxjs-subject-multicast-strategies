// Strategy 3 (RxJS 4/5) — the publish shorthands bind a Subject flavor to
// multicast: publish / publishBehavior / publishReplay / publishLast.
// They pass a single Subject INSTANCE — the famous dead-subject trap.
// Run: node src/samples/04-publish-family.ts
import { interval, of, publish, publishBehavior, publishLast, publishReplay, refCount, share, take, tap } from 'rxjs';

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

console.log('--- the dead-subject trap: publish().refCount() vs share() ---');
const source$ = of(1, 2, 3).pipe(tap({ subscribe: () => console.log('SOURCE: executed') }));

const trapped$ = source$.pipe(publish(), refCount());
trapped$.subscribe((v) => console.log('A got', v)); // source executes; A gets 1, 2, 3
trapped$.subscribe((v) => console.log('B got', v)); // NOTHING — the one Subject is spent

const healthy$ = source$.pipe(share());             // share() uses a Subject FACTORY
healthy$.subscribe((v) => console.log('C got', v)); // fresh execution for C…
healthy$.subscribe((v) => console.log('D got', v)); // …and again for D (sync completion resets)

await delay(100);
console.log('--- publishBehavior(-1): late arrivals get the CURRENT value first ---');
const behavior$ = interval(100).pipe(take(3), publishBehavior(-1), refCount());
behavior$.subscribe((v) => console.log('behavior:', v)); // -1 (seed), then 0, 1, 2

await delay(400);
console.log('--- publishReplay(2): late arrivals get the last 2 values replayed ---');
const replayed$ = interval(100).pipe(take(3), publishReplay(2), refCount());
replayed$.subscribe((v) => console.log('early :', v));
await delay(250);
replayed$.subscribe((v) => console.log('late  :', v)); // replays 0, 1 — then live 2

await delay(200);
console.log('--- publishLast(): everyone gets ONLY the final value, on completion ---');
const last$ = interval(100).pipe(take(3), publishLast(), refCount());
last$.subscribe((v) => console.log('last  :', v)); // logs "last: 2" at ~300 ms
await delay(400);
