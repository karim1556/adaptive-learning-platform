-- Migration: create polls and poll_responses tables
-- Run this in your Supabase SQL editor

create table if not exists polls (
  id text primary key,
  teacher_id text not null,
  class_id text not null,
  title text not null,
  question text not null,
  type text not null,
  options jsonb,
  scale_min int,
  scale_max int,
  is_anonymous boolean default true,
  is_active boolean default true,
  created_at timestamptz default now(),
  closed_at timestamptz
);

create table if not exists poll_responses (
  id text primary key,
  poll_id text references polls(id) on delete cascade,
  student_id text not null,
  student_name text,
  response text,
  submitted_at timestamptz default now()
);

create index if not exists idx_polls_class on polls(class_id);
create index if not exists idx_polls_teacher on polls(teacher_id);
create index if not exists idx_responses_poll on poll_responses(poll_id);

-- Optionally disable RLS for quick testing (enable/adjust based on your security model)
-- alter table polls disable row level security;
-- alter table poll_responses disable row level security;
