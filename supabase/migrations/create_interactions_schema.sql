-- Create saved_listings table
CREATE TABLE IF NOT EXISTS saved_listings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, listing_id)
);

-- Create followers table
CREATE TABLE IF NOT EXISTS followers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    follower_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    following_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(follower_id, following_id)
);

-- Enable RLS
ALTER TABLE saved_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE followers ENABLE ROW LEVEL SECURITY;

-- Policies for saved_listings
CREATE POLICY "Users can view their own saved listings" ON saved_listings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved listings" ON saved_listings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved listings" ON saved_listings
    FOR DELETE USING (auth.uid() = user_id);

-- Policies for followers
CREATE POLICY "Users can view who they follow" ON followers
    FOR SELECT USING (auth.uid() = follower_id);

CREATE POLICY "Users can follow others" ON followers
    FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow" ON followers
    FOR DELETE USING (auth.uid() = follower_id);
