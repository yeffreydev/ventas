-- Add stock alert configuration to products and workspaces
-- This allows configurable low stock alerts instead of hardcoded values

-- Add default_min_stock_alert to workspaces table
ALTER TABLE public.workspaces
ADD COLUMN IF NOT EXISTS default_min_stock_alert INTEGER DEFAULT 100;

COMMENT ON COLUMN public.workspaces.default_min_stock_alert IS 'Default minimum stock threshold for low stock alerts across all products in this workspace';

-- Add allow_orders_without_stock to workspaces table
ALTER TABLE public.workspaces
ADD COLUMN IF NOT EXISTS allow_orders_without_stock BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.workspaces.allow_orders_without_stock IS 'If true, allows creating orders even when products are out of stock';

-- Add min_stock_alert to products table
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS min_stock_alert INTEGER;

COMMENT ON COLUMN public.products.min_stock_alert IS 'Minimum stock threshold for this specific product. If NULL, uses workspace default_min_stock_alert';

-- Create index for efficient low stock queries
CREATE INDEX IF NOT EXISTS idx_products_low_stock 
ON public.products(workspace_id, stock, min_stock_alert) 
WHERE stock IS NOT NULL;

-- Update existing products to use workspace default if not set
-- This will be handled by the application logic, but we can set a reasonable default
UPDATE public.products
SET min_stock_alert = 10
WHERE min_stock_alert IS NULL;
