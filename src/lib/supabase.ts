import { createClient } from "@supabase/supabase-js"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""

export const supabase = url && key ? createClient(url, key) : null

/*
SQL for Supabase dashboard:

create table if not exists trades_leads (
  id text primary key,
  status text not null default 'raw',
  trade_type text,
  urgency text,
  estimated_value integer default 75,
  data jsonb not null,
  created_at timestamptz default now()
);
create index if not exists leads_status_idx on trades_leads(status);
create index if not exists leads_trade_type_idx on trades_leads(trade_type);

create table if not exists buyers (
  id text primary key,
  email text not null,
  active boolean default true,
  data jsonb not null,
  created_at timestamptz default now()
);
create index if not exists buyers_email_idx on buyers(email);
*/
