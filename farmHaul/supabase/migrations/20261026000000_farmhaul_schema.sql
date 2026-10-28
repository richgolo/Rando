-- =====================================================================
-- FarmHaul database: tables, security rules, and state-change functions
-- Paste this whole file into Supabase > SQL Editor and click "Run".
-- Explained step by step in docs/02-database-and-security.md
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Types (fixed lists of allowed values)
-- ---------------------------------------------------------------------
create type public.user_role as enum ('farmer', 'transporter');

-- One status list shared by requests and jobs:
-- OPEN -> ASSIGNED -> PICKED_UP -> DELIVERED -> CONFIRMED, or CANCELLED
create type public.trip_status as enum (
  'OPEN', 'ASSIGNED', 'PICKED_UP', 'DELIVERED', 'CONFIRMED', 'CANCELLED'
);

create type public.offer_status as enum ('ACTIVE', 'WITHDRAWN', 'ACCEPTED', 'DECLINED');


-- ---------------------------------------------------------------------
-- 2. Tables
-- ---------------------------------------------------------------------

-- One profile per signed-up user. Created automatically by a trigger
-- (section 4) from the details entered on the sign-up form.
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  role       public.user_role not null,
  full_name  text not null check (char_length(trim(full_name)) between 2 and 80),
  phone      text not null check (phone ~ '^\+?[0-9 ]{9,16}$'),
  area       text not null check (char_length(trim(area)) > 0),
  created_at timestamptz not null default now()
);

-- Units are placeholders until research confirms what people actually use.
-- To change them, edit this list here AND in src/lib/constants.js.
create table public.vehicles (
  id              uuid primary key default gen_random_uuid(),
  transporter_id  uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  vehicle_type    text not null check (char_length(trim(vehicle_type)) > 0),
  capacity_amount numeric not null check (capacity_amount > 0),
  capacity_unit   text not null check (capacity_unit in ('crates', 'bags', 'kg', 'tonnes')),
  plate_or_label  text not null check (char_length(trim(plate_or_label)) > 0),
  active          boolean not null default true,
  created_at      timestamptz not null default now()
);

create table public.requests (
  id                   uuid primary key default gen_random_uuid(),
  farmer_id            uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  produce              text not null check (char_length(trim(produce)) > 0),
  quantity             numeric not null check (quantity > 0),
  unit                 text not null check (unit in ('crates', 'bags', 'kg', 'tonnes')),
  pickup_area          text not null check (char_length(trim(pickup_area)) > 0),
  pickup_landmark      text not null check (char_length(trim(pickup_landmark)) > 0),
  destination_area     text not null check (char_length(trim(destination_area)) > 0),
  destination_landmark text not null check (char_length(trim(destination_landmark)) > 0),
  pickup_date          date not null,
  notes                text check (char_length(notes) <= 500),
  status               public.trip_status not null default 'OPEN',
  cancel_reason        text,
  created_at           timestamptz not null default now()
);

create table public.offers (
  id             uuid primary key default gen_random_uuid(),
  request_id     uuid not null references public.requests (id) on delete cascade,
  transporter_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  vehicle_id     uuid not null references public.vehicles (id),
  price_ghs      numeric(10, 2) not null check (price_ghs > 0),
  message        text check (char_length(message) <= 500),
  status         public.offer_status not null default 'ACTIVE',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- A transporter can have only ONE live offer per request.
-- (Withdrawn/declined offers don't count, so they can offer again after withdrawing.)
create unique index offers_one_live_per_transporter
  on public.offers (request_id, transporter_id)
  where status in ('ACTIVE', 'ACCEPTED');

-- Exactly one job per request and per winning offer (the UNIQUE keywords).
-- The transporter and price are read from the accepted offer, not copied here.
create table public.jobs (
  id                uuid primary key default gen_random_uuid(),
  request_id        uuid not null unique references public.requests (id) on delete cascade,
  accepted_offer_id uuid not null unique references public.offers (id),
  status            public.trip_status not null default 'ASSIGNED',
  picked_up_at      timestamptz,
  delivered_at      timestamptz,
  confirmed_at      timestamptz,
  cancelled_at      timestamptz,
  created_at        timestamptz not null default now()
);

-- History log: one row for every status change, with who did it and when.
create table public.status_events (
  id          bigint generated always as identity primary key,
  request_id  uuid not null references public.requests (id) on delete cascade,
  job_id      uuid references public.jobs (id) on delete cascade,
  actor_id    uuid not null references public.profiles (id),
  from_status public.trip_status,
  to_status   public.trip_status not null,
  note        text,
  created_at  timestamptz not null default now()
);

-- Indexes so the common lookups stay fast
create index requests_status_date_idx on public.requests (status, pickup_date);
create index requests_farmer_idx      on public.requests (farmer_id);
create index offers_request_idx       on public.offers (request_id);
create index offers_transporter_idx   on public.offers (transporter_id);
create index vehicles_transporter_idx on public.vehicles (transporter_id);
create index status_events_request_idx on public.status_events (request_id);


-- ---------------------------------------------------------------------
-- 3. Helper functions used by the security rules
-- "security definer" lets them look across tables without triggering
-- the security rules again (which would loop forever).
-- ---------------------------------------------------------------------

create function public.my_role()
returns public.user_role
language sql stable security definer set search_path = public
as $$
  select role from profiles where id = auth.uid()
$$;

-- Is the current user the transporter whose offer won this request?
create function public.is_assigned_transporter(p_request_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from jobs j
    join offers o on o.id = j.accepted_offer_id
    where j.request_id = p_request_id and o.transporter_id = auth.uid()
  )
$$;

-- Is the current user the farmer who posted this request?
create function public.is_request_farmer(p_request_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from requests where id = p_request_id and farmer_id = auth.uid())
$$;

-- Has the current user made any offer on this request?
create function public.has_offered_on(p_request_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from offers where request_id = p_request_id and transporter_id = auth.uid()
  )
$$;

create function public.request_is_open(p_request_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from requests where id = p_request_id and status = 'OPEN')
$$;

-- Who may see a profile (name + phone)?
--  * yourself
--  * a farmer may see transporters who sent offers on the farmer's requests
--  * after an offer is accepted, the farmer and transporter see each other
-- A transporter can NOT see a farmer's phone before being chosen.
create function public.can_view_profile(p_profile_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select p_profile_id = auth.uid()
  or exists (
    select 1 from offers o
    join requests r on r.id = o.request_id
    where o.transporter_id = p_profile_id and r.farmer_id = auth.uid()
  )
  or exists (
    select 1 from jobs j
    join offers o   on o.id = j.accepted_offer_id
    join requests r on r.id = j.request_id
    where o.transporter_id = auth.uid() and r.farmer_id = p_profile_id
  )
$$;

-- May a farmer see this vehicle? Yes if it was used in an offer on their request.
-- (Owners are allowed directly in the vehicles policy.)
create function public.can_view_vehicle(p_vehicle_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from offers o
    join requests r on r.id = o.request_id
    where o.vehicle_id = p_vehicle_id and r.farmer_id = auth.uid()
  )
$$;

create function public.owns_active_vehicle(p_vehicle_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from vehicles
    where id = p_vehicle_id and transporter_id = auth.uid() and active
  )
$$;


-- ---------------------------------------------------------------------
-- 4. Triggers (code that runs automatically when rows change)
-- ---------------------------------------------------------------------

-- When someone signs up, create their profile from the sign-up form data.
create function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name, phone, area)
  values (
    new.id,
    (new.raw_user_meta_data ->> 'role')::public.user_role,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'phone',
    new.raw_user_meta_data ->> 'area'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- New requests must not have a pickup date in the past.
-- (Done in a trigger, not a CHECK, so old requests stay valid after their date passes.)
create function public.validate_new_request()
returns trigger
language plpgsql
as $$
begin
  if new.pickup_date < current_date then
    raise exception 'Pickup date cannot be in the past';
  end if;
  return new;
end;
$$;

create trigger requests_validate_insert
  before insert on public.requests
  for each row execute function public.validate_new_request();

-- Log the first history event ("request posted") automatically.
create function public.log_request_created()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into status_events (request_id, actor_id, from_status, to_status, note)
  values (new.id, new.farmer_id, null, 'OPEN', 'Request posted');
  return new;
end;
$$;

create trigger requests_log_insert
  after insert on public.requests
  for each row execute function public.log_request_created();

-- Keep offers.updated_at current when a transporter edits a quote.
create function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger offers_touch_updated_at
  before update on public.offers
  for each row execute function public.touch_updated_at();


-- ---------------------------------------------------------------------
-- 5. Row-level security (RLS): who can read/write which rows
-- With RLS on, a table returns NOTHING unless a policy allows it.
-- ---------------------------------------------------------------------
alter table public.profiles      enable row level security;
alter table public.vehicles      enable row level security;
alter table public.requests      enable row level security;
alter table public.offers        enable row level security;
alter table public.jobs          enable row level security;
alter table public.status_events enable row level security;

-- Table/column permissions: start from nothing, then grant only what's needed.
-- Signed-out visitors (anon) get no access at all.
revoke all on public.profiles, public.vehicles, public.requests,
              public.offers, public.jobs, public.status_events
  from anon, authenticated;

grant select on public.profiles, public.vehicles, public.requests,
                public.offers, public.jobs, public.status_events
  to authenticated;

-- Only these columns can ever be written from the app. Status columns on
-- requests and jobs are NOT here: they change only through the functions below.
grant update (full_name, phone, area) on public.profiles to authenticated;
grant insert (vehicle_type, capacity_amount, capacity_unit, plate_or_label, active)
  on public.vehicles to authenticated;
grant update (vehicle_type, capacity_amount, capacity_unit, plate_or_label, active)
  on public.vehicles to authenticated;
grant insert (produce, quantity, unit, pickup_area, pickup_landmark,
              destination_area, destination_landmark, pickup_date, notes)
  on public.requests to authenticated;
grant insert (request_id, vehicle_id, price_ghs, message) on public.offers to authenticated;
grant update (vehicle_id, price_ghs, message, status)     on public.offers to authenticated;
-- jobs and status_events: no insert/update grants at all.

-- profiles
create policy "profiles: read allowed profiles" on public.profiles
  for select to authenticated using (public.can_view_profile(id));
create policy "profiles: edit own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- vehicles
create policy "vehicles: read allowed" on public.vehicles
  for select to authenticated
  using (transporter_id = auth.uid() or public.can_view_vehicle(id));
create policy "vehicles: transporter adds own" on public.vehicles
  for insert to authenticated
  with check (transporter_id = auth.uid() and public.my_role() = 'transporter');
create policy "vehicles: transporter edits own" on public.vehicles
  for update to authenticated
  using (transporter_id = auth.uid()) with check (transporter_id = auth.uid());

-- requests
create policy "requests: farmer reads own" on public.requests
  for select to authenticated using (farmer_id = auth.uid());
create policy "requests: transporters read open ones" on public.requests
  for select to authenticated
  using (status = 'OPEN' and public.my_role() = 'transporter');
create policy "requests: transporter reads ones they offered on" on public.requests
  for select to authenticated using (public.has_offered_on(id));
create policy "requests: farmer creates" on public.requests
  for insert to authenticated
  with check (farmer_id = auth.uid() and status = 'OPEN' and public.my_role() = 'farmer');

-- offers
create policy "offers: transporter reads own" on public.offers
  for select to authenticated using (transporter_id = auth.uid());
create policy "offers: farmer reads offers on own requests" on public.offers
  for select to authenticated using (public.is_request_farmer(request_id));
create policy "offers: transporter creates on open request" on public.offers
  for insert to authenticated
  with check (
    transporter_id = auth.uid()
    and status = 'ACTIVE'
    and public.my_role() = 'transporter'
    and public.request_is_open(request_id)
    and public.owns_active_vehicle(vehicle_id)
  );
-- Edit or withdraw: only your own ACTIVE offer, only while the request is OPEN,
-- and you can only set the status to ACTIVE or WITHDRAWN (never ACCEPTED).
create policy "offers: transporter edits or withdraws own" on public.offers
  for update to authenticated
  using (transporter_id = auth.uid() and status = 'ACTIVE' and public.request_is_open(request_id))
  with check (
    transporter_id = auth.uid()
    and status in ('ACTIVE', 'WITHDRAWN')
    and public.owns_active_vehicle(vehicle_id)
  );

-- jobs (read-only from the app; written only by the functions in section 6)
create policy "jobs: participants read" on public.jobs
  for select to authenticated
  using (public.is_request_farmer(request_id) or public.is_assigned_transporter(request_id));

-- status_events (read-only from the app)
create policy "events: participants read" on public.status_events
  for select to authenticated
  using (public.is_request_farmer(request_id) or public.is_assigned_transporter(request_id));


-- ---------------------------------------------------------------------
-- 6. State-change functions (called from the app with supabase.rpc)
-- Each one checks WHO is calling and whether the change is LEGAL,
-- then makes all its changes together in one transaction.
-- ---------------------------------------------------------------------

-- Farmer accepts one offer.
create function public.accept_offer(p_offer_id uuid)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_offer   offers;
  v_request requests;
  v_job_id  uuid;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in';
  end if;

  select * into v_offer from offers where id = p_offer_id;
  if not found then
    raise exception 'Offer not found';
  end if;

  -- Lock the request row. A second "accept" running at the same moment
  -- waits here until the first one finishes, then sees status = ASSIGNED.
  select * into v_request from requests where id = v_offer.request_id for update;

  if v_request.farmer_id <> auth.uid() then
    raise exception 'Only the farmer who posted this request can accept an offer';
  end if;
  if v_request.status <> 'OPEN' then
    raise exception 'This request is no longer open (it is %)', v_request.status;
  end if;

  -- Re-read the offer now that we hold the lock (it may have been withdrawn).
  select * into v_offer from offers where id = p_offer_id for update;
  if v_offer.status <> 'ACTIVE' then
    raise exception 'This offer is no longer available';
  end if;

  update offers set status = 'ACCEPTED' where id = p_offer_id;
  update offers set status = 'DECLINED'
    where request_id = v_request.id and id <> p_offer_id and status = 'ACTIVE';
  update requests set status = 'ASSIGNED' where id = v_request.id;

  insert into jobs (request_id, accepted_offer_id)
  values (v_request.id, p_offer_id)
  returning id into v_job_id;

  insert into status_events (request_id, job_id, actor_id, from_status, to_status, note)
  values (v_request.id, v_job_id, auth.uid(), 'OPEN', 'ASSIGNED',
          'Accepted offer of GHS ' || v_offer.price_ghs);

  return v_job_id;
end;
$$;

-- Move a job forward: transporter marks PICKED_UP then DELIVERED;
-- farmer marks CONFIRMED. Any other move is rejected.
create function public.update_job_status(p_job_id uuid, p_to public.trip_status)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_job         jobs;
  v_farmer      uuid;
  v_transporter uuid;
  v_from        trip_status;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in';
  end if;

  select * into v_job from jobs where id = p_job_id for update;
  if not found then
    raise exception 'Job not found';
  end if;

  select farmer_id into v_farmer from requests where id = v_job.request_id;
  select transporter_id into v_transporter from offers where id = v_job.accepted_offer_id;
  v_from := v_job.status;

  if p_to = 'PICKED_UP' then
    if auth.uid() <> v_transporter then
      raise exception 'Only the assigned transporter can mark the load as picked up';
    end if;
    if v_from <> 'ASSIGNED' then
      raise exception 'Cannot mark picked up: job is %', v_from;
    end if;
    update jobs set status = 'PICKED_UP', picked_up_at = now() where id = p_job_id;

  elsif p_to = 'DELIVERED' then
    if auth.uid() <> v_transporter then
      raise exception 'Only the assigned transporter can mark the load as delivered';
    end if;
    if v_from <> 'PICKED_UP' then
      raise exception 'Cannot mark delivered: job is %', v_from;
    end if;
    update jobs set status = 'DELIVERED', delivered_at = now() where id = p_job_id;

  elsif p_to = 'CONFIRMED' then
    if auth.uid() <> v_farmer then
      raise exception 'Only the farmer can confirm receipt';
    end if;
    if v_from <> 'DELIVERED' then
      raise exception 'Cannot confirm: job is %', v_from;
    end if;
    update jobs set status = 'CONFIRMED', confirmed_at = now() where id = p_job_id;

  else
    raise exception 'Status % cannot be set here', p_to;
  end if;

  -- Keep the request's status in step with its job.
  update requests set status = p_to where id = v_job.request_id;

  insert into status_events (request_id, job_id, actor_id, from_status, to_status)
  values (v_job.request_id, p_job_id, auth.uid(), v_from, p_to);
end;
$$;

-- Cancel a request.
--  * OPEN: only the farmer; any active offers are declined.
--  * ASSIGNED: farmer or assigned transporter, and a reason is required.
--  * After pickup: not allowed (use the support contact instead).
create function public.cancel_request(p_request_id uuid, p_reason text default null)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_request requests;
  v_job_id  uuid;
  v_reason  text := nullif(trim(coalesce(p_reason, '')), '');
begin
  if auth.uid() is null then
    raise exception 'You must be signed in';
  end if;

  select * into v_request from requests where id = p_request_id for update;
  if not found then
    raise exception 'Request not found';
  end if;

  if v_request.status = 'OPEN' then
    if v_request.farmer_id <> auth.uid() then
      raise exception 'Only the farmer can cancel an open request';
    end if;
    update offers set status = 'DECLINED' where request_id = p_request_id and status = 'ACTIVE';

  elsif v_request.status = 'ASSIGNED' then
    if not (v_request.farmer_id = auth.uid() or is_assigned_transporter(p_request_id)) then
      raise exception 'Only the farmer or assigned transporter can cancel this job';
    end if;
    if v_reason is null or char_length(v_reason) < 5 then
      raise exception 'Please give a reason (at least 5 characters) to cancel an assigned job';
    end if;
    update jobs set status = 'CANCELLED', cancelled_at = now()
      where request_id = p_request_id
      returning id into v_job_id;

  else
    raise exception 'A request that is % cannot be cancelled in the app', v_request.status;
  end if;

  update requests set status = 'CANCELLED', cancel_reason = v_reason where id = p_request_id;

  insert into status_events (request_id, job_id, actor_id, from_status, to_status, note)
  values (p_request_id, v_job_id, auth.uid(), v_request.status, 'CANCELLED', v_reason);
end;
$$;

-- The security rules call these helpers as the signed-in user, so grant them
-- explicitly (needed when "Automatically expose new tables" is turned off).
grant execute on function
  public.my_role(), public.is_assigned_transporter(uuid), public.is_request_farmer(uuid),
  public.has_offered_on(uuid), public.request_is_open(uuid), public.can_view_profile(uuid),
  public.can_view_vehicle(uuid), public.owns_active_vehicle(uuid)
  to authenticated;

-- Only signed-in users may call the state-change functions.
revoke execute on function public.accept_offer(uuid) from public, anon;
revoke execute on function public.update_job_status(uuid, public.trip_status) from public, anon;
revoke execute on function public.cancel_request(uuid, text) from public, anon;
grant execute on function public.accept_offer(uuid) to authenticated;
grant execute on function public.update_job_status(uuid, public.trip_status) to authenticated;
grant execute on function public.cancel_request(uuid, text) to authenticated;
