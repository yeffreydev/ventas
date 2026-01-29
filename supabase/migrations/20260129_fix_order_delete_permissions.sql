-- =====================================================
-- FIX: Order Deletion Permissions & Owner Restriction
-- =====================================================
-- 1. Restricts DELETE on 'orders' table to Workspace Owners only.
-- 2. Fixes RLS errors on cascade deletes for child tables.
-- Run this in Supabase SQL Editor.

-- --- TABLA ORDERS ---
DROP POLICY IF EXISTS "Delete orders" ON orders;
DROP POLICY IF EXISTS "Users can delete orders" ON orders; -- Remove old policies if any

CREATE POLICY "Owner can delete orders" ON orders
FOR DELETE
USING (
  auth.uid() IN (
    SELECT owner_id FROM workspaces WHERE id = workspace_id
  )
);

-- --- TABLA ORDER_ITEMS (Cascade Delete) ---
DROP POLICY IF EXISTS "Delete order items" ON order_items;
DROP POLICY IF EXISTS "Users can delete order items" ON order_items;

CREATE POLICY "Owner can delete order items" ON order_items
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM orders
    JOIN workspaces ON workspaces.id = orders.workspace_id
    WHERE orders.id = order_items.order_id
    AND workspaces.owner_id = auth.uid()
  )
);

-- --- TABLA ORDER_STATUS_HISTORY (Cascade Delete & Insert Fix) ---
DROP POLICY IF EXISTS "Delete order history" ON order_status_history;
DROP POLICY IF EXISTS "Users can delete order status history" ON order_status_history;

CREATE POLICY "Owner can delete order history" ON order_status_history
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM orders
    JOIN workspaces ON workspaces.id = orders.workspace_id
    WHERE orders.id = order_status_history.order_id
    AND workspaces.owner_id = auth.uid()
  )
);

-- Fix INSERT policy for history (ensure agents/admins can log status changes)
DROP POLICY IF EXISTS "Insert order history" ON order_status_history;
DROP POLICY IF EXISTS "Users can insert order status history" ON order_status_history;

CREATE POLICY "Members can insert order history" ON order_status_history
FOR INSERT
WITH CHECK (
  -- Check via Order -> Workspace -> Members/Agents/Owner
  EXISTS (
    SELECT 1 FROM orders
    LEFT JOIN workspace_members wm ON wm.workspace_id = orders.workspace_id AND wm.user_id = auth.uid()
    LEFT JOIN workspace_agents wa ON wa.workspace_id = orders.workspace_id AND wa.agent_id = auth.uid()
    LEFT JOIN workspaces w ON w.id = orders.workspace_id AND w.owner_id = auth.uid()
    WHERE orders.id = order_status_history.order_id
    AND (wm.id IS NOT NULL OR wa.id IS NOT NULL OR w.id IS NOT NULL)
  )
);
