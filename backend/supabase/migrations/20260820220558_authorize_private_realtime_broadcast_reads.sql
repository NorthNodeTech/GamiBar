-- Clients may only receive backend-owned invalidation broadcasts for GamiBAR
-- topic shapes. No insert policy exists, so browser clients cannot broadcast.
create policy "GamiBar clients can receive scoped broadcasts"
on realtime.messages
for select
to anon, authenticated
using (
  extension = 'broadcast'
  and (
    (select realtime.topic()) ~ '^room:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}:(public|host)$'
    or (select realtime.topic()) ~ '^resource-drop:[A-Za-z0-9_-]{24,80}$'
    or (select realtime.topic()) ~ '^resource-drop-room:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$'
  )
);
