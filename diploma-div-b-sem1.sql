-- Source: DIPLOMA_DIV_B_SEM_I_14_09_2026.pdf (w.e.f. 3.8.2026, Rev-2A)
-- Diploma Year 1 is common across all 4 specialisations, so
-- specialisation is left NULL here — not "unknown", genuinely shared.
-- batch = NULL means the whole division is in that room together;
-- 'B1' / 'B2' means the division split for that slot.
--
-- Excluded (not inserted, per the room-type + building + break rules):
--   Library hour, Break, Phy Lab / Chem Lab / BEE Lab / F.C WS (SBMP
--   building, no CR/CL/TR/CC code).

insert into room_slots
  (room, floor, day, slot_index, status, branch, specialisation, semester, division, batch)
values
  -- Monday
  ('CR-108', '1', 'Mon', 1, 'busy', 'diploma', null, 1, 'B', null),  -- 9-10, Chem, whole div
  ('CL-102', '1', 'Mon', 2, 'busy', 'diploma', null, 1, 'B', 'B1'),  -- 10-11, CS, B1 (Comp Lab-2)
  ('CL-102', '1', 'Mon', 3, 'busy', 'diploma', null, 1, 'B', 'B1'),  -- 11-12, same 2hr block
  ('TR-401', '4', 'Mon', 5, 'busy', 'diploma', null, 1, 'B', null),  -- 1-2, CP, whole div
  ('CR-403', '4', 'Mon', 7, 'busy', 'diploma', null, 1, 'B', null),  -- 3-4, CP, whole div
  ('CR-403', '4', 'Mon', 8, 'busy', 'diploma', null, 1, 'B', null),  -- 4-5, Math, whole div

  -- Tuesday
  ('CR-108', '1', 'Tue', 6, 'busy', 'diploma', null, 1, 'B', null),  -- 2-3, CS, whole div
  ('CR-403', '4', 'Tue', 7, 'busy', 'diploma', null, 1, 'B', null),  -- 3-4, Math, whole div
  ('CL-102', '1', 'Tue', 8, 'busy', 'diploma', null, 1, 'B', 'B2'),  -- 4-5, CS, B2 (Comp Lab-2)

  -- Wednesday
  ('CL-705', '7', 'Wed', 1, 'busy', 'diploma', null, 1, 'B', 'B1'),  -- 9-10, ED, B1
  ('CL-408', '4', 'Wed', 1, 'busy', 'diploma', null, 1, 'B', 'B2'),  -- 9-10, CP, B2 (same hour, different room)
  ('CR-603', '6', 'Wed', 4, 'busy', 'diploma', null, 1, 'B', null),  -- 12-1, Chem, whole div

  -- Thursday
  ('CL-408', '4', 'Thu', 2, 'busy', 'diploma', null, 1, 'B', 'B1'),  -- 10-11, CP, B1 (2hr block)
  ('CL-408', '4', 'Thu', 3, 'busy', 'diploma', null, 1, 'B', 'B1'),  -- 11-12, same block
  ('CR-503', '5', 'Thu', 4, 'busy', 'diploma', null, 1, 'B', null),  -- 12-1, Phy, whole div
  ('CL-102', '1', 'Thu', 7, 'busy', 'diploma', null, 1, 'B', 'B1'),  -- 3-4, Math Tut, B1
  ('CL-102', '1', 'Thu', 8, 'busy', 'diploma', null, 1, 'B', 'B1'),  -- 4-5, Math Tut, B1

  -- Friday
  ('CR-403', '4', 'Fri', 2, 'busy', 'diploma', null, 1, 'B', null),  -- 10-11, Math, whole div (2hr block)
  ('CR-403', '4', 'Fri', 3, 'busy', 'diploma', null, 1, 'B', null),  -- 11-12, same block
  ('CR-403', '4', 'Fri', 6, 'busy', 'diploma', null, 1, 'B', null),  -- 2-3, Phy, whole div
  ('CR-403', '4', 'Fri', 7, 'busy', 'diploma', null, 1, 'B', 'B2'),  -- 3-4, Math Tut, B2
  ('CR-101', '1', 'Fri', 7, 'busy', 'diploma', null, 1, 'B', 'B1'),  -- 3-4, Phys Tut, B1
  ('CR-403', '4', 'Fri', 8, 'busy', 'diploma', null, 1, 'B', null),  -- 4-5, ED, whole div (2hr block)
  ('CR-403', '4', 'Fri', 9, 'busy', 'diploma', null, 1, 'B', null)   -- 5-6, same block

on conflict do nothing;
