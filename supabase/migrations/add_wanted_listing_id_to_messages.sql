-- Add wanted_listing_id to messages table
ALTER TABLE public.messages 
ADD COLUMN wanted_listing_id uuid REFERENCES public.wanted_listings(id);

-- Update RLS policies for messages to include wanted_listing_id checks if necessary
-- The existing policy "Users can view their own messages" checks sender_id or receiver_id, which is sufficient.
-- The existing policy "Users can insert messages" checks sender_id, which is sufficient.

-- However, we might want to ensure that EITHER listing_id OR wanted_listing_id is present, but for now we'll leave it flexible.
