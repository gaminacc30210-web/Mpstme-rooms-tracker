-- Run this once in the Supabase SQL editor before using the backend.

create table if not exists room_slots (
  id bigint generated always as identity primary key,
  room text not null,
  floor text,                     -- nullable until a real room/floor directory exists
  day text not null,              -- 'Mon'..'Sat'
  slot_index int not null,        -- 0-9, matches the 8am-6pm hourly slots
  status text not null default 'busy', -- only 'busy' is ever written; 'free' is inferred client-side
  branch text not null,
  specialisation text,            -- nullable: common-year programmes (e.g. Diploma Yr 1) have no specialisation yet
  semester int not null,
  division text not null,
  batch text,                     -- nullable: null means the WHOLE division shares this room, not a sub-batch
  submitted_at timestamptz not null default now(),

  -- re-uploading the same batch's timetable updates the existing row
  -- instead of creating a duplicate. coalesce() so two NULL batches
  -- (both "whole division") still collide as the same row, since
  -- Postgres treats NULL <> NULL in a plain unique constraint.
  unique (room, day, slot_index, division, batch)
);

-- A second unique index specifically so whole-division rows (batch is
-- null) still dedupe correctly, since the constraint above lets
-- multiple NULLs through by default.
create unique index if not exists room_slots_whole_division_uidx
  on room_slots (room, day, slot_index, division)
  where batch is null;

-- Row Level Security: block all direct access from the anon/public key.
-- Only the backend, using the service role key, can read or write here.
alter table room_slots enable row level security;
