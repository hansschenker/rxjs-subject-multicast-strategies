// Strategy 8 (RxJS 7) — share(config): which Subject + three reset flags as
// explicit, orthogonal knobs. Shown here: the Resilient Static Cache
// [resetOnRefCountZero: false, resetOnComplete: false, resetOnError: true]
// — "cache success, retry failure" — and a reset-notifier grace period.
// Run: node src/samples/09-share-config.ts
import { defer, of, ReplaySubject, share, take, throwError, timer } from 'rxjs';

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

console.log('--- Resilient Static Cache: cache success, retry failure ---');
let attempt = 0;
const flaky$ = defer(() => {
  attempt += 1;
  console.log(`SOURCE: attempt #${attempt}`);
  return attempt < 2 ? throwError(() => new Error('network timeout')) : of('fresh payload');
});

const cached$ = flaky$.pipe(
  share({
    connector: () => new ReplaySubject<string>(1),
    resetOnError: true,         // failure ⇒ discard the Subject ⇒ next subscriber retries
    resetOnComplete: false,     // success ⇒ keep the completed Subject ⇒ cached forever
    resetOnRefCountZero: false, // idle ⇒ keep it too
  })
);

cached$.subscribe({
  next: (v) => console.log('A got', v),
  error: (e: Error) => console.log('A saw error:', e.message), // attempt #1 fails
});
cached$.subscribe({
  next: (v) => console.log('B got', v),                        // attempt #2 succeeds
  error: (e: Error) => console.log('B saw error:', e.message),
});

await delay(100);
cached$.subscribe((v) => console.log('C got (cached — no attempt #3)', v));

await delay(100);
console.log('--- reset notifier: a disconnect grace period legacy could never express ---');
const graceful$ = defer(() => {
  console.log('GRACE SOURCE: started');
  return timer(0, 100).pipe(take(8));
}).pipe(share({ resetOnRefCountZero: () => timer(200) }));

const g = graceful$.subscribe((v) => console.log('G got', v));
await delay(150);
g.unsubscribe();
console.log('G left — the connection lingers for 200 ms…');
await delay(100); // …and H arrives inside the grace window:
graceful$.subscribe((v) => console.log('H got (SAME execution — no restart log)', v));
await delay(700);
