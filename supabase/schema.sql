-- =============================================================
-- Lojalumas: multi-tenant digital stamp card — Supabase schema
-- Run this in the Supabase SQL editor (Dashboard -> SQL Editor).
-- =============================================================

create extension if not exists pgcrypto;

-- ---------- Tenants (one row per business) ----------
create table if not exists tenants (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,            -- url path, e.g. 'coffeebox'
  business_name text not null,
  logo_url      text,
  primary_color text not null default '#1f2937', -- hex
  stamps_needed int  not null default 10,
  reward_text   text not null default 'Nemokama prekė',
  pin_hash      text not null,                   -- bcrypt hash, NEVER exposed
  created_at    timestamptz not null default now()
);

-- ---------- Cards (one row per customer phone per tenant) ----------
create table if not exists cards (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references tenants(id) on delete cascade,
  stamps         int  not null default 0,
  redeemed_count int  not null default 0,
  created_at     timestamptz not null default now(),
  last_stamp_at  timestamptz
);

-- ---------- PIN attempt log (brute-force protection) ----------
create table if not exists pin_attempts (
  id         bigint generated always as identity primary key,
  card_id    uuid not null,
  success    boolean not null,
  created_at timestamptz not null default now()
);

-- ---------- Row Level Security ----------
alter table tenants      enable row level security;
alter table cards        enable row level security;
alter table pin_attempts enable row level security;

-- Tenants: NO direct access for anon. Public data is exposed only
-- through the view below, which excludes pin_hash.
create or replace view tenant_public
with (security_invoker = off) as
  select slug, business_name, logo_url, primary_color,
         stamps_needed, reward_text
  from tenants;

grant select on tenant_public to anon;

-- Cards: a customer may read/create their own card. Knowing the
-- random uuid (kept in the phone's localStorage) is the credential.
create policy "anon can read a card by id"
  on cards for select to anon using (true);

create policy "anon can create a card"
  on cards for insert to anon
  with check (stamps = 0 and redeemed_count = 0);

-- No UPDATE policy on cards: stamps can ONLY change through the
-- SECURITY DEFINER functions below, never directly from the client.

-- ---------- Helper: brute-force gate ----------
-- Max 5 failed PIN entries per card per 10 minutes.
create or replace function pin_rate_limited(p_card uuid)
returns boolean language sql security definer set search_path = public as $$
  select count(*) >= 5
  from pin_attempts
  where card_id = p_card
    and success = false
    and created_at > now() - interval '10 minutes';
$$;

-- ---------- RPC: add_stamp ----------
-- Called from the customer's phone. The CASHIER types the PIN.
create or replace function add_stamp(p_slug text, p_card uuid, p_pin text)
returns json language plpgsql security definer set search_path = public as $$
declare
  t tenants%rowtype;
  c cards%rowtype;
begin
  select * into t from tenants where slug = p_slug;
  if not found then return json_build_object('ok', false, 'error', 'unknown_tenant'); end if;

  select * into c from cards where id = p_card and tenant_id = t.id;
  if not found then return json_build_object('ok', false, 'error', 'unknown_card'); end if;

  if pin_rate_limited(p_card) then
    return json_build_object('ok', false, 'error', 'rate_limited');
  end if;

  if crypt(p_pin, t.pin_hash) <> t.pin_hash then
    insert into pin_attempts (card_id, success) values (p_card, false);
    return json_build_object('ok', false, 'error', 'bad_pin');
  end if;

  -- Optional anti-abuse: minimum 60s between stamps on the same card.
  if c.last_stamp_at is not null and c.last_stamp_at > now() - interval '60 seconds' then
    return json_build_object('ok', false, 'error', 'too_fast');
  end if;

  insert into pin_attempts (card_id, success) values (p_card, true);

  update cards
     set stamps = least(stamps + 1, t.stamps_needed),
         last_stamp_at = now()
   where id = p_card
   returning * into c;

  return json_build_object('ok', true, 'stamps', c.stamps,
                           'full', c.stamps >= t.stamps_needed);
end;
$$;

-- ---------- RPC: redeem_reward ----------
-- Cashier enters PIN again to hand out the reward; card resets to 0.
create or replace function redeem_reward(p_slug text, p_card uuid, p_pin text)
returns json language plpgsql security definer set search_path = public as $$
declare
  t tenants%rowtype;
  c cards%rowtype;
begin
  select * into t from tenants where slug = p_slug;
  if not found then return json_build_object('ok', false, 'error', 'unknown_tenant'); end if;

  select * into c from cards where id = p_card and tenant_id = t.id;
  if not found then return json_build_object('ok', false, 'error', 'unknown_card'); end if;

  if pin_rate_limited(p_card) then
    return json_build_object('ok', false, 'error', 'rate_limited');
  end if;

  if crypt(p_pin, t.pin_hash) <> t.pin_hash then
    insert into pin_attempts (card_id, success) values (p_card, false);
    return json_build_object('ok', false, 'error', 'bad_pin');
  end if;

  if c.stamps < t.stamps_needed then
    return json_build_object('ok', false, 'error', 'card_not_full');
  end if;

  insert into pin_attempts (card_id, success) values (p_card, true);

  update cards
     set stamps = 0, redeemed_count = redeemed_count + 1
   where id = p_card;

  return json_build_object('ok', true);
end;
$$;

grant execute on function add_stamp(text, uuid, text)     to anon;
grant execute on function redeem_reward(text, uuid, text) to anon;

-- =============================================================
-- Onboarding a NEW business = ONE insert. Example:
-- =============================================================
-- insert into tenants (slug, business_name, logo_url, primary_color,
--                      stamps_needed, reward_text, pin_hash)
-- values ('coffeebox', 'Coffee Box Kaunas',
--         'https://your-storage/coffeebox.png', '#FF5733',
--         10, 'Nemokamas didelis kapučinas',
--         crypt('4482', gen_salt('bf')));   -- bcrypt-hash the PIN
