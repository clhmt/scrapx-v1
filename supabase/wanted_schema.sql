-- Create table for Wanted Listings
create table public.wanted_listings (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text not null,
  material_type text not null, -- 'Plastic' or 'Metal'
  category text not null,
  condition text, -- Optional for wanted
  target_price numeric,
  quantity_needed numeric,
  quantity_unit text default 'tons',
  location text, -- simple string or JSON
  status text default 'active', -- active, fulfilled, closed
  created_at timestamp with time zone not null default now(),
  constraint wanted_listings_pkey primary key (id)
);

-- Enable Row Level Security
alter table public.wanted_listings enable row level security;

-- Policies
create policy "Wanted listings are viewable by everyone" 
  on public.wanted_listings for select 
  using ( true );

create policy "Users can insert their own wanted listings" 
  on public.wanted_listings for insert 
  with check ( auth.uid() = user_id );

create policy "Users can update their own wanted listings" 
  on public.wanted_listings for update 
  using ( auth.uid() = user_id );

create policy "Users can delete their own wanted listings" 
  on public.wanted_listings for delete 
  using ( auth.uid() = user_id );
