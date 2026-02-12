-- Create a table for public profiles linked to auth.users
create table public.profiles (
  id uuid not null references auth.users on delete cascade,
  full_name text,
  company_name text,
  is_premium boolean default false,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (id)
);

-- Create a table for listings
create table public.listings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  title text not null,
  description text,
  material_type text check (material_type in ('Plastic', 'Metal')),
  category text,
  condition text,
  price numeric,
  quantity numeric,
  images text[],
  location text,
  status text default 'active' check (status in ('active', 'sold', 'inactive')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create a table for messages
create table public.messages (
  id uuid default gen_random_uuid() primary key,
  sender_id uuid references public.profiles(id) not null,
  receiver_id uuid references public.profiles(id) not null,
  listing_id uuid references public.listings(id),
  content text not null,
  is_read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up Row Level Security (RLS)
-- Enable RLS
alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.messages enable row level security;

-- Policies for profiles
create policy "Public profiles are viewable by everyone."
  on public.profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on public.profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on public.profiles for update
  using ( auth.uid() = id );

-- Policies for listings
create policy "Listings are viewable by everyone."
  on public.listings for select
  using ( true );

create policy "Users can insert their own listings."
  on public.listings for insert
  with check ( auth.uid() = user_id );

create policy "Users can update own listings."
  on public.listings for update
  using ( auth.uid() = user_id );

-- Policies for messages
create policy "Users can view their own messages."
  on public.messages for select
  using ( auth.uid() = sender_id or auth.uid() = receiver_id );

create policy "Users can insert messages."
  on public.messages for insert
  with check ( auth.uid() = sender_id );
