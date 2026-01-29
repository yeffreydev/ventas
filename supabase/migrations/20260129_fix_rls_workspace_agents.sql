-- =====================================================
-- FIX RLS POLICIES FOR INVITED USERS (WORKSPACE AGENTS)
-- =====================================================
-- This script fixes RLS policies to allow workspace_agents 
-- to access data in the workspace they were invited to.
-- Run this in Supabase SQL Editor.

-- =====================================================
-- 1. PRODUCTS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Users can view their own products" ON public.products;
DROP POLICY IF EXISTS "Users can view products in their workspace" ON public.products;
DROP POLICY IF EXISTS "Users can insert their own products" ON public.products;
DROP POLICY IF EXISTS "Users can update their own products" ON public.products;
DROP POLICY IF EXISTS "Users can delete their own products" ON public.products;
DROP POLICY IF EXISTS "Workspace members can manage products" ON public.products;
DROP POLICY IF EXISTS "Workspace members can view products" ON public.products;

CREATE POLICY "Workspace members can view products" ON public.products
FOR SELECT USING (
    workspace_id IN (
        SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
        UNION
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        UNION
        SELECT workspace_id FROM public.workspace_agents WHERE agent_id = auth.uid()
    )
);

CREATE POLICY "Workspace members can manage products" ON public.products
FOR ALL USING (
    workspace_id IN (
        SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
        UNION
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        UNION
        SELECT workspace_id FROM public.workspace_agents WHERE agent_id = auth.uid()
    )
);

-- =====================================================
-- 2. ORDERS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can view orders in their workspace" ON public.orders;
DROP POLICY IF EXISTS "Users can insert their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can update their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can delete their own orders" ON public.orders;
DROP POLICY IF EXISTS "Workspace members can manage orders" ON public.orders;
DROP POLICY IF EXISTS "Workspace members can view orders" ON public.orders;

CREATE POLICY "Workspace members can view orders" ON public.orders
FOR SELECT USING (
    workspace_id IN (
        SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
        UNION
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        UNION
        SELECT workspace_id FROM public.workspace_agents WHERE agent_id = auth.uid()
    )
);

CREATE POLICY "Workspace members can manage orders" ON public.orders
FOR ALL USING (
    workspace_id IN (
        SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
        UNION
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        UNION
        SELECT workspace_id FROM public.workspace_agents WHERE agent_id = auth.uid()
    )
);

-- =====================================================
-- 3. ORDER ITEMS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Users can view order items" ON public.order_items;
DROP POLICY IF EXISTS "Users can manage order items" ON public.order_items;
DROP POLICY IF EXISTS "Workspace members can view order items" ON public.order_items;
DROP POLICY IF EXISTS "Workspace members can manage order items" ON public.order_items;

CREATE POLICY "Workspace members can view order items" ON public.order_items
FOR SELECT USING (
    order_id IN (
        SELECT id FROM public.orders WHERE workspace_id IN (
            SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
            UNION
            SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
            UNION
            SELECT workspace_id FROM public.workspace_agents WHERE agent_id = auth.uid()
        )
    )
);

CREATE POLICY "Workspace members can manage order items" ON public.order_items
FOR ALL USING (
    order_id IN (
        SELECT id FROM public.orders WHERE workspace_id IN (
            SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
            UNION
            SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
            UNION
            SELECT workspace_id FROM public.workspace_agents WHERE agent_id = auth.uid()
        )
    )
);

-- =====================================================
-- 4. CUSTOMERS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Users can view their own customers" ON public.customers;
DROP POLICY IF EXISTS "Users can view customers in their workspace" ON public.customers;
DROP POLICY IF EXISTS "Users can insert their own customers" ON public.customers;
DROP POLICY IF EXISTS "Users can update their own customers" ON public.customers;
DROP POLICY IF EXISTS "Users can delete their own customers" ON public.customers;
DROP POLICY IF EXISTS "Workspace members can manage customers" ON public.customers;
DROP POLICY IF EXISTS "Workspace members can view customers" ON public.customers;

CREATE POLICY "Workspace members can view customers" ON public.customers
FOR SELECT USING (
    workspace_id IN (
        SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
        UNION
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        UNION
        SELECT workspace_id FROM public.workspace_agents WHERE agent_id = auth.uid()
    )
);

CREATE POLICY "Workspace members can manage customers" ON public.customers
FOR ALL USING (
    workspace_id IN (
        SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
        UNION
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        UNION
        SELECT workspace_id FROM public.workspace_agents WHERE agent_id = auth.uid()
    )
);

-- =====================================================
-- 5. PAYMENTS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Users can view their own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can view payments in their workspace" ON public.payments;
DROP POLICY IF EXISTS "Users can insert their own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can update their own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can delete their own payments" ON public.payments;
DROP POLICY IF EXISTS "Workspace members can manage payments" ON public.payments;
DROP POLICY IF EXISTS "Workspace members can view payments" ON public.payments;

CREATE POLICY "Workspace members can view payments" ON public.payments
FOR SELECT USING (
    workspace_id IN (
        SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
        UNION
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        UNION
        SELECT workspace_id FROM public.workspace_agents WHERE agent_id = auth.uid()
    )
);

CREATE POLICY "Workspace members can manage payments" ON public.payments
FOR ALL USING (
    workspace_id IN (
        SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
        UNION
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        UNION
        SELECT workspace_id FROM public.workspace_agents WHERE agent_id = auth.uid()
    )
);

-- =====================================================
-- 6. PRODUCT CATEGORIES TABLE
-- =====================================================
DROP POLICY IF EXISTS "Users can view their own categories" ON public.product_categories;
DROP POLICY IF EXISTS "Users can view categories in their workspace" ON public.product_categories;
DROP POLICY IF EXISTS "Users can insert their own categories" ON public.product_categories;
DROP POLICY IF EXISTS "Users can update their own categories" ON public.product_categories;
DROP POLICY IF EXISTS "Users can delete their own categories" ON public.product_categories;
DROP POLICY IF EXISTS "Workspace members can manage categories" ON public.product_categories;
DROP POLICY IF EXISTS "Workspace members can view categories" ON public.product_categories;

CREATE POLICY "Workspace members can view categories" ON public.product_categories
FOR SELECT USING (
    workspace_id IN (
        SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
        UNION
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        UNION
        SELECT workspace_id FROM public.workspace_agents WHERE agent_id = auth.uid()
    )
);

CREATE POLICY "Workspace members can manage categories" ON public.product_categories
FOR ALL USING (
    workspace_id IN (
        SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
        UNION
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        UNION
        SELECT workspace_id FROM public.workspace_agents WHERE agent_id = auth.uid()
    )
);

-- =====================================================
-- 7. PRODUCT VARIANTS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Users can view product variants" ON public.product_variants;
DROP POLICY IF EXISTS "Users can manage product variants" ON public.product_variants;
DROP POLICY IF EXISTS "Workspace members can view variants" ON public.product_variants;
DROP POLICY IF EXISTS "Workspace members can manage variants" ON public.product_variants;

CREATE POLICY "Workspace members can view variants" ON public.product_variants
FOR SELECT USING (
    product_id IN (
        SELECT id FROM public.products WHERE workspace_id IN (
            SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
            UNION
            SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
            UNION
            SELECT workspace_id FROM public.workspace_agents WHERE agent_id = auth.uid()
        )
    )
);

CREATE POLICY "Workspace members can manage variants" ON public.product_variants
FOR ALL USING (
    product_id IN (
        SELECT id FROM public.products WHERE workspace_id IN (
            SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
            UNION
            SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
            UNION
            SELECT workspace_id FROM public.workspace_agents WHERE agent_id = auth.uid()
        )
    )
);

-- =====================================================
-- 8. TAGS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Users can view their own tags" ON public.tags;
DROP POLICY IF EXISTS "Users can view tags in their workspace" ON public.tags;
DROP POLICY IF EXISTS "Users can insert their own tags" ON public.tags;
DROP POLICY IF EXISTS "Users can update their own tags" ON public.tags;
DROP POLICY IF EXISTS "Users can delete their own tags" ON public.tags;
DROP POLICY IF EXISTS "Workspace members can manage tags" ON public.tags;
DROP POLICY IF EXISTS "Workspace members can view tags" ON public.tags;

CREATE POLICY "Workspace members can view tags" ON public.tags
FOR SELECT USING (
    workspace_id IN (
        SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
        UNION
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        UNION
        SELECT workspace_id FROM public.workspace_agents WHERE agent_id = auth.uid()
    )
);

CREATE POLICY "Workspace members can manage tags" ON public.tags
FOR ALL USING (
    workspace_id IN (
        SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
        UNION
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        UNION
        SELECT workspace_id FROM public.workspace_agents WHERE agent_id = auth.uid()
    )
);

-- =====================================================
-- 9. CUSTOMER TAGS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Users can view customer tags" ON public.customer_tags;
DROP POLICY IF EXISTS "Users can manage customer tags" ON public.customer_tags;
DROP POLICY IF EXISTS "Workspace members can view customer tags" ON public.customer_tags;
DROP POLICY IF EXISTS "Workspace members can manage customer tags" ON public.customer_tags;

CREATE POLICY "Workspace members can view customer tags" ON public.customer_tags
FOR SELECT USING (
    customer_id IN (
        SELECT id FROM public.customers WHERE workspace_id IN (
            SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
            UNION
            SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
            UNION
            SELECT workspace_id FROM public.workspace_agents WHERE agent_id = auth.uid()
        )
    )
);

CREATE POLICY "Workspace members can manage customer tags" ON public.customer_tags
FOR ALL USING (
    customer_id IN (
        SELECT id FROM public.customers WHERE workspace_id IN (
            SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
            UNION
            SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
            UNION
            SELECT workspace_id FROM public.workspace_agents WHERE agent_id = auth.uid()
        )
    )
);

-- =====================================================
-- 10. CUSTOMER NOTES TABLE
-- =====================================================
DROP POLICY IF EXISTS "Users can view customer notes" ON public.customer_notes;
DROP POLICY IF EXISTS "Users can manage customer notes" ON public.customer_notes;
DROP POLICY IF EXISTS "Workspace members can view customer notes" ON public.customer_notes;
DROP POLICY IF EXISTS "Workspace members can manage customer notes" ON public.customer_notes;

CREATE POLICY "Workspace members can view customer notes" ON public.customer_notes
FOR SELECT USING (
    workspace_id IN (
        SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
        UNION
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        UNION
        SELECT workspace_id FROM public.workspace_agents WHERE agent_id = auth.uid()
    )
);

CREATE POLICY "Workspace members can manage customer notes" ON public.customer_notes
FOR ALL USING (
    workspace_id IN (
        SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
        UNION
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        UNION
        SELECT workspace_id FROM public.workspace_agents WHERE agent_id = auth.uid()
    )
);

-- =====================================================
-- 11. CUSTOMER ACTIVITIES TABLE
-- =====================================================
DROP POLICY IF EXISTS "Users can view customer activities" ON public.customer_activities;
DROP POLICY IF EXISTS "Users can manage customer activities" ON public.customer_activities;
DROP POLICY IF EXISTS "Workspace members can view customer activities" ON public.customer_activities;
DROP POLICY IF EXISTS "Workspace members can manage customer activities" ON public.customer_activities;

CREATE POLICY "Workspace members can view customer activities" ON public.customer_activities
FOR SELECT USING (
    workspace_id IN (
        SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
        UNION
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        UNION
        SELECT workspace_id FROM public.workspace_agents WHERE agent_id = auth.uid()
    )
);

CREATE POLICY "Workspace members can manage customer activities" ON public.customer_activities
FOR ALL USING (
    workspace_id IN (
        SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
        UNION
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        UNION
        SELECT workspace_id FROM public.workspace_agents WHERE agent_id = auth.uid()
    )
);

-- =====================================================
-- 12. ORDER FIELD DEFINITIONS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Users can view order field definitions" ON public.order_field_definitions;
DROP POLICY IF EXISTS "Users can manage order field definitions" ON public.order_field_definitions;
DROP POLICY IF EXISTS "Workspace members can view order field definitions" ON public.order_field_definitions;
DROP POLICY IF EXISTS "Workspace members can manage order field definitions" ON public.order_field_definitions;

CREATE POLICY "Workspace members can view order field definitions" ON public.order_field_definitions
FOR SELECT USING (
    workspace_id IN (
        SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
        UNION
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        UNION
        SELECT workspace_id FROM public.workspace_agents WHERE agent_id = auth.uid()
    )
);

CREATE POLICY "Workspace members can manage order field definitions" ON public.order_field_definitions
FOR ALL USING (
    workspace_id IN (
        SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
        UNION
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        UNION
        SELECT workspace_id FROM public.workspace_agents WHERE agent_id = auth.uid()
    )
);

-- =====================================================
-- 13. REMINDERS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Users can view their own reminders" ON public.reminders;
DROP POLICY IF EXISTS "Users can manage their own reminders" ON public.reminders;
DROP POLICY IF EXISTS "Workspace members can view reminders" ON public.reminders;
DROP POLICY IF EXISTS "Workspace members can manage reminders" ON public.reminders;

CREATE POLICY "Workspace members can view reminders" ON public.reminders
FOR SELECT USING (
    workspace_id IN (
        SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
        UNION
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        UNION
        SELECT workspace_id FROM public.workspace_agents WHERE agent_id = auth.uid()
    )
    OR user_id = auth.uid()
);

CREATE POLICY "Workspace members can manage reminders" ON public.reminders
FOR ALL USING (
    workspace_id IN (
        SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
        UNION
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        UNION
        SELECT workspace_id FROM public.workspace_agents WHERE agent_id = auth.uid()
    )
    OR user_id = auth.uid()
);

-- =====================================================
-- 14. SCHEDULED MESSAGES TABLE
-- =====================================================
DROP POLICY IF EXISTS "Users can view their own scheduled messages" ON public.scheduled_messages;
DROP POLICY IF EXISTS "Users can manage their own scheduled messages" ON public.scheduled_messages;
DROP POLICY IF EXISTS "Users can view scheduled messages" ON public.scheduled_messages;
DROP POLICY IF EXISTS "Users can manage scheduled messages" ON public.scheduled_messages;

CREATE POLICY "Users can view scheduled messages" ON public.scheduled_messages
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage scheduled messages" ON public.scheduled_messages
FOR ALL USING (user_id = auth.uid());

-- =====================================================
-- 15. PAYMENT RECEIPTS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Users can view payment receipts" ON public.payment_receipts;
DROP POLICY IF EXISTS "Users can manage payment receipts" ON public.payment_receipts;
DROP POLICY IF EXISTS "Workspace members can view payment receipts" ON public.payment_receipts;
DROP POLICY IF EXISTS "Workspace members can manage payment receipts" ON public.payment_receipts;

CREATE POLICY "Workspace members can view payment receipts" ON public.payment_receipts
FOR SELECT USING (
    payment_id IN (
        SELECT id FROM public.payments WHERE workspace_id IN (
            SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
            UNION
            SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
            UNION
            SELECT workspace_id FROM public.workspace_agents WHERE agent_id = auth.uid()
        )
    )
);

CREATE POLICY "Workspace members can manage payment receipts" ON public.payment_receipts
FOR ALL USING (
    payment_id IN (
        SELECT id FROM public.payments WHERE workspace_id IN (
            SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
            UNION
            SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
            UNION
            SELECT workspace_id FROM public.workspace_agents WHERE agent_id = auth.uid()
        )
    )
);

-- =====================================================
-- 16. PRODUCT STOCK MOVEMENTS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Users can view stock movements" ON public.product_stock_movements;
DROP POLICY IF EXISTS "Users can manage stock movements" ON public.product_stock_movements;
DROP POLICY IF EXISTS "Workspace members can view stock movements" ON public.product_stock_movements;
DROP POLICY IF EXISTS "Workspace members can manage stock movements" ON public.product_stock_movements;

CREATE POLICY "Workspace members can view stock movements" ON public.product_stock_movements
FOR SELECT USING (
    workspace_id IN (
        SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
        UNION
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        UNION
        SELECT workspace_id FROM public.workspace_agents WHERE agent_id = auth.uid()
    )
);

CREATE POLICY "Workspace members can manage stock movements" ON public.product_stock_movements
FOR ALL USING (
    workspace_id IN (
        SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
        UNION
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        UNION
        SELECT workspace_id FROM public.workspace_agents WHERE agent_id = auth.uid()
    )
);

-- =====================================================
-- 17. CUSTOMER ATTRIBUTE DEFINITIONS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Users can view attribute definitions" ON public.customer_attribute_definitions;
DROP POLICY IF EXISTS "Users can manage attribute definitions" ON public.customer_attribute_definitions;
DROP POLICY IF EXISTS "Workspace members can view attribute definitions" ON public.customer_attribute_definitions;
DROP POLICY IF EXISTS "Workspace members can manage attribute definitions" ON public.customer_attribute_definitions;

CREATE POLICY "Workspace members can view attribute definitions" ON public.customer_attribute_definitions
FOR SELECT USING (
    workspace_id IN (
        SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
        UNION
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        UNION
        SELECT workspace_id FROM public.workspace_agents WHERE agent_id = auth.uid()
    )
);

CREATE POLICY "Workspace members can manage attribute definitions" ON public.customer_attribute_definitions
FOR ALL USING (
    workspace_id IN (
        SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
        UNION
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        UNION
        SELECT workspace_id FROM public.workspace_agents WHERE agent_id = auth.uid()
    )
);

-- =====================================================
-- 18. CUSTOMER ATTRIBUTES TABLE
-- =====================================================
DROP POLICY IF EXISTS "Users can view customer attributes" ON public.customer_attributes;
DROP POLICY IF EXISTS "Users can manage customer attributes" ON public.customer_attributes;
DROP POLICY IF EXISTS "Workspace members can view customer attributes" ON public.customer_attributes;
DROP POLICY IF EXISTS "Workspace members can manage customer attributes" ON public.customer_attributes;

CREATE POLICY "Workspace members can view customer attributes" ON public.customer_attributes
FOR SELECT USING (
    customer_id IN (
        SELECT id FROM public.customers WHERE workspace_id IN (
            SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
            UNION
            SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
            UNION
            SELECT workspace_id FROM public.workspace_agents WHERE agent_id = auth.uid()
        )
    )
);

CREATE POLICY "Workspace members can manage customer attributes" ON public.customer_attributes
FOR ALL USING (
    customer_id IN (
        SELECT id FROM public.customers WHERE workspace_id IN (
            SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
            UNION
            SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
            UNION
            SELECT workspace_id FROM public.workspace_agents WHERE agent_id = auth.uid()
        )
    )
);

-- =====================================================
-- DONE! All RLS policies updated to include workspace_agents
-- =====================================================
