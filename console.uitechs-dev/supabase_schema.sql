-- ============================================================
-- U&I Technologies - Final Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================


-- ============================================================
-- CLEANUP (run if re-applying schema)
-- ============================================================

DROP TABLE IF EXISTS invoice_items CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS users CASCADE; -- old table, no longer needed


-- ============================================================
-- PRODUCTS TABLE
-- ============================================================

CREATE TABLE products (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name            TEXT NOT NULL,
    category        TEXT NOT NULL,
    brand           TEXT DEFAULT '',
    model           TEXT DEFAULT '',
    serial_number   TEXT DEFAULT '',
    purchase_price  NUMERIC(10,2) NOT NULL DEFAULT 0,
    selling_price   NUMERIC(10,2) NOT NULL DEFAULT 0,
    stock           INTEGER NOT NULL DEFAULT 0,
    description     TEXT DEFAULT '',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- INVOICES TABLE
-- ============================================================

CREATE TABLE invoices (
    id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_number   TEXT NOT NULL UNIQUE,
    customer_name    TEXT NOT NULL,
    customer_phone   TEXT NOT NULL,
    customer_email   TEXT,
    customer_address TEXT,
    subtotal         NUMERIC(10,2) NOT NULL DEFAULT 0,
    tax_rate         NUMERIC(5,2)  NOT NULL DEFAULT 0,
    tax_amount       NUMERIC(10,2) NOT NULL DEFAULT 0,
    grand_total      NUMERIC(10,2) NOT NULL DEFAULT 0,
    payment_method   TEXT DEFAULT 'Cash',
    notes            TEXT,
    created_at       TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- INVOICE ITEMS TABLE
-- ============================================================

CREATE TABLE invoice_items (
    id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_id    UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    product_id    UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name  TEXT NOT NULL,
    product_brand TEXT DEFAULT '',
    product_model TEXT DEFAULT '',
    price         NUMERIC(10,2) NOT NULL DEFAULT 0,
    quantity      INTEGER NOT NULL DEFAULT 1,
    discount      NUMERIC(5,2)  NOT NULL DEFAULT 0,
    total         NUMERIC(10,2) NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- ROW LEVEL SECURITY
-- Only authenticated users (logged in via Supabase Auth) can
-- read/write data. Unauthenticated requests are blocked.
-- ============================================================

ALTER TABLE products      ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices      ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- Products: authenticated users only
CREATE POLICY "Authenticated users can manage products"
    ON products FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Invoices: authenticated users only
CREATE POLICY "Authenticated users can manage invoices"
    ON invoices FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Invoice items: authenticated users only
CREATE POLICY "Authenticated users can manage invoice_items"
    ON invoice_items FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');


-- ============================================================
-- INDEXES (for faster queries)
-- ============================================================

CREATE INDEX idx_products_category    ON products(category);
CREATE INDEX idx_products_stock       ON products(stock);
CREATE INDEX idx_invoices_number      ON invoices(invoice_number);
CREATE INDEX idx_invoices_created     ON invoices(created_at DESC);
CREATE INDEX idx_invoice_items_inv_id ON invoice_items(invoice_id);


-- ============================================================
-- DONE
-- Users are managed via: Supabase Dashboard → Authentication → Users
-- Add users there with email + password. No user table needed.
-- ============================================================