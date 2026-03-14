const { supabase } = require('./_lib/supabase');

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method === 'POST') {
        try {
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

            // Create invoice
            const { data: invoice, error: invoiceError } = await supabase
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

            if (invoiceError) throw invoiceError;

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

            if (itemsError) throw itemsError;

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

            return res.status(201).json(fullInvoice);

        } catch (error) {
            console.error('Sale processing error:', error);
            return res.status(500).json({ error: 'Failed to process sale', details: error.message });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
};
