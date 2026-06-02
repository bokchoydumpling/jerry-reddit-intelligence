-- ============================================================
-- Jerry Reddit Intelligence — Initial Schema
-- ============================================================

-- PROFILES
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- KEYWORDS
create table if not exists keywords (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  term text not null,
  is_brand boolean default false,
  active boolean default true,
  created_at timestamptz default now() not null
);

-- COMPETITORS
create table if not exists competitors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  name text not null,
  keywords text[] default '{}',
  color text default '#64748b',
  active boolean default true,
  created_at timestamptz default now() not null
);

-- REDDIT AUTHORS
create table if not exists reddit_authors (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  karma integer,
  account_age_days integer,
  is_verified boolean default false,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- REDDIT THREADS
create table if not exists reddit_threads (
  id uuid primary key default gen_random_uuid(),
  reddit_id text unique not null,
  subreddit text not null,
  title text not null,
  url text not null,
  author_username text,
  score integer default 0,
  num_comments integer default 0,
  created_at timestamptz default now() not null,
  fetched_at timestamptz default now() not null
);

-- REDDIT MENTIONS
create table if not exists reddit_mentions (
  id uuid primary key default gen_random_uuid(),
  reddit_id text unique not null,
  thread_id uuid references reddit_threads(id) on delete cascade,
  author_id uuid references reddit_authors(id),
  user_id uuid references profiles(id) on delete cascade,
  keyword_id uuid references keywords(id),
  subreddit text not null,
  title text,
  body text not null,
  url text not null,
  score integer default 0,
  is_post boolean default false,
  created_at timestamptz default now() not null,
  fetched_at timestamptz default now() not null
);

create index if not exists reddit_mentions_subreddit_idx on reddit_mentions(subreddit);
create index if not exists reddit_mentions_created_at_idx on reddit_mentions(created_at desc);
create index if not exists reddit_mentions_user_id_idx on reddit_mentions(user_id);

-- ANALYSES
create table if not exists analyses (
  id uuid primary key default gen_random_uuid(),
  mention_id uuid references reddit_mentions(id) on delete cascade unique,
  sentiment text check (sentiment in ('positive','neutral','negative','mixed')),
  sentiment_score float,
  sarcasm boolean default false,
  sarcasm_confidence float,
  intent text check (intent in ('complaint','question','recommendation','comparison','praise','trust-question','general')),
  urgency integer check (urgency between 1 and 5),
  trust_impact text check (trust_impact in ('positive','neutral','negative')),
  priority_score integer check (priority_score between 0 and 100),
  team_owner text check (team_owner in ('support','marketing','product','leadership','none')),
  recommended_action text check (recommended_action in ('respond','monitor','escalate','ignore')),
  raw_output jsonb,
  model_used text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index if not exists analyses_priority_score_idx on analyses(priority_score desc);
create index if not exists analyses_recommended_action_idx on analyses(recommended_action);
create index if not exists analyses_sentiment_idx on analyses(sentiment);

-- RESPONSE SUGGESTIONS
create table if not exists response_suggestions (
  id uuid primary key default gen_random_uuid(),
  mention_id uuid references reddit_mentions(id) on delete cascade,
  analysis_id uuid references analyses(id),
  body text not null,
  tone text check (tone in ('professional','empathetic','casual')) default 'professional',
  version integer default 1,
  is_active boolean default true,
  model_used text,
  created_at timestamptz default now() not null
);

-- STATUSES (track actioned/dismissed)
create table if not exists statuses (
  id uuid primary key default gen_random_uuid(),
  mention_id uuid references reddit_mentions(id) on delete cascade unique,
  user_id uuid references profiles(id),
  status text check (status in ('pending','actioned','dismissed','escalated')) default 'pending',
  note text,
  updated_at timestamptz default now() not null
);

-- ALERTS
create table if not exists alerts (
  id uuid primary key default gen_random_uuid(),
  mention_id uuid references reddit_mentions(id) on delete cascade,
  type text check (type in ('high_priority','trust_question','competitor_spike','volume_spike')) not null,
  channel text check (channel in ('slack','email','in_app')) default 'slack',
  sent_at timestamptz default now() not null,
  payload jsonb
);

create unique index if not exists alerts_mention_channel_idx on alerts(mention_id, channel);

-- REPORTS
create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  type text check (type in ('weekly','monthly','custom')) default 'weekly',
  period_start date not null,
  period_end date not null,
  summary text,
  data jsonb,
  model_used text,
  created_at timestamptz default now() not null
);

-- METRIC SNAPSHOTS
create table if not exists metric_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  date date not null,
  total_mentions integer default 0,
  positive_count integer default 0,
  neutral_count integer default 0,
  negative_count integer default 0,
  avg_priority_score float,
  high_priority_count integer default 0,
  trust_question_count integer default 0,
  created_at timestamptz default now() not null,
  unique(user_id, date)
);

-- TRUST METRICS
create table if not exists trust_metrics (
  id uuid primary key default gen_random_uuid(),
  mention_id uuid references reddit_mentions(id) on delete cascade,
  question_text text,
  theme text,
  resolved boolean default false,
  resolved_at timestamptz,
  created_at timestamptz default now() not null
);

-- SHARE OF VOICE METRICS
create table if not exists share_of_voice_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  entity_name text not null,
  is_brand boolean default false,
  date date not null,
  subreddit text,
  mention_count integer default 0,
  created_at timestamptz default now() not null
);

create index if not exists sov_date_entity_idx on share_of_voice_metrics(date desc, entity_name);

-- RECOMMENDATION METRICS
create table if not exists recommendation_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  entity_name text not null,
  date date not null,
  subreddit text,
  recommendation_count integer default 0,
  created_at timestamptz default now() not null
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table profiles enable row level security;
alter table keywords enable row level security;
alter table competitors enable row level security;
alter table reddit_mentions enable row level security;
alter table reddit_threads enable row level security;
alter table reddit_authors enable row level security;
alter table analyses enable row level security;
alter table response_suggestions enable row level security;
alter table statuses enable row level security;
alter table alerts enable row level security;
alter table reports enable row level security;
alter table metric_snapshots enable row level security;
alter table trust_metrics enable row level security;
alter table share_of_voice_metrics enable row level security;
alter table recommendation_metrics enable row level security;

-- Profiles: own row only
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- Keywords
create policy "Users manage own keywords" on keywords for all using (auth.uid() = user_id);

-- Competitors
create policy "Users manage own competitors" on competitors for all using (auth.uid() = user_id);

-- Reddit threads: readable by all authenticated
create policy "Authenticated can read threads" on reddit_threads for select using (auth.role() = 'authenticated');
create policy "Service role can write threads" on reddit_threads for insert with check (true);
create policy "Service role can update threads" on reddit_threads for update using (true);

-- Reddit authors: readable by all authenticated
create policy "Authenticated can read authors" on reddit_authors for select using (auth.role() = 'authenticated');
create policy "Service role can write authors" on reddit_authors for insert with check (true);

-- Reddit mentions
create policy "Users see own mentions" on reddit_mentions for select using (auth.uid() = user_id);
create policy "Service role insert mentions" on reddit_mentions for insert with check (true);

-- Analyses: join through mentions
create policy "Users see own analyses" on analyses for select
  using (exists (select 1 from reddit_mentions m where m.id = analyses.mention_id and m.user_id = auth.uid()));
create policy "Service role write analyses" on analyses for insert with check (true);
create policy "Service role update analyses" on analyses for update using (true);

-- Response suggestions
create policy "Users see own responses" on response_suggestions for select
  using (exists (select 1 from reddit_mentions m where m.id = response_suggestions.mention_id and m.user_id = auth.uid()));
create policy "Service role write responses" on response_suggestions for insert with check (true);

-- Statuses
create policy "Users manage own statuses" on statuses for all using (auth.uid() = user_id);
create policy "Service role write statuses" on statuses for insert with check (true);

-- Alerts
create policy "Service role write alerts" on alerts for insert with check (true);
create policy "Users read own alerts" on alerts for select
  using (exists (select 1 from reddit_mentions m where m.id = alerts.mention_id and m.user_id = auth.uid()));

-- Reports
create policy "Users manage own reports" on reports for all using (auth.uid() = user_id);

-- Metric snapshots
create policy "Users see own snapshots" on metric_snapshots for all using (auth.uid() = user_id);
create policy "Service role write snapshots" on metric_snapshots for insert with check (true);

-- Trust metrics
create policy "Users see own trust metrics" on trust_metrics for select
  using (exists (select 1 from reddit_mentions m where m.id = trust_metrics.mention_id and m.user_id = auth.uid()));
create policy "Service role write trust" on trust_metrics for insert with check (true);

-- Share of voice
create policy "Users see own SOV" on share_of_voice_metrics for all using (auth.uid() = user_id);
create policy "Service role write SOV" on share_of_voice_metrics for insert with check (true);

-- Recommendation metrics
create policy "Users see own rec metrics" on recommendation_metrics for all using (auth.uid() = user_id);
create policy "Service role write rec" on recommendation_metrics for insert with check (true);
