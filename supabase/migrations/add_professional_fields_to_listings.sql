-- Add professional B2B fields to listings table
ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS product_code text,
ADD COLUMN IF NOT EXISTS packaging_type text,
ADD COLUMN IF NOT EXISTS pricing_terms text,
ADD COLUMN IF NOT EXISTS supply_type text,
ADD COLUMN IF NOT EXISTS unit text DEFAULT 'tons',
ADD COLUMN IF NOT EXISTS currency text DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS country text,
ADD COLUMN IF NOT EXISTS zip_code text;

-- Add comments for documentation
COMMENT ON COLUMN public.listings.product_code IS 'Product identifier/SKU';
COMMENT ON COLUMN public.listings.packaging_type IS 'Bales, Rolls, Grinded, Pellets, Loose, Gaylord boxes';
COMMENT ON COLUMN public.listings.pricing_terms IS 'CIF, FOB, EXW';
COMMENT ON COLUMN public.listings.supply_type IS 'Ongoing or One-Time';
