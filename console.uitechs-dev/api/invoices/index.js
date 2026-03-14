const { supabase } = require('../_lib/supabase');

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method === 'GET') {
        try {
            const { data, error } = await supabase
                .from('invoices')
                .select('*, invoice_items(*)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return res.status(200).json(data || []);
        } catch (error) {
            console.error('Invoices error:', error);
            return res.status(500).json({ error: 'Failed to fetch invoices', details: error.message });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
};
