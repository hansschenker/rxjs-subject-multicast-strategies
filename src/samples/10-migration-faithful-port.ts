// The migration gotcha — a FAITHFUL port of publishReplay(1).refCount()
// requires ALL THREE reset flags false, because legacy never auto-reset
// its one Subject. Plain share() is better behavior, but not the SAME behavior.
// Run: node src/samples/10-migration-faithful-port.ts
import { defer, interval, publishReplay, refCount, ReplaySubject, share, take } from 'rxjs';

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const makeSource = (name: string) =>
  defer(() => {
    console.log(`${name}: source executed`);
    return interval(50).pipe(take(3));
  });

const legacy$ = makeSource('LEGACY').pipe(publishReplay(1), refCount());

const faithful$ = makeSource('FAITHFUL').pipe(
  share({
    connector: () => new ReplaySubject<number>(1),
    resetOnError: false,
    resetOnComplete: false,
    resetOnRefCountZero: false, // ← all three false, or it is NOT the same behavior
  })
);

legacy$.subscribe((v) => console.log('legacy   early:', v));
faithful$.subscribe((v) => console.log('faithful early:', v));

await delay(300); // both sources completed with 0, 1, 2

// After completion, BOTH retain their spent Subject: late subscribers get the
// replayed last value + complete, and neither source is ever re-executed.
legacy$.subscribe((v) => console.log('legacy   late :', v));
faithful$.subscribe((v) => console.log('faithful late :', v));

// Contrast: a plain share() here would have re-executed the source for the
// late subscribers — usually what you WANT, but not what the legacy code did.
