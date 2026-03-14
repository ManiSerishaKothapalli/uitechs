// ============================================================
// U&I Technologies - Sales & Service Management App
// ============================================================

// --- API Helper Functions ---
const API = {
    async get(endpoint) {
        console.log("GET request to:", endpoint);
        const response = await fetch(endpoint);
        if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
        return await response.json();
    },
    
    async post(endpoint, data) {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
        return await response.json();
    },
    
    async put(endpoint, data) {
        const response = await fetch(endpoint, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
        return await response.json();
    },
    
    async delete(endpoint) {
        const response = await fetch(endpoint, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
        return await response.json();
    }
};

// Add debugging logs for navigation
console.log("Setting up navigation event listeners");
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', async (e) => {
        e.preventDefault();
        console.log("Navigation clicked for page:", link.dataset.page);
        const page = link.dataset.page;
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById('page-' + page).classList.add('active');

        try {
            if (page === 'dashboard') await refreshDashboard();
            if (page === 'inventory') await renderInventory();
            if (page === 'sales') await populateSaleProductDropdown();
            if (page === 'invoices') await renderInvoices();
        } catch (error) {
            console.error('Error loading page:', error);
            alert('Error loading page. Please try again.');
        }
    });
});

// ============================================================
// INVENTORY MODULE
// ============================================================

async function getProducts() {
    try {
        return await API.get('/api/products');
    } catch (error) {
        console.error('Error fetching products:', error);
        alert('Error loading products. Please try again.');
        return [];
    }
}

async function renderInventory() {
    try {
        const products = await getProducts();
        const search = document.getElementById('inventory-search').value.toLowerCase();
        const filter = document.getElementById('inventory-filter').value;

        const filtered = products.filter(p => {
            const matchSearch = p.name.toLowerCase().includes(search) ||
                (p.brand || '').toLowerCase().includes(search) ||
                (p.model || '').toLowerCase().includes(search);
            const matchFilter = filter === 'all' || p.category === filter;
            return matchSearch && matchFilter;
        });

        const tbody = document.getElementById('inventory-body');
        tbody.innerHTML = filtered.map(p => `
            <tr>
                <td>${escapeHtml(p.name)}</td>
                <td>${escapeHtml(p.category)}</td>
                <td>${escapeHtml(p.brand || '')}</td>
                <td>${escapeHtml(p.model || '')}</td>
                <td>${p.stock}</td>
                <td>${Array.from({ length: p.stock }, (_, i) => `SN-${p.id}-${i + 1}`).join(', ')}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="editProduct(${p.id})">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteProduct(${p.id})">Delete</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error rendering inventory:', error);
        alert('Error loading inventory. Please try again.');
    }
}

// Search & Filter listeners
document.getElementById('inventory-search').addEventListener('input', renderInventory);
document.getElementById('inventory-filter').addEventListener('change', renderInventory);

// Add Product button
document.getElementById('btn-add-product').addEventListener('click', () => {
    document.getElementById('product-modal-title').textContent = 'Add Product';
    document.getElementById('product-form').reset();
    document.getElementById('product-id').value = '';
    document.getElementById('product-modal').classList.add('active');
});

// Close modal
document.getElementById('close-product-modal').addEventListener('click', () => {
    document.getElementById('product-modal').classList.remove('active');
});
document.getElementById('cancel-product').addEventListener('click', () => {
    document.getElementById('product-modal').classList.remove('active');
});

// Save Product
document.getElementById('product-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('product-id').value;

    const productData = {
        name: document.getElementById('product-name').value.trim(),
        category: document.getElementById('product-category').value,
        brand: document.getElementById('product-brand').value.trim(),
        model: document.getElementById('product-model').value.trim(),
        serial_number: document.getElementById('product-serial').value.trim(),
        purchase_price: parseFloat(document.getElementById('product-purchase-price').value),
        selling_price: parseFloat(document.getElementById('product-selling-price').value),
        stock: parseInt(document.getElementById('product-stock').value),
        description: document.getElementById('product-description').value.trim(),
    };

    try {
        if (id) {
            // Edit existing product
            await API.put(`/api/products/${id}`, productData);
        } else {
            // Add new product
            await API.post('/api/products', productData);
        }

        document.getElementById('product-modal').classList.remove('active');
        await renderInventory();
        alert(id ? 'Product updated successfully!' : 'Product added successfully!');
    } catch (error) {
        console.error('Error saving product:', error);
        alert('Error saving product. Please try again.');
    }
});

async function editProduct(id) {
    try {
        const products = await getProducts();
        const p = products.find(prod => prod.id === id); // Remove parseInt() since IDs are UUIDs
        if (!p) return;

        document.getElementById('product-modal-title').textContent = 'Edit Product';
        document.getElementById('product-id').value = p.id;
        document.getElementById('product-name').value = p.name;
        document.getElementById('product-category').value = p.category;
        document.getElementById('product-brand').value = p.brand || '';
        document.getElementById('product-model').value = p.model || '';
        document.getElementById('product-serial').value = p.serial_number || '';
        document.getElementById('product-purchase-price').value = p.purchase_price;
        document.getElementById('product-selling-price').value = p.selling_price;
        document.getElementById('product-stock').value = p.stock;
        document.getElementById('product-description').value = p.description || '';
        document.getElementById('product-modal').classList.add('active');
    } catch (error) {
        console.error('Error loading product for edit:', error);
        alert('Error loading product. Please try again.');
    }
}

async function deleteProduct(id) {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    try {
        await API.delete(`/api/products/${id}`);
        await renderInventory();
        alert('Product deleted successfully!');
    } catch (error) {
        console.error('Error deleting product:', error);
        alert('Error deleting product. Please try again.');
    }
}

// ============================================================
// SALES MODULE
// ============================================================

let saleItems = [];

async function populateSaleProductDropdown() {
    try {
        const products = await getProducts();
        const availableProducts = products.filter(p => p.stock > 0);
        const select = document.getElementById('sale-product-select');
        select.innerHTML = '<option value="">Select Product</option>' +
            availableProducts.map(p => `<option value="${p.id}">${escapeHtml(p.name)} - ${escapeHtml(p.brand || '')} ${escapeHtml(p.model || '')} (Stock: ${p.stock}) - &#8377;${formatNum(p.selling_price)}</option>`).join('');
    } catch (error) {
        console.error('Error loading products for sale:', error);
        alert('Error loading products. Please try again.');
    }
}

document.getElementById('btn-add-sale-item').addEventListener('click', async () => {
    const productId = document.getElementById('sale-product-select').value; // Remove parseInt() since IDs are UUIDs
    const qty = parseInt(document.getElementById('sale-qty').value) || 1;
    const discount = parseFloat(document.getElementById('sale-discount').value) || 0;

    if (!productId) {
        alert('Please select a product.');
        return;
    }

    try {
        const products = await getProducts();
        const product = products.find(p => p.id === productId);
        if (!product) return;

        // Check if already added
        const existing = saleItems.find(item => item.product_id === productId);
        if (existing) {
            alert('Product already added. Remove it first to change quantity.');
            return;
        }

        if (qty > product.stock) {
            alert(`Only ${product.stock} units available in stock.`);
            return;
        }

        saleItems.push({
            product_id: product.id,
            product_name: product.name,
            product_brand: product.brand || '',
            product_model: product.model || '',
            price: product.selling_price,
            qty: qty,
            discount: discount,
        });

        document.getElementById('sale-product-select').value = '';
        document.getElementById('sale-qty').value = 1;
        document.getElementById('sale-discount').value = 0;

        renderSaleItems();
    } catch (error) {
        console.error('Error adding sale item:', error);
        alert('Error adding item. Please try again.');
    }
});

function renderSaleItems() {
    const tbody = document.getElementById('sale-items-body');
    tbody.innerHTML = saleItems.map((item, i) => {
        const itemTotal = item.price * item.qty * (1 - item.discount / 100);
        return `
            <tr>
                <td>${escapeHtml(item.product_name)} (${escapeHtml(item.product_brand)} ${escapeHtml(item.product_model)})</td>
                <td>&#8377;${formatNum(item.price)}</td>
                <td>${item.qty}</td>
                <td>${item.discount}%</td>
                <td>&#8377;${formatNum(itemTotal)}</td>
                <td><button class="btn btn-sm btn-danger" onclick="removeSaleItem(${i})">Remove</button></td>
            </tr>
        `;
    }).join('');

    updateSaleTotals();
}

function removeSaleItem(index) {
    saleItems.splice(index, 1);
    renderSaleItems();
}

function updateSaleTotals() {
    const subtotal = saleItems.reduce((sum, item) => {
        return sum + (item.price * item.qty * (1 - item.discount / 100));
    }, 0);

    const taxRate = parseFloat(document.getElementById('sale-tax').value) || 0;
    const taxAmount = subtotal * taxRate / 100;
    const grandTotal = subtotal + taxAmount;

    document.getElementById('sale-subtotal').innerHTML = '&#8377;' + formatNum(subtotal);
    document.getElementById('sale-tax-amount').innerHTML = '&#8377;' + formatNum(taxAmount);
    document.getElementById('sale-grand-total').innerHTML = '&#8377;' + formatNum(grandTotal);
}

document.getElementById('sale-tax').addEventListener('input', updateSaleTotals);

// Clear Sale
document.getElementById('btn-clear-sale').addEventListener('click', () => {
    if (saleItems.length > 0 && !confirm('Clear all sale items?')) return;
    saleItems = [];
    document.getElementById('customer-name').value = '';
    document.getElementById('customer-phone').value = '';
    document.getElementById('customer-email').value = '';
    document.getElementById('customer-address').value = '';
    document.getElementById('sale-notes').value = '';
    renderSaleItems();
});

// Complete Sale
document.getElementById('btn-complete-sale').addEventListener('click', async () => {
    const customerName = document.getElementById('customer-name').value.trim();
    const customerPhone = document.getElementById('customer-phone').value.trim();

    if (!customerName) {
        alert('Please enter customer name.');
        return;
    }
    if (!customerPhone) {
        alert('Please enter customer phone number.');
        return;
    }
    if (saleItems.length === 0) {
        alert('Please add at least one item to the sale.');
        return;
    }

    const taxRate = parseFloat(document.getElementById('sale-tax').value) || 0;
    const paymentMethod = document.getElementById('sale-payment-method').value;
    const notes = document.getElementById('sale-notes').value.trim();

    const saleData = {
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: document.getElementById('customer-email').value.trim() || null,
        customer_address: document.getElementById('customer-address').value.trim() || null,
        items: saleItems,
        tax_rate: taxRate,
        payment_method: paymentMethod,
        notes: notes || null
    };

    try {
        const invoice = await API.post('/api/sales', saleData);

        // Clear sale form
        saleItems = [];
        document.getElementById('customer-name').value = '';
        document.getElementById('customer-phone').value = '';
        document.getElementById('customer-email').value = '';
        document.getElementById('customer-address').value = '';
        document.getElementById('sale-notes').value = '';
        renderSaleItems();
        await populateSaleProductDropdown();

        // Show the invoice
        showInvoice(invoice.invoice_number);
        alert('Sale completed successfully!');
    } catch (error) {
        console.error('Error completing sale:', error);
        alert('Error completing sale. Please try again.');
    }
});

// ============================================================
// INVOICES MODULE
// ============================================================

async function renderInvoices() {
    try {
        const invoices = await API.get('/api/invoices');
        const search = document.getElementById('invoice-search').value.toLowerCase();
        const dateFrom = document.getElementById('invoice-date-from').value;
        const dateTo = document.getElementById('invoice-date-to').value;

        const filtered = invoices.filter(inv => {
            const matchSearch = inv.invoice_number.toLowerCase().includes(search) ||
                inv.customer_name.toLowerCase().includes(search) ||
                inv.customer_phone.includes(search);
            const invDate = inv.created_at.split('T')[0];
            const matchFrom = !dateFrom || invDate >= dateFrom;
            const matchTo = !dateTo || invDate <= dateTo;
            return matchSearch && matchFrom && matchTo;
        });

        const tbody = document.getElementById('invoices-body');
        tbody.innerHTML = filtered.map(inv => `
            <tr>
                <td><strong>${inv.invoice_number}</strong></td>
                <td>${formatDate(inv.created_at)}</td>
                <td>${escapeHtml(inv.customer_name)}</td>
                <td>${escapeHtml(inv.customer_phone)}</td>
                <td>${inv.invoice_items ? inv.invoice_items.length : 0}</td>
                <td>${inv.po_number}</td>
                <td>${formatDate(inv.po_date)}</td>
                <td>${escapeHtml(inv.billed_by)}</td>
                <td>${escapeHtml(inv.billed_to)}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="showInvoice('${inv.invoice_number}')">View</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading invoices:', error);
        alert('Error loading invoices. Please try again.');
    }
}

document.getElementById('invoice-search').addEventListener('input', renderInvoices);
document.getElementById('invoice-date-from').addEventListener('change', renderInvoices);
document.getElementById('invoice-date-to').addEventListener('change', renderInvoices);

async function showInvoice(invoiceNumber) {
    try {
        const invoices = await API.get('/api/invoices');
        const inv = invoices.find(i => i.invoice_number === invoiceNumber);
        if (!inv) {
            alert('Invoice not found');
            return;
        }

        const detail = document.getElementById('invoice-detail');
        detail.innerHTML = `
            <div class="invoice-header">
                <h1>U&I Technologies</h1>
                <p>Laptop, Desktop & Spare Parts - Sales & Service</p>
            </div>
            <div class="invoice-meta">
                <div>
                    <strong>Invoice To</strong>
                    ${escapeHtml(inv.customer_name)}<br>
                    ${inv.customer_phone ? 'Phone: ' + escapeHtml(inv.customer_phone) + '<br>' : ''}
                    ${inv.customer_email ? 'Email: ' + escapeHtml(inv.customer_email) + '<br>' : ''}
                    ${inv.customer_address ? escapeHtml(inv.customer_address) : ''}
                </div>
                <div style="text-align:right;">
                    <strong>Invoice Details</strong>
                    Invoice #: ${inv.invoice_number}<br>
                    Date: ${formatDate(inv.created_at)}<br>
                    Payment: ${inv.payment_method}
                </div>
            </div>
            <table class="invoice-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Product</th>
                        <th>Price</th>
                        <th>Qty</th>
                        <th>Discount</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${inv.invoice_items ? inv.invoice_items.map((item, i) => {
                        const itemTotal = item.price * item.quantity * (1 - item.discount / 100);
                        return `
                            <tr>
                                <td>${i + 1}</td>
                                <td>${escapeHtml(item.product_name)} (${escapeHtml(item.product_brand || '')} ${escapeHtml(item.product_model || '')})</td>
                                <td>&#8377;${formatNum(item.price)}</td>
                                <td>${item.quantity}</td>
                                <td>${item.discount}%</td>
                                <td>&#8377;${formatNum(itemTotal)}</td>
                            </tr>
                        `;
                    }).join('') : ''}
                </tbody>
            </table>
            <div class="invoice-totals">
                <table>
                    <tr>
                        <td>Subtotal:</td>
                        <td style="text-align:right">&#8377;${formatNum(inv.subtotal)}</td>
                    </tr>
                    <tr>
                        <td>Tax (GST ${inv.tax_rate}%):</td>
                        <td style="text-align:right">&#8377;${formatNum(inv.tax_amount)}</td>
                    </tr>
                    <tr class="grand-total">
                        <td>Grand Total:</td>
                        <td style="text-align:right">&#8377;${formatNum(inv.grand_total)}</td>
                    </tr>
                </table>
            </div>
            ${inv.notes ? `<p style="margin-top:16px;font-size:13px;color:#64748b"><strong>Notes:</strong> ${escapeHtml(inv.notes)}</p>` : ''}
            <div class="invoice-footer">
                <p>Thank you for your business!</p>
            </div>
        `;

        document.getElementById('invoice-modal').classList.add('active');
    } catch (error) {
        console.error('Error loading invoice:', error);
        alert('Error loading invoice. Please try again.');
    }
}

// Close invoice modal
document.getElementById('close-invoice-modal').addEventListener('click', () => {
    document.getElementById('invoice-modal').classList.remove('active');
});

// Print invoice
document.getElementById('btn-print-invoice').addEventListener('click', () => {
    window.print();
});

// ============================================================
// DASHBOARD MODULE
// ============================================================

async function refreshDashboard() {
    try {
        const stats = await API.get('/api/dashboard');

        document.getElementById('stat-total-products').textContent = stats.totalProducts;
        document.getElementById('stat-laptops').textContent = stats.laptops;
        document.getElementById('stat-desktops').textContent = stats.desktops;
        document.getElementById('stat-parts').textContent = stats.spareParts;
        document.getElementById('stat-total-sales').textContent = stats.totalSales;
        document.getElementById('stat-revenue').innerHTML = '&#8377;' + formatNum(stats.revenue);

        // Recent sales (last 5)
        document.getElementById('recent-sales-body').innerHTML = stats.recentSales.map(inv => `
            <tr>
                <td><strong>${inv.invoice_number}</strong></td>
                <td>${escapeHtml(inv.customer_name)}</td>
                <td>${formatDate(inv.created_at)}</td>
                <td>&#8377;${formatNum(inv.grand_total)}</td>
            </tr>
        `).join('') || '<tr><td colspan="4" style="text-align:center;color:#94a3b8">No sales yet</td></tr>';

        // Low stock (stock <= 3)
        document.getElementById('low-stock-body').innerHTML = stats.lowStock.map(p => `
            <tr>
                <td>${escapeHtml(p.name)}</td>
                <td>${escapeHtml(p.category)}</td>
                <td class="stock-low">${p.stock}</td>
            </tr>
        `).join('') || '<tr><td colspan="3" style="text-align:center;color:#94a3b8">All items well stocked</td></tr>';
    } catch (error) {
        console.error('Error loading dashboard:', error);
        alert('Error loading dashboard. Please try again.');
    }
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function formatNum(num) {
    return Number(num).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(isoString) {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Close modals on outside click
document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
});

// ============================================================
// INITIAL LOAD
// ============================================================

// Initialize dashboard on page load
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await refreshDashboard();
    } catch (error) {
        console.error('Error loading initial dashboard:', error);
    }
});