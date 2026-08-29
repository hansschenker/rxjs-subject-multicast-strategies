// Strategy 5 (RxJS 5.4+) — shareReplay(n): sharing through a ReplaySubject,
// tuned for caching. Default refCount: false = never disconnects upstream.
// Run: node src/samples/06-sharereplay-cache.ts
import { defer, interval, shareReplay, take, tap } from 'rxjs';

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

console.log('--- the cache: late subscribers replay the last value, no re-execution ---');
const cached$ = defer(() => {
  console.log('SOURCE: expensive execution (imagine an HTTP call)');
  return interval(100).pipe(take(3));
}).pipe(shareReplay(1));

cached$.subscribe((v) => console.log('A got', v));
await delay(400); // source completed with 0, 1, 2

cached$.subscribe((v) => console.log('B got (from cache)', v));
// B receives the cached 2 + complete instantly — the source does NOT run again.

await delay(100);
console.log('--- the leak: refCount:false keeps an infinite upstream alive forever ---');
const leaky$ = defer(() => {
  console.log('LEAKY SOURCE: started');
  // take(8) exists only so this demo script can exit —
  // a real infinite source would keep producing forever.
  return interval(100).pipe(take(8), tap((v) => console.log('LEAKY SOURCE producing:', v)));
}).pipe(shareReplay(1));

const s = leaky$.subscribe((v) => console.log('consumer got', v));
await delay(250);
s.unsubscribe();
console.log('consumer left — but watch: the source above KEEPS producing');
await delay(400);

console.log('--- the fix: refCount: true restores disconnect-on-last-unsubscribe ---');
const fixed$ = defer(() => {
  console.log('FIXED SOURCE: started');
  return interval(100).pipe(take(8), tap((v) => console.log('FIXED SOURCE producing:', v)));
}).pipe(shareReplay({ bufferSize: 1, refCount: true }));

const s2 = fixed$.subscribe((v) => console.log('consumer got', v));
await delay(250);
s2.unsubscribe();
console.log('consumer left — upstream disconnected this time (no more producing logs)');
await delay(300);
