-- Add server-owned Razorpay billing, payment audit, refunds, entitlements, and usage counters.
-- Browser roles intentionally receive no Data API privileges; all billing writes go through Express.

create table public.gamibar_billing_profiles (
  author_id uuid primary key references public.gamibar_authors (id) on delete cascade,
  legal_name text not null check (char_length(trim(legal_name)) between 1 and 120),
  email text not null check (char_length(trim(email)) between 3 and 320),
  phone text check (phone is null or phone ~ '^\+[1-9][0-9]{7,14}$'),
  gstin text check (gstin is null or gstin ~ '^[0-9]{2}[A-Z0-9]{13}$'),
  address_line_1 text check (
    address_line_1 is null or char_length(trim(address_line_1)) between 1 and 200
  ),
  address_line_2 text check (
    address_line_2 is null or char_length(trim(address_line_2)) between 1 and 200
  ),
  city text check (city is null or char_length(trim(city)) between 1 and 100),
  state_code text not null check (state_code ~ '^[A-Z]{2}$'),
  postal_code text check (postal_code is null or postal_code ~ '^[0-9]{6}$'),
  country_code text not null default 'IN' check (country_code ~ '^[A-Z]{2}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.gamibar_billing_profiles is
  'Validated billing identity and place-of-supply details for an author.';

create table public.gamibar_subscriptions (
  id bigint generated always as identity primary key,
  author_id uuid not null references public.gamibar_authors (id) on delete cascade,
  plan_code text not null check (plan_code in ('pro_monthly', 'pro_yearly')),
  provider text not null default 'razorpay' check (provider = 'razorpay'),
  provider_plan_id text not null check (provider_plan_id ~ '^plan_[A-Za-z0-9]+$'),
  provider_subscription_id text not null unique
    check (provider_subscription_id ~ '^sub_[A-Za-z0-9]+$'),
  status text not null check (
    status in (
      'created',
      'authenticated',
      'active',
      'pending',
      'halted',
      'paused',
      'cancelled',
      'completed',
      'expired'
    )
  ),
  currency text not null default 'INR' check (currency = 'INR'),
  base_amount_paise bigint not null check (base_amount_paise > 0),
  gst_amount_paise bigint not null check (gst_amount_paise >= 0),
  total_amount_paise bigint not null check (
    total_amount_paise = base_amount_paise + gst_amount_paise
  ),
  total_count integer not null check (total_count between 1 and 1200),
  paid_count integer not null default 0 check (paid_count >= 0),
  current_start timestamptz,
  current_end timestamptz,
  ended_at timestamptz,
  cancellation_requested_at timestamptz,
  cancel_at_cycle_end boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.gamibar_subscriptions is
  'Razorpay subscription state mirrored from verified checkout responses and webhooks.';

create index gamibar_subscriptions_author_created_idx
  on public.gamibar_subscriptions (author_id, created_at desc);

create unique index gamibar_subscriptions_one_billable_per_author_idx
  on public.gamibar_subscriptions (author_id)
  where status in ('created', 'authenticated', 'active', 'pending', 'halted', 'paused');

create table public.gamibar_payment_orders (
  id bigint generated always as identity primary key,
  author_id uuid not null references public.gamibar_authors (id) on delete cascade,
  subscription_id bigint references public.gamibar_subscriptions (id) on delete set null,
  plan_code text not null check (
    plan_code in ('pro_monthly', 'pro_yearly', 'lifetime')
  ),
  provider text not null default 'razorpay' check (provider = 'razorpay'),
  provider_order_id text unique check (
    provider_order_id is null or provider_order_id ~ '^order_[A-Za-z0-9]+$'
  ),
  provider_payment_id text unique check (
    provider_payment_id is null or provider_payment_id ~ '^pay_[A-Za-z0-9]+$'
  ),
  receipt text not null unique check (char_length(receipt) between 1 and 40),
  invoice_number text unique check (
    invoice_number is null or char_length(invoice_number) between 1 and 40
  ),
  status text not null check (
    status in ('created', 'authorized', 'paid', 'failed', 'refund_requested', 'refunded')
  ),
  currency text not null default 'INR' check (currency = 'INR'),
  base_amount_paise bigint not null check (base_amount_paise > 0),
  gst_rate_bps integer not null default 1800 check (gst_rate_bps between 0 and 10000),
  cgst_amount_paise bigint not null default 0 check (cgst_amount_paise >= 0),
  sgst_amount_paise bigint not null default 0 check (sgst_amount_paise >= 0),
  igst_amount_paise bigint not null default 0 check (igst_amount_paise >= 0),
  total_amount_paise bigint not null check (
    total_amount_paise =
      base_amount_paise + cgst_amount_paise + sgst_amount_paise + igst_amount_paise
  ),
  paid_at timestamptz,
  refund_eligible_until timestamptz,
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.gamibar_payment_orders is
  'Immutable-price payment ledger with GST breakup and verified Razorpay identifiers.';

create index gamibar_payment_orders_author_created_idx
  on public.gamibar_payment_orders (author_id, created_at desc);

create index gamibar_payment_orders_subscription_id_idx
  on public.gamibar_payment_orders (subscription_id)
  where subscription_id is not null;

create table public.gamibar_entitlements (
  author_id uuid primary key references public.gamibar_authors (id) on delete cascade,
  plan_code text not null check (
    plan_code in ('pro_monthly', 'pro_yearly', 'lifetime')
  ),
  status text not null check (
    status in ('active', 'past_due', 'cancelled', 'expired', 'refunded')
  ),
  source text not null check (source in ('subscription', 'lifetime', 'admin')),
  source_reference text not null check (char_length(source_reference) between 1 and 100),
  valid_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gamibar_entitlements_lifetime_no_expiry check (
    plan_code <> 'lifetime' or valid_until is null
  )
);

comment on table public.gamibar_entitlements is
  'Current paid access projection. Missing row means the author is on the Free plan.';

create index gamibar_entitlements_status_valid_idx
  on public.gamibar_entitlements (status, valid_until);

create table public.gamibar_refund_requests (
  id bigint generated always as identity primary key,
  author_id uuid not null references public.gamibar_authors (id) on delete cascade,
  payment_order_id bigint not null unique
    references public.gamibar_payment_orders (id) on delete restrict,
  reason text not null check (char_length(trim(reason)) between 5 and 1000),
  status text not null default 'requested' check (
    status in ('requested', 'approved', 'rejected', 'processing', 'processed', 'failed')
  ),
  requested_amount_paise bigint not null check (requested_amount_paise > 0),
  provider_refund_id text unique check (
    provider_refund_id is null or provider_refund_id ~ '^rfnd_[A-Za-z0-9]+$'
  ),
  resolution_note text check (
    resolution_note is null or char_length(resolution_note) <= 1000
  ),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.gamibar_refund_requests is
  'Seven-day customer refund requests. Money movement requires a separate approval action.';

create index gamibar_refund_requests_author_created_idx
  on public.gamibar_refund_requests (author_id, created_at desc);

create table public.gamibar_payment_events (
  provider_event_id text primary key check (char_length(provider_event_id) between 1 and 100),
  event_type text not null check (char_length(event_type) between 1 and 100),
  payload jsonb not null,
  status text not null default 'pending' check (
    status in ('pending', 'processing', 'processed', 'failed', 'ignored')
  ),
  attempts integer not null default 0 check (attempts >= 0),
  last_error text check (last_error is null or char_length(last_error) <= 2000),
  signature_verified_at timestamptz not null,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.gamibar_payment_events is
  'Idempotent Razorpay webhook inbox. Raw signed payloads are service-role only.';

create index gamibar_payment_events_work_queue_idx
  on public.gamibar_payment_events (status, created_at)
  where status in ('pending', 'processing', 'failed');

create table public.gamibar_usage_counters (
  author_id uuid not null references public.gamibar_authors (id) on delete cascade,
  usage_key text not null check (usage_key in ('ai_generation')),
  period_start date not null,
  usage_count integer not null default 0 check (usage_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (author_id, usage_key, period_start)
);

comment on table public.gamibar_usage_counters is
  'Server-owned monthly usage counters used for Free limits and Pro fair-use monitoring.';

create or replace function public.gamibar_consume_usage(
  p_author_id uuid,
  p_usage_key text,
  p_period_start date,
  p_limit integer default null
)
returns integer
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  consumed integer;
begin
  if p_usage_key not in ('ai_generation') then
    raise exception 'unsupported usage key';
  end if;

  if p_limit is not null and p_limit < 1 then
    raise exception 'usage limit must be positive';
  end if;

  insert into public.gamibar_usage_counters as counters (
    author_id,
    usage_key,
    period_start,
    usage_count
  )
  values (p_author_id, p_usage_key, p_period_start, 1)
  on conflict (author_id, usage_key, period_start)
  do update
  set
    usage_count = counters.usage_count + 1,
    updated_at = now()
  where p_limit is null or counters.usage_count < p_limit
  returning usage_count into consumed;

  return consumed;
end;
$$;

revoke execute on function public.gamibar_consume_usage(uuid, text, date, integer)
  from public, anon, authenticated;
grant execute on function public.gamibar_consume_usage(uuid, text, date, integer)
  to service_role;

create trigger gamibar_billing_profiles_set_updated_at
  before update on public.gamibar_billing_profiles
  for each row execute function private.set_updated_at();

create trigger gamibar_subscriptions_set_updated_at
  before update on public.gamibar_subscriptions
  for each row execute function private.set_updated_at();

create trigger gamibar_payment_orders_set_updated_at
  before update on public.gamibar_payment_orders
  for each row execute function private.set_updated_at();

create trigger gamibar_entitlements_set_updated_at
  before update on public.gamibar_entitlements
  for each row execute function private.set_updated_at();

create trigger gamibar_refund_requests_set_updated_at
  before update on public.gamibar_refund_requests
  for each row execute function private.set_updated_at();

create trigger gamibar_payment_events_set_updated_at
  before update on public.gamibar_payment_events
  for each row execute function private.set_updated_at();

alter table public.gamibar_billing_profiles enable row level security;
alter table public.gamibar_subscriptions enable row level security;
alter table public.gamibar_payment_orders enable row level security;
alter table public.gamibar_entitlements enable row level security;
alter table public.gamibar_refund_requests enable row level security;
alter table public.gamibar_payment_events enable row level security;
alter table public.gamibar_usage_counters enable row level security;

alter table public.gamibar_billing_profiles force row level security;
alter table public.gamibar_subscriptions force row level security;
alter table public.gamibar_payment_orders force row level security;
alter table public.gamibar_entitlements force row level security;
alter table public.gamibar_refund_requests force row level security;
alter table public.gamibar_payment_events force row level security;
alter table public.gamibar_usage_counters force row level security;

revoke all privileges on table public.gamibar_billing_profiles from anon, authenticated;
revoke all privileges on table public.gamibar_subscriptions from anon, authenticated;
revoke all privileges on table public.gamibar_payment_orders from anon, authenticated;
revoke all privileges on table public.gamibar_entitlements from anon, authenticated;
revoke all privileges on table public.gamibar_refund_requests from anon, authenticated;
revoke all privileges on table public.gamibar_payment_events from anon, authenticated;
revoke all privileges on table public.gamibar_usage_counters from anon, authenticated;

grant select, insert, update, delete on table public.gamibar_billing_profiles to service_role;
grant select, insert, update, delete on table public.gamibar_subscriptions to service_role;
grant select, insert, update, delete on table public.gamibar_payment_orders to service_role;
grant select, insert, update, delete on table public.gamibar_entitlements to service_role;
grant select, insert, update, delete on table public.gamibar_refund_requests to service_role;
grant select, insert, update, delete on table public.gamibar_payment_events to service_role;
grant select, insert, update, delete on table public.gamibar_usage_counters to service_role;

grant usage, select on all sequences in schema public to service_role;
