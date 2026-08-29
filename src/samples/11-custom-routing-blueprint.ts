// Custom Routing Blueprint - separate the multicast TRANSPORT (one shared
// execution, owns the lifecycle policy) from selective ROUTING (key and
// predicate filters layered on top). Routes are pure filter policies;
// they never create new transports or extra upstream executions.
// Run: node src/samples/11-custom-routing-blueprint.ts
import { defer, filter, interval, map, share, take } from 'rxjs';
import type { Observable } from 'rxjs';

interface Reading {
  sensor: string;
  value: number;
}

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

// TRANSPORT: one shared execution. The reset/memory policy lives here — and
// ONLY here, so every route below inherits the same lifecycle semantics.
const transport$: Observable<Reading> = defer(() => {
  console.log('TRANSPORT: upstream started (watch — once, no matter how many routes)');
  return interval(100).pipe(
    take(6),
    map((i) => ({ sensor: i % 2 === 0 ? 'temp' : 'humidity', value: i * 10 })),
  );
}).pipe(share());

// ROUTING: selective consumption as derived observables.
// A key route is just a filter over the transport:
const route = (sensor: string): Observable<Reading> =>
  transport$.pipe(filter((r) => r.sensor === sensor));

// A predicate route is the same idea with an arbitrary condition:
const alerts$ = transport$.pipe(filter((r) => r.value >= 30));

route('temp').subscribe((r) => console.log('temp     route:', r.value));
route('humidity').subscribe((r) => console.log('humidity route:', r.value));
alerts$.subscribe((r) => console.log('alert    route:', r.sensor, r.value));

// Three routes, three subscriptions — but "TRANSPORT: upstream started"
// logs exactly once. Routing logic never multiplies executions.
await delay(800);
