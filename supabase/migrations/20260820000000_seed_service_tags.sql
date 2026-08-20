-- Pre-seeds the new tags taxonomy with ProYard's existing service categories
-- (mowing/fertilizer/pestControl/sprinklers) so reps have something to pick
-- from immediately instead of an empty "Add custom tag" list. Colors match
-- serviceConfig in src/types/account.ts. Safe to re-run — label is unique.
insert into tags (label, color) values
  ('Mowing', '#FDD835'),
  ('Fertilizer', '#4CAF50'),
  ('Pest Control', '#FF6F00'),
  ('Sprinklers', '#1E88E5')
on conflict (label) do nothing;
