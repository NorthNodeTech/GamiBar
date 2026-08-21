# GamiBar capacity runbook

The API is stateless across requests. Durable room state lives in Postgres and Realtime Broadcast
only invalidates client snapshots, so multiple API instances do not need sticky sessions.

Room snapshots use `gamibar_get_room_bundle` to fetch the room and four gameplay child collections
in one PostgREST/RPC round trip. Broadcast bursts are debounced, students reconcile every five
minutes, hosts every five seconds, and Resource Drop pages every sixty seconds while visible.

## Production baseline

- Run at least two paid API instances in the same region as Supabase.
- On a Render Pro workspace, start autoscaling at 2-10 Standard instances with CPU and memory
  targets near 60-70%. Keep the existing health check and 40-second shutdown window.
- `MAX_IN_FLIGHT_REQUESTS=100` is a per-instance overload guard. Tune it from measured p95 latency
  and memory, not from the desired user count.
- `API_RATE_LIMIT_PER_15_MINUTES=200000` is a coarse shared-IP emergency ceiling so a campus NAT
  does not block legitimate free participants. Keep tighter endpoint limits on AI, billing, and
  uploads instead of lowering this classroom-wide ceiling.
- Select a Supabase plan whose Realtime concurrent-connections and messages-per-second quotas cover
  the expected peak. The Free plan currently allows 200 concurrent Realtime connections and 100
  messages per second. Five thousand connected clients requires more than the default Pro quota;
  request/enable the required limit before the load test.
- Apply every migration before deploying the matching API version.

## Load-test gate

Before declaring a 1,000-5,000-user target ready, test the actual mix of room sizes, answer rates,
file uploads, and reconnects in staging. Watch API p95/p99 latency, 429/503/5xx rates, instance CPU
and memory, Supabase database IO/locks, Realtime connections, and Realtime message throughput.

Raise compute or instance count before raising the in-flight guard. A higher guard without more
capacity only turns controlled retries into memory pressure and long request queues.
