-- Create Followers Table
CREATE TABLE IF NOT EXISTS public.followers (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    follower_id uuid REFERENCES public.profiles(id) NOT NULL,
    following_id uuid REFERENCES public.profiles(id) NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(follower_id, following_id)
);

-- Create Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) NOT NULL, -- The user receiving the notification
    title text NOT NULL,
    message text NOT NULL,
    type text NOT NULL, -- 'new_listing', 'offer', 'system'
    link text,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies for Followers
CREATE POLICY "Public followers are viewable by everyone." ON public.followers FOR SELECT USING (true);
CREATE POLICY "Users can follow others." ON public.followers FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can unfollow." ON public.followers FOR DELETE USING (auth.uid() = follower_id);

-- Policies for Notifications
CREATE POLICY "Users can view their own notifications." ON public.notifications FOR SELECT USING (auth.uid() = user_id);
-- Allowing authenticated users to insert notifications (e.g. when creating a listing, system triggers user action)
CREATE POLICY "Users can insert notifications." ON public.notifications FOR INSERT WITH CHECK (true); 
CREATE POLICY "Users can update their own notifications (mark as read)." ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
