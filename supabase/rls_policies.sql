-- Enable Row Level Security for exercise tracker tables
alter table public.workout_logs enable row level security;
alter table public.routines enable row level security;

-- Optional hardening: remove any broad existing policies before recreating strict owner-only ones
-- drop policy if exists "Users can view their own workout logs" on public.workout_logs;
-- drop policy if exists "Users can insert their own workout logs" on public.workout_logs;
-- drop policy if exists "Users can update their own workout logs" on public.workout_logs;
-- drop policy if exists "Users can delete their own workout logs" on public.workout_logs;
-- drop policy if exists "Users can view their own routines" on public.routines;
-- drop policy if exists "Users can insert their own routines" on public.routines;
-- drop policy if exists "Users can update their own routines" on public.routines;
-- drop policy if exists "Users can delete their own routines" on public.routines;

create policy "Users can view their own workout logs"
on public.workout_logs
for select
using (auth.uid() = user_id);

create policy "Users can insert their own workout logs"
on public.workout_logs
for insert
with check (auth.uid() = user_id);

create policy "Users can update their own workout logs"
on public.workout_logs
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own workout logs"
on public.workout_logs
for delete
using (auth.uid() = user_id);

create policy "Users can view their own routines"
on public.routines
for select
using (auth.uid() = user_id);

create policy "Users can insert their own routines"
on public.routines
for insert
with check (auth.uid() = user_id);

create policy "Users can update their own routines"
on public.routines
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own routines"
on public.routines
for delete
using (auth.uid() = user_id);
