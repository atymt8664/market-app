alter table categories
  add column if not exists is_hidden boolean not null default false;

alter table subcategories
  add column if not exists sort_order integer not null default 0;

alter table subcategories
  add column if not exists is_hidden boolean not null default false;
