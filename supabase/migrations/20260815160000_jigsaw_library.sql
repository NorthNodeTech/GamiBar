-- Official GamiBAR educational Jigsaw image library.
-- Categories, subtopics, and image metadata. Binary files live in Storage.

create table if not exists public.jigsaw_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  icon text,
  description text,
  sort_order integer default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.jigsaw_subtopics (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.jigsaw_categories(id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  sort_order integer default 0,
  is_active boolean default true,
  created_at timestamptz default now(),
  unique (category_id, slug)
);

create table if not exists public.jigsaw_library_images (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.jigsaw_categories(id),
  subtopic_id uuid not null references public.jigsaw_subtopics(id),
  title text not null,
  slug text unique not null,
  description text,
  storage_path text not null,
  thumbnail_path text,
  keywords text[] default '{}',
  illustration_type text,
  source text default 'programmatically_generated',
  status text default 'active',
  usage_count integer default 0,
  width integer,
  height integer,
  format text default 'webp',
  file_size_bytes integer,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists jigsaw_subtopics_category_id_idx
  on public.jigsaw_subtopics (category_id);

create index if not exists jigsaw_library_images_category_id_idx
  on public.jigsaw_library_images (category_id);

create index if not exists jigsaw_library_images_subtopic_id_idx
  on public.jigsaw_library_images (subtopic_id);

create index if not exists jigsaw_library_images_status_idx
  on public.jigsaw_library_images (status)
  where status = 'active';

create index if not exists jigsaw_library_images_usage_count_idx
  on public.jigsaw_library_images (usage_count desc);

create index if not exists jigsaw_library_images_created_at_idx
  on public.jigsaw_library_images (created_at desc);

create index if not exists jigsaw_library_images_slug_idx
  on public.jigsaw_library_images (slug);

create index if not exists jigsaw_library_images_keywords_idx
  on public.jigsaw_library_images using gin (keywords);

create index if not exists jigsaw_library_images_search_idx
  on public.jigsaw_library_images
  using gin (
    to_tsvector(
      'simple',
      coalesce(title, '') || ' ' || coalesce(description, '')
    )
  );

create or replace function public.set_jigsaw_library_images_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists jigsaw_library_images_set_updated_at on public.jigsaw_library_images;
create trigger jigsaw_library_images_set_updated_at
  before update on public.jigsaw_library_images
  for each row
  execute function public.set_jigsaw_library_images_updated_at();

-- Increment only after a successful Jigsaw room create. Clients cannot update other columns.
create or replace function public.increment_jigsaw_library_usage(p_image_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.jigsaw_library_images
  set usage_count = usage_count + 1
  where id = p_image_id
    and status = 'active';
end;
$$;

revoke all on function public.increment_jigsaw_library_usage(uuid) from public;
grant execute on function public.increment_jigsaw_library_usage(uuid) to anon, authenticated;

alter table public.jigsaw_categories enable row level security;
alter table public.jigsaw_subtopics enable row level security;
alter table public.jigsaw_library_images enable row level security;

drop policy if exists "jigsaw_categories_select_active" on public.jigsaw_categories;
create policy "jigsaw_categories_select_active"
  on public.jigsaw_categories
  for select
  to anon, authenticated
  using (is_active = true);

drop policy if exists "jigsaw_subtopics_select_active" on public.jigsaw_subtopics;
create policy "jigsaw_subtopics_select_active"
  on public.jigsaw_subtopics
  for select
  to anon, authenticated
  using (is_active = true);

drop policy if exists "jigsaw_library_images_select_active" on public.jigsaw_library_images;
create policy "jigsaw_library_images_select_active"
  on public.jigsaw_library_images
  for select
  to anon, authenticated
  using (status = 'active');

grant select on table public.jigsaw_categories to anon, authenticated;
grant select on table public.jigsaw_subtopics to anon, authenticated;
grant select on table public.jigsaw_library_images to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'jigsaw-library',
  'jigsaw-library',
  true,
  524288,
  array['image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "jigsaw_library_storage_select" on storage.objects;
create policy "jigsaw_library_storage_select"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'jigsaw-library');

insert into public.jigsaw_categories (name, slug, icon, description, sort_order)
values
  ('Geography', 'geography', 'globe', 'World, countries, landmarks, maps, and oceans', 1),
  ('Science', 'science', 'flask-conical', 'Biology, chemistry, physics, experiments, and scientists', 2),
  ('Animals', 'animals', 'paw-print', 'Wild animals, birds, marine life, insects, and farm animals', 3),
  ('Nature', 'nature', 'leaf', 'Forests, mountains, flowers, weather, and ecosystems', 4),
  ('Space', 'space', 'rocket', 'Planets, solar system, galaxies, astronauts, and spacecraft', 5),
  ('History', 'history', 'landmark', 'Civilizations, monuments, events, leaders, and inventions', 6),
  ('Technology', 'technology', 'cpu', 'Computers, robotics, AI, electronics, and the internet', 7),
  ('Human Body', 'human-body', 'heart-pulse', 'Organs, skeleton, brain, cells, and body systems', 8),
  ('Art & Culture', 'art-culture', 'palette', 'Paintings, music, festivals, architecture, and heritage', 9),
  ('Sports', 'sports', 'trophy', 'Football, cricket, basketball, multi-sport, and athletics', 10)
on conflict (slug) do update
set
  name = excluded.name,
  icon = excluded.icon,
  description = excluded.description,
  sort_order = excluded.sort_order,
  is_active = true;

insert into public.jigsaw_subtopics (category_id, name, slug, description, sort_order)
select c.id, v.name, v.slug, v.description, v.sort_order
from (
  values
    ('geography', 'World', 'world', 'Earth and continents', 1),
    ('geography', 'Countries', 'countries', 'Country landscapes', 2),
    ('geography', 'Landmarks', 'landmarks', 'Famous landmarks', 3),
    ('geography', 'Maps', 'maps', 'Illustrated maps', 4),
    ('geography', 'Oceans', 'oceans', 'Ocean scenes', 5),
    ('science', 'Biology', 'biology', 'Cells and living systems', 1),
    ('science', 'Chemistry', 'chemistry', 'Lab and molecules', 2),
    ('science', 'Physics', 'physics', 'Forces and motion', 3),
    ('science', 'Experiments', 'experiments', 'Classroom experiments', 4),
    ('science', 'Scientists', 'scientists', 'People doing science', 5),
    ('animals', 'Wild Animals', 'wild-animals', 'Wildlife', 1),
    ('animals', 'Birds', 'birds', 'Birds', 2),
    ('animals', 'Marine Life', 'marine-life', 'Ocean animals', 3),
    ('animals', 'Insects', 'insects', 'Insects', 4),
    ('animals', 'Farm Animals', 'farm-animals', 'Farm animals', 5),
    ('nature', 'Forests', 'forests', 'Forest scenes', 1),
    ('nature', 'Mountains', 'mountains', 'Mountain landscapes', 2),
    ('nature', 'Flowers', 'flowers', 'Flower scenes', 3),
    ('nature', 'Weather', 'weather', 'Weather scenes', 4),
    ('nature', 'Ecosystems', 'ecosystems', 'Natural habitats', 5),
    ('space', 'Planets', 'planets', 'Planets', 1),
    ('space', 'Solar System', 'solar-system', 'The solar system', 2),
    ('space', 'Galaxies', 'galaxies', 'Galaxies', 3),
    ('space', 'Astronauts', 'astronauts', 'Astronauts', 4),
    ('space', 'Spacecraft', 'spacecraft', 'Rockets and satellites', 5),
    ('history', 'Ancient Civilizations', 'ancient-civilizations', 'Early civilizations', 1),
    ('history', 'Monuments', 'monuments', 'Historic monuments', 2),
    ('history', 'Historical Events', 'historical-events', 'Historic scenes', 3),
    ('history', 'Leaders', 'leaders', 'Historic leaders', 4),
    ('history', 'Inventions', 'inventions', 'Historic inventions', 5),
    ('technology', 'Computers', 'computers', 'Computers', 1),
    ('technology', 'Robotics', 'robotics', 'Robots', 2),
    ('technology', 'Artificial Intelligence', 'artificial-intelligence', 'AI illustrations', 3),
    ('technology', 'Electronics', 'electronics', 'Circuits and devices', 4),
    ('technology', 'Internet', 'internet', 'Networks and devices', 5),
    ('human-body', 'Organs', 'organs', 'Human organs', 1),
    ('human-body', 'Skeleton', 'skeleton', 'Bones', 2),
    ('human-body', 'Brain', 'brain', 'The brain', 3),
    ('human-body', 'Cells', 'cells', 'Human cells', 4),
    ('human-body', 'Body Systems', 'body-systems', 'Body systems', 5),
    ('art-culture', 'Paintings', 'paintings', 'Painted scenes', 1),
    ('art-culture', 'Music', 'music', 'Music scenes', 2),
    ('art-culture', 'Festivals', 'festivals', 'Festival scenes', 3),
    ('art-culture', 'Architecture', 'architecture', 'Buildings', 4),
    ('art-culture', 'Cultural Heritage', 'cultural-heritage', 'Crafts and dance', 5),
    ('sports', 'Football', 'football', 'Football', 1),
    ('sports', 'Cricket', 'cricket', 'Cricket', 2),
    ('sports', 'Basketball', 'basketball', 'Basketball', 3),
    ('sports', 'Olympics', 'olympics', 'International multi-sport', 4),
    ('sports', 'Athletics', 'athletics', 'Track and field', 5)
) as v(category_slug, name, slug, description, sort_order)
join public.jigsaw_categories c on c.slug = v.category_slug
on conflict (category_id, slug) do update
set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order,
  is_active = true;
