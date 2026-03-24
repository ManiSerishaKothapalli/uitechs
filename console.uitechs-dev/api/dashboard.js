const { supabase } = require('./_lib/supabase');

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method === 'GET') {
        try {
            const { data: products } = await supabase.from('products').select('*');
            const { data: invoices } = await supabase
                .from('invoices')
                .select('*, invoice_items(*)')
                .order('created_at', { ascending: false });

            const allProducts = products || [];
            const allInvoices = invoices || [];

            return res.status(200).json({
                totalProducts: allProducts.length,
                laptops: allProducts.filter(p => p.category === 'Laptop').length,
                desktops: allProducts.filter(p => p.category === 'Desktop').length,
                accessories: allProducts.filter(p => p.category !== 'Laptop' && p.category !== 'Desktop').length,
                totalSales: allInvoices.length,
                revenue: allInvoices.reduce((sum, inv) => sum + Number(inv.grand_total), 0),
                recentSales: allInvoices.slice(0, 5),
                lowStock: allProducts.filter(p => p.stock <= 3).sort((a, b) => a.stock - b.stock).slice(0, 5),
            });
        } catch (error) {
            console.error('Dashboard error:', error);
            return res.status(500).json({ error: 'Failed to load dashboard data', details: error.message });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
};
