const { supabase } = require('../_lib/supabase');

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { id } = req.query;

    if (req.method === 'GET') {
        try {
            const { data: invoice, error: invoiceError } = await supabase
                .from('invoices')
                .select('*, invoice_items(*)')
                .eq('id', id)
                .single();

            if (invoiceError) {
                if (invoiceError.code === 'PGRST116') {
                    return res.status(404).json({ error: 'Invoice not found' });
                }
                throw invoiceError;
            }

            return res.status(200).json(invoice);
        } catch (error) {
            console.error('Invoice fetch error:', error);
            return res.status(500).json({ error: 'Failed to fetch invoice', details: error.message });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
};
