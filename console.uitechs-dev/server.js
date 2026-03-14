const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// ============================================================
// PRODUCTS API
// ============================================================

// Get all products
app.get('/api/products', async (req, res) => {
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// Get single product
app.get('/api/products/:id', async (req, res) => {
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', req.params.id)
        .single();

    if (error) return res.status(404).json({ error: 'Product not found' });
    res.json(data);
});

// Create product
app.post('/api/products', async (req, res) => {
    const { name, category, brand, model, serial_number, purchase_price, selling_price, stock, description } = req.body;

    if (!name || !category || purchase_price == null || selling_price == null || stock == null) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const { data, error } = await supabase
        .from('products')
        .insert([{
            name, category, brand, model, serial_number,
            purchase_price, selling_price, stock, description
        }])
        .select()
        .single();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
});

// Update product
app.put('/api/products/:id', async (req, res) => {
    const { name, category, brand, model, serial_number, purchase_price, selling_price, stock, description } = req.body;

    const { data, error } = await supabase
        .from('products')
        .update({
            name, category, brand, model, serial_number,
            purchase_price, selling_price, stock, description
        })
        .eq('id', req.params.id)
        .select()
        .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// Delete product
app.delete('/api/products/:id', async (req, res) => {
    const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', req.params.id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'Product deleted' });
});

// ============================================================
// SALES / INVOICES API
// ============================================================

// Get all invoices
app.get('/api/invoices', async (req, res) => {
    const { data, error } = await supabase
        .from('invoices')
        .select('*, invoice_items(*)')
        .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// Get single invoice
app.get('/api/invoices/:id', async (req, res) => {
    const { data, error } = await supabase
        .from('invoices')
        .select('*, invoice_items(*)')
        .eq('id', req.params.id)
        .single();

    if (error) return res.status(404).json({ error: 'Invoice not found' });
    res.json(data);
});

// Create sale (invoice + items + stock update)
app.post('/api/sales', async (req, res) => {
    const { customer_name, customer_phone, customer_email, customer_address, items, tax_rate, payment_method, notes } = req.body;

    if (!customer_name || !customer_phone || !items || items.length === 0) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // Generate invoice number
    const { count } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true });

    const invoiceNumber = 'INV-' + String((count || 0) + 1).padStart(5, '0');

    // Calculate totals
    const subtotal = items.reduce((sum, item) => {
        return sum + (item.price * item.qty * (1 - (item.discount || 0) / 100));
    }, 0);
    const taxAmount = subtotal * (tax_rate || 0) / 100;
    const grandTotal = subtotal + taxAmount;

    // Insert invoice
    const { data: invoice, error: invError } = await supabase
        .from('invoices')
        .insert([{
            invoice_number: invoiceNumber,
            customer_name,
            customer_phone,
            customer_email: customer_email || null,
            customer_address: customer_address || null,
            subtotal,
            tax_rate: tax_rate || 0,
            tax_amount: taxAmount,
            grand_total: grandTotal,
            payment_method: payment_method || 'Cash',
            notes: notes || null,
        }])
        .select()
        .single();

    if (invError) return res.status(500).json({ error: invError.message });

    // Insert invoice items
    const invoiceItems = items.map(item => ({
        invoice_id: invoice.id,
        product_id: item.product_id,
        product_name: item.product_name,
        product_brand: item.product_brand || '',
        product_model: item.product_model || '',
        price: item.price,
        quantity: item.qty,
        discount: item.discount || 0,
        total: item.price * item.qty * (1 - (item.discount || 0) / 100),
    }));

    const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(invoiceItems);

    if (itemsError) return res.status(500).json({ error: itemsError.message });

    // Update stock for each product
    for (const item of items) {
        const { data: product } = await supabase
            .from('products')
            .select('stock')
            .eq('id', item.product_id)
            .single();

        if (product) {
            await supabase
                .from('products')
                .update({ stock: product.stock - item.qty })
                .eq('id', item.product_id);
        }
    }

    // Return full invoice with items
    const { data: fullInvoice } = await supabase
        .from('invoices')
        .select('*, invoice_items(*)')
        .eq('id', invoice.id)
        .single();

    res.status(201).json(fullInvoice);
});

// ============================================================
// DASHBOARD STATS API
// ============================================================

app.get('/api/dashboard', async (req, res) => {
    const { data: products } = await supabase.from('products').select('*');
    const { data: invoices } = await supabase
        .from('invoices')
        .select('*, invoice_items(*)')
        .order('created_at', { ascending: false });

    const allProducts = products || [];
    const allInvoices = invoices || [];

    const stats = {
        totalProducts: allProducts.length,
        laptops: allProducts.filter(p => p.category === 'Laptop').length,
        desktops: allProducts.filter(p => p.category === 'Desktop').length,
        spareParts: allProducts.filter(p => p.category !== 'Laptop' && p.category !== 'Desktop').length,
        totalSales: allInvoices.length,
        revenue: allInvoices.reduce((sum, inv) => sum + Number(inv.grand_total), 0),
        recentSales: allInvoices.slice(0, 5),
        lowStock: allProducts.filter(p => p.stock <= 3).sort((a, b) => a.stock - b.stock).slice(0, 5),
    };

    res.json(stats);
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`U&I Technologies server running at http://localhost:${PORT}`);
});
