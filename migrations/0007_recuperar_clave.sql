create table if not exists reset_tokens (
  token_hash text primary key,
  email text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists reset_tokens_email_idx on reset_tokens (email);
