-- Add professional B2B fields to wanted_listings table
ALTER TABLE public.wanted_listings 
ADD COLUMN IF NOT EXISTS frequency text,
ADD COLUMN IF NOT EXISTS packaging_preference text,
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS country text,
ADD COLUMN IF NOT EXISTS zip_code text;

-- Add comments for documentation
COMMENT ON COLUMN public.wanted_listings.frequency IS 'Ongoing or One-Time';
COMMENT ON COLUMN public.wanted_listings.packaging_preference IS 'Preferred packaging type (Bales, Rolls, etc.)';
