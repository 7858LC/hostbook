import { createClient } from "@supabase/supabase-js"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""

export const supabase = url && key ? createClient(url, key) : null

/*
SQL to run in Supabase dashboard → SQL Editor:

create table if not exists icps (id text primary key, data jsonb not null);
create table if not exists products (id text primary key, data jsonb not null);
create table if not exists campaigns (id text primary key, data jsonb not null);
create table if not exists leads (
  id text primary key,
  campaign_id text not null,
  status text not null default 'new',
  data jsonb not null
);
create index if not exists leads_campaign_idx on leads(campaign_id);
create index if not exists leads_status_idx on leads(status);
*/
