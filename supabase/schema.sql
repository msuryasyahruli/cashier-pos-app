-- ============================================================================
-- Notebill POS - Complete Supabase Database Schema
-- Run this script once in Supabase Dashboard -> SQL Editor for a fresh setup.
-- All statements are idempotent where possible (IF NOT EXISTS / OR REPLACE).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. USERS PROFILE TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  username TEXT,
  role TEXT NOT NULL DEFAULT 'cashier',
  is_active BOOLEAN NOT NULL DEFAULT true,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
CREATE POLICY "Users can view their own profile"
ON public.users FOR SELECT TO authenticated
USING (id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own profile"
ON public.users FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Automatically create a public.users profile row when a new auth user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, username)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 2. STORES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  branch_code TEXT NOT NULL DEFAULT 'MAIN-01',
  receipt_footer_note TEXT NOT NULL DEFAULT 'Thank you for shopping with us!',
  default_sales_tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 5.00,
  currency VARCHAR(10) NOT NULL DEFAULT 'IDR',
  exchange_rates JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_stores_owner_id ON public.stores (owner_id);

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own stores" ON public.stores;
CREATE POLICY "Users can view their own stores"
ON public.stores FOR SELECT TO authenticated
USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own stores" ON public.stores;
CREATE POLICY "Users can insert their own stores"
ON public.stores FOR INSERT TO authenticated
WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own stores" ON public.stores;
CREATE POLICY "Users can update their own stores"
ON public.stores FOR UPDATE TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own stores" ON public.stores;
CREATE POLICY "Users can delete their own stores"
ON public.stores FOR DELETE TO authenticated
USING (owner_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 3. CATEGORIES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_store_name
  ON public.categories (store_id, lower(name));

CREATE INDEX IF NOT EXISTS idx_categories_store_id
  ON public.categories (store_id);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view categories for their stores" ON public.categories;
CREATE POLICY "Users can view categories for their stores"
ON public.categories FOR SELECT TO authenticated
USING (
  store_id IS NULL
  OR store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can create categories for their stores" ON public.categories;
CREATE POLICY "Users can create categories for their stores"
ON public.categories FOR INSERT TO authenticated
WITH CHECK (
  store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can update categories for their stores" ON public.categories;
CREATE POLICY "Users can update categories for their stores"
ON public.categories FOR UPDATE TO authenticated
USING (
  store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid())
)
WITH CHECK (
  store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can delete categories for their stores" ON public.categories;
CREATE POLICY "Users can delete categories for their stores"
ON public.categories FOR DELETE TO authenticated
USING (
  store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid())
);

-- ----------------------------------------------------------------------------
-- 4. PRODUCTS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price NUMERIC(14, 2) NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER NOT NULL DEFAULT 5,
  barcode TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_products_store_id ON public.products (store_id);
CREATE INDEX IF NOT EXISTS idx_products_store_category ON public.products (store_id, category);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access products for their stores" ON public.products;
CREATE POLICY "Users can access products for their stores"
ON public.products FOR ALL TO authenticated
USING (
  store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid())
)
WITH CHECK (
  store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid())
);

-- ----------------------------------------------------------------------------
-- 5. TRANSACTIONS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
  order_number TEXT NOT NULL,
  cashier TEXT NOT NULL,
  items_count INTEGER NOT NULL DEFAULT 0,
  total NUMERIC(14, 2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  discount_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Completed'
    CHECK (status IN ('Completed', 'Refunded', 'Pending')),
  currency VARCHAR(10) NOT NULL DEFAULT 'IDR',
  exchange_rate NUMERIC NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_transactions_store_id
  ON public.transactions (store_id);
CREATE INDEX IF NOT EXISTS idx_transactions_store_created_at
  ON public.transactions (store_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_store_order_number
  ON public.transactions (store_id, order_number);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access transactions for their stores" ON public.transactions;
CREATE POLICY "Users can access transactions for their stores"
ON public.transactions FOR ALL TO authenticated
USING (
  store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid())
)
WITH CHECK (
  store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid())
);

-- ----------------------------------------------------------------------------
-- 6. TRANSACTION ITEMS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transaction_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(14, 2) NOT NULL DEFAULT 0,
  total_price NUMERIC(14, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_transaction_items_transaction_id
  ON public.transaction_items (transaction_id);

ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access transaction items for their stores" ON public.transaction_items;
CREATE POLICY "Users can access transaction items for their stores"
ON public.transaction_items FOR ALL TO authenticated
USING (
  transaction_id IN (
    SELECT t.id
    FROM public.transactions t
    JOIN public.stores s ON s.id = t.store_id
    WHERE s.owner_id = auth.uid()
  )
)
WITH CHECK (
  transaction_id IN (
    SELECT t.id
    FROM public.transactions t
    JOIN public.stores s ON s.id = t.store_id
    WHERE s.owner_id = auth.uid()
  )
);

-- ----------------------------------------------------------------------------
-- 7. STORE ORDER COUNTERS TABLE & ATOMIC RPC FUNCTIONS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.store_order_counters (
  store_id UUID PRIMARY KEY REFERENCES public.stores(id) ON DELETE CASCADE,
  last_number BIGINT NOT NULL DEFAULT 0
);

ALTER TABLE public.store_order_counters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can use order counters for their stores" ON public.store_order_counters;
CREATE POLICY "Users can use order counters for their stores"
ON public.store_order_counters FOR SELECT TO authenticated
USING (
  store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid())
);

-- Atomic sequential order number generator per store
CREATE OR REPLACE FUNCTION public.next_store_order_number(p_store_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_number BIGINT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.stores
    WHERE id = p_store_id AND owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Store does not belong to the current user';
  END IF;

  INSERT INTO public.store_order_counters (store_id, last_number)
  SELECT
    p_store_id,
    COALESCE(
      MAX(
        CASE
          WHEN order_number ~ '^ORD-[0-9]+$'
          THEN substring(order_number from 5)::BIGINT
          ELSE 0
        END
      ),
      0
    )
  FROM public.transactions
  WHERE store_id = p_store_id
  ON CONFLICT (store_id) DO NOTHING;

  UPDATE public.store_order_counters
  SET last_number = last_number + 1
  WHERE store_id = p_store_id
  RETURNING last_number INTO next_number;

  RETURN 'ORD-' || lpad(next_number::TEXT, 6, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION public.next_store_order_number(UUID) TO authenticated;

-- Atomic stock adjustment (prevents lost updates under concurrent checkouts)
CREATE OR REPLACE FUNCTION public.adjust_product_stock(
  p_product_id UUID,
  p_delta INTEGER,
  p_store_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_stock INTEGER;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.stores
    WHERE id = p_store_id AND owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Store does not belong to the current user';
  END IF;

  UPDATE public.products
  SET
    stock = GREATEST(0, COALESCE(stock, 0) + p_delta),
    updated_at = timezone('utc'::text, now())
  WHERE id = p_product_id
    AND store_id = p_store_id
  RETURNING stock INTO v_new_stock;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product % not found in store %', p_product_id, p_store_id;
  END IF;

  RETURN v_new_stock;
END;
$$;

GRANT EXECUTE ON FUNCTION public.adjust_product_stock(UUID, INTEGER, UUID) TO authenticated;

-- Atomic refund (updates status conditionally first, then restores stock)
CREATE OR REPLACE FUNCTION public.refund_transaction(
  p_transaction_id UUID,
  p_store_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.stores
    WHERE id = p_store_id AND owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Store does not belong to the current user';
  END IF;

  UPDATE public.transactions
  SET status = 'Refunded'
  WHERE id = p_transaction_id
    AND store_id = p_store_id
    AND status = 'Completed';

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  FOR v_item IN
    SELECT product_id, product_name, quantity
    FROM public.transaction_items
    WHERE transaction_id = p_transaction_id
  LOOP
    IF v_item.product_id IS NOT NULL THEN
      UPDATE public.products
      SET
        stock = COALESCE(stock, 0) + v_item.quantity,
        updated_at = timezone('utc'::text, now())
      WHERE id = v_item.product_id
        AND store_id = p_store_id;
    ELSIF v_item.product_name IS NOT NULL THEN
      UPDATE public.products
      SET
        stock = COALESCE(stock, 0) + v_item.quantity,
        updated_at = timezone('utc'::text, now())
      WHERE id = (
        SELECT id FROM public.products
        WHERE store_id = p_store_id AND name = v_item.product_name
        LIMIT 1
      );
    END IF;
  END LOOP;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.refund_transaction(UUID, UUID) TO authenticated;
