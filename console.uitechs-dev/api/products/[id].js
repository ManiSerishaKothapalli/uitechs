const { supabase } = require('../_lib/supabase');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { id } = req.query;

    if (req.method === 'GET') {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('id', id)
            .single();

        if (error) return res.status(404).json({ error: 'Product not found' });
        return res.status(200).json(data);
    }

    if (req.method === 'PUT') {
        const { name, category, brand, model, serial_number, purchase_price, selling_price, stock, description } = req.body;

        const { data, error } = await supabase
            .from('products')
            .update({ name, category, brand, model, serial_number, purchase_price, selling_price, stock, description })
            .eq('id', id)
            .select()
            .single();

        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json(data);
    }

    if (req.method === 'DELETE') {
        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', id);

        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json({ message: 'Product deleted' });
    }

    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
};
