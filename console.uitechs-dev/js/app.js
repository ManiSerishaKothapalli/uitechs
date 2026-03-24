// ============================================================
// U&I Technologies - Sales & Service Management App
// ============================================================

// ============================================================
// SUPABASE AUTH - Real-time Authentication
// ============================================================

const SUPABASE_URL = 'https://hzwubwybxhettasvgquz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_24AsJTqdMuyT9r8IR8Spcg_7LXUmvTj';

// Initialize Supabase client
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;

function showLoginPage() {
    document.getElementById('login-page').style.display = 'flex';
    document.getElementById('main-app').style.display = 'none';
    document.getElementById('login-page').classList.remove('hidden');
    document.getElementById('main-app').classList.add('hidden');
}

function showMainApp() {
    document.getElementById('login-page').style.display = 'none';
    document.getElementById('main-app').style.display = 'flex';
    document.getElementById('login-page').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
}

// Real-time auth state listener — fires on login, logout, tab switch, token refresh
supabaseClient.auth.onAuthStateChange(async (event, session) => {
    console.log('Auth event:', event, 'Session:', !!session);

    if (session) {
        currentUser = session.user;
        const mainApp = document.getElementById('main-app');
        
        // Ensure main app is visible if a session exists
        if (mainApp && (mainApp.style.display === 'none' || mainApp.classList.contains('hidden'))) {
            showMainApp();
            updateUserInfoInSidebar(session.user);
        }

        // Use a persistent flag to avoid duplicate loads across multiple auth events
        // INITIAL_SESSION and SIGNED_IN often fire together on page load/login
        if (!window.initialLoadDone && (event === 'INITIAL_SESSION' || event === 'SIGNED_IN')) {
            window.initialLoadDone = true;
            console.log('Triggering initial loadCurrentPage');
            await loadCurrentPage();
        }
    } else {
        currentUser = null;
        window.initialLoadDone = false; // Reset on logout
        const loginPage = document.getElementById('login-page');
        if (loginPage && (loginPage.style.display === 'none' || loginPage.classList.contains('hidden'))) {
            showLoginPage();
        }
    }
});

// Login with email + password via Supabase Auth
async function login(email, password) {
    console.log('Attempting login for:', email);
    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) {
            console.error('Login error details:', error);
            return { success: false, message: error.message };
        }
        console.log('Login successful:', data);
        return { success: true };
    } catch (err) {
        console.error('Unexpected login error:', err);
        return { success: false, message: 'An unexpected error occurred.' };
    }
}

// Logout via Supabase Auth
async function logout() {
    await supabaseClient.auth.signOut();
    showLoginPage();
}

// Update sidebar with logged-in user info
function updateUserInfoInSidebar(user) {
    const footer = document.getElementById('sidebar-user-info');
    if (footer) {
        footer.textContent = user.email;
    }
}

// Load the correct page based on URL
async function loadCurrentPage() {
    try {
        showLoader();
        const path = window.location.pathname;
        const page = path.replace('/', '') || 'dashboard';

        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

        const activeLink = document.querySelector(`.nav-link[data-page="${page}"]`) ||
                           document.querySelector(`.nav-link[data-page="dashboard"]`);
        if (activeLink) activeLink.classList.add('active');

        const activePage = document.getElementById(`page-${page}`) ||
                           document.getElementById('page-dashboard');
        if (activePage) activePage.classList.add('active');

        if (page === 'dashboard') await refreshDashboard();
        else if (page === 'inventory') await renderInventory();
        else if (page === 'sales') await initializeSalesPage();
        else if (page === 'invoices') await renderInvoices();
        else await refreshDashboard();

    } catch (error) {
        console.error('Error loading page:', error);
    } finally {
        hideLoader();
    }
}

// Login form submission
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    console.log('Login form submitted for:', email);
    clearAllErrors();

    let hasErrors = false;
    if (!email) { showFieldError('username', 'Please enter your email.'); hasErrors = true; }
    if (!password) { showFieldError('password', 'Please enter your password.'); hasErrors = true; }
    if (hasErrors) return;

    const loginBtn = e.target.querySelector('button[type="submit"]');
    const originalText = loginBtn.textContent;
    loginBtn.textContent = 'Logging in...';
    loginBtn.disabled = true;

    try {
        const result = await login(email, password);
        console.log('Login result in form handler:', result);

        if (!result.success) {
            // Display the actual error message from Supabase
            showFieldError('password', result.message || 'Invalid email or password.');
            toastr.error(result.message || 'Login failed');
        }
    } catch (err) {
        console.error('Form submission error:', err);
        showFieldError('password', 'An error occurred during login.');
    } finally {
        loginBtn.textContent = originalText;
        loginBtn.disabled = false;
    }
});

// Logout button
document.getElementById('logout-btn').addEventListener('click', async () => {
    await logout();
});

// Clear errors on input
document.getElementById('username').addEventListener('input', () => clearError('username'));
document.getElementById('password').addEventListener('input', () => clearError('password'));

// Password toggle
document.getElementById('password-toggle').addEventListener('click', () => {
    const passwordInput = document.getElementById('password');
    const eyeOpen = document.querySelector('.eye-open');
    const eyeClosed = document.querySelector('.eye-closed');
    const toggleButton = document.getElementById('password-toggle');

    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        eyeOpen.style.display = 'none';
        eyeClosed.style.display = 'block';
        toggleButton.setAttribute('data-tooltip', 'Hide password');
    } else {
        passwordInput.type = 'password';
        eyeOpen.style.display = 'block';
        eyeClosed.style.display = 'none';
        toggleButton.setAttribute('data-tooltip', 'Show password');
    }
});

// Field-level error helper (for login form inputs)
function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    const errorEl = document.getElementById(`${fieldId}-error`);
    if (field) field.classList.add('error');
    if (errorEl) errorEl.textContent = message;
}

// Configure toastr
toastr.options = {
    "closeButton": true,
    "debug": false,
    "newestOnTop": true,
    "progressBar": true,
    "positionClass": "toast-top-center",
    "preventDuplicates": false,
    "onclick": null,
    "showDuration": "300",
    "hideDuration": "1000",
    "timeOut": "5000",
    "extendedTimeOut": "1000",
    "showEasing": "swing",
    "hideEasing": "linear",
    "showMethod": "fadeIn",
    "hideMethod": "fadeOut"
};

// Notification helper functions
function showSuccess(message) {
    toastr.success(message);
}

function showError(message) {
    toastr.error(message);
}

function showInfo(message) {
    toastr.info(message);
}

function showWarning(message) {
    toastr.warning(message);
}

// Custom confirm function using toastr
function showConfirm(message, onConfirm, onCancel = null) {
    toastr.warning(`<div>${message}</div><button class="btn btn-primary btn-sm" style="margin-right:10px;" onclick="confirmAction()">Yes</button><button class="btn btn-secondary btn-sm" onclick="cancelAction()">No</button>`, '', {
        "timeOut": 0,
        "extendedTimeOut": 0,
        "allowHtml": true,
        "tapToDismiss": false
    });
    
    window.confirmCallback = onConfirm;
    window.cancelCallback = onCancel;
}

window.confirmAction = function() {
    if (window.confirmCallback) {
        window.confirmCallback();
        toastr.clear();
    }
};

window.cancelAction = function() {
    if (window.cancelCallback) {
        window.cancelCallback();
    }
    toastr.clear();
};

function showLoader() {
    const loader = document.getElementById('loader');
    if (loader) {
        loader.classList.remove('hidden');
    }
}

function hideLoader() {
    const loader = document.getElementById('loader');
    if (loader) {
        loader.classList.add('hidden');
    }
}

// ============================================================
// API HELPERS
// ============================================================

const API = {
    async get(endpoint, useLoader = true) {
        if (useLoader) showLoader();
        try {
            const response = await fetch(endpoint);
            if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        } finally {
            if (useLoader) hideLoader();
        }
    },

    async post(endpoint, data, useLoader = true) {
        if (useLoader) showLoader();
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        } finally {
            if (useLoader) hideLoader();
        }
    },

    async put(endpoint, data, useLoader = true) {
        if (useLoader) showLoader();
        try {
            const response = await fetch(endpoint, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        } finally {
            if (useLoader) hideLoader();
        }
    },

    async delete(endpoint, useLoader = true) {
        if (useLoader) showLoader();
        try {
            const response = await fetch(endpoint, {
                method: 'DELETE'
            });
            if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        } finally {
            if (useLoader) hideLoader();
        }
    }
};

// ============================================================
// INVENTORY MODULE
// ============================================================

async function getProducts() {
    try {
        return await API.get('/api/products');
    } catch (error) {
        console.error('Error fetching products:', error);
        showError('Error loading products. Please try again.');
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
                <td>&#8377;${formatNum(p.purchase_price)}</td>
                <td>&#8377;${formatNum(p.selling_price)}</td>
                <td class="${p.stock <= 3 ? 'stock-low' : 'stock-ok'}" data-product-stock="${p.id}">${p.stock}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="editProduct('${p.id}')">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteProduct('${p.id}')">Delete</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error rendering inventory:', error);
        showError('Error loading inventory. Please try again.');
    }
}

// Search & Filter listeners
document.getElementById('inventory-search').addEventListener('input', renderInventory);
document.getElementById('inventory-filter').addEventListener('change', renderInventory);

// FIXED: Stock quantity change listener for serial numbers
document.getElementById('product-stock').addEventListener('input', function(e) {
    e.stopPropagation(); // Prevent event bubbling to modal
    const quantity = parseInt(this.value) || 0;
    updateSerialNumberFields(quantity);
});

// FIXED: Also handle blur for when user tabs out
document.getElementById('product-stock').addEventListener('blur', function(e) {
    e.stopPropagation(); // Prevent event bubbling to modal
    const quantity = parseInt(this.value) || 0;
    updateSerialNumberFields(quantity);
});

// FIXED: Prevent form submission on Enter key
document.getElementById('product-stock').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault(); // This prevents form submission
        e.stopPropagation(); // Stop event from bubbling up
        this.blur(); // Trigger blur event to update serial inputs
        return false; // Extra safety
    }
});

// FIXED: Helper function to update serial number fields
function updateSerialNumberFields(quantity) {
    const serialContainer = document.getElementById('serial-numbers-container');
    const serialList = document.getElementById('serial-numbers-list');
    const singleSerialFormGroup = document.getElementById('product-serial').closest('.form-group');

    if (quantity > 1) {
        singleSerialFormGroup.style.display = 'none';
        serialContainer.style.display = 'block';

        serialList.innerHTML = '';
        
        // Add label header
        const label = document.createElement('label');
        label.textContent = 'Serial Numbers';
        label.style.display = 'block';
        label.style.marginBottom = '8px';
        label.style.fontWeight = '500';
        label.style.fontSize = '14px';
        serialList.appendChild(label);

        for (let i = 1; i <= quantity; i++) {
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'input-field';
            input.placeholder = `Serial Number ${i}`;
            input.id = `serial-${i}`;
            input.style.marginBottom = '8px';
            serialList.appendChild(input);
        }
    } else {
        // Show single serial form-group again
        singleSerialFormGroup.style.display = 'block';
        serialContainer.style.display = 'none';
        serialList.innerHTML = '';
    }
}

// Add Product button
document.getElementById('btn-add-product').addEventListener('click', () => {
    document.getElementById('product-modal-title').textContent = 'Add Product';
    document.getElementById('product-form').reset();
    document.getElementById('product-id').value = '';
    
    // Reset serial number inputs
    document.getElementById('serial-numbers-container').style.display = 'none';
    document.getElementById('serial-numbers-list').innerHTML = '';
    document.getElementById('product-serial').closest('.form-group').style.display = 'block';
    
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
    const quantity = parseInt(document.getElementById('product-stock').value) || 0;
    
    let serialNumbers = '';
    if (quantity > 1) {
        // Collect multiple serial numbers
        const serials = [];
        for (let i = 1; i <= quantity; i++) {
            const serialInput = document.getElementById(`serial-${i}`);
            if (serialInput && serialInput.value.trim()) {
                serials.push(serialInput.value.trim());
            }
        }
        serialNumbers = serials.join(', ');
    } else {
        // Single serial number
        serialNumbers = document.getElementById('product-serial').value.trim();
    }

    const productData = {
        name: document.getElementById('product-name').value.trim(),
        category: document.getElementById('product-category').value,
        brand: document.getElementById('product-brand').value.trim(),
        model: document.getElementById('product-model').value.trim(),
        serial_number: serialNumbers,
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
        await refreshInventoryData(); // Refresh sales dropdown too
        showSuccess(id ? 'Product updated successfully!' : 'Product added successfully!');
    } catch (error) {
        console.error('Error saving product:', error);
        showError('Error saving product. Please try again.');
    }
});

async function editProduct(id) {
    try {
        const products = await API.get('/api/products', false); // Don't show loader for modal data
        const p = products.find(prod => prod.id === id);
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
        
        // Handle serial number display based on stock quantity
        const quantity = p.stock || 0;
        if (quantity > 1) {
            updateSerialNumberFields(quantity);
            // Populate serial numbers if they exist
            const serials = p.serial_number ? p.serial_number.split(',').map(s => s.trim()) : [];
            for (let i = 1; i <= quantity; i++) {
                const input = document.getElementById(`serial-${i}`);
                if (input && serials[i-1]) {
                    input.value = serials[i-1];
                }
            }
        }
        
        document.getElementById('product-modal').classList.add('active');
    } catch (error) {
        console.error('Error loading product for edit:', error);
        showError('Error loading product. Please try again.');
    }
}

async function deleteProduct(id) {
    // Show delete confirmation modal
    const modal = document.getElementById('delete-confirm-modal');
    modal.classList.add('active');
    
    // Store the product ID for later use
    window.productToDelete = id;
}

// ============================================================
// SALES MODULE
// ============================================================

let saleItems = [];

// Session storage functions for sale items
function saveSaleItemsToSession() {
    sessionStorage.setItem('saleItems', JSON.stringify(saleItems));
}

function loadSaleItemsFromSession() {
    const saved = sessionStorage.getItem('saleItems');
    if (saved) {
        try {
            saleItems = JSON.parse(saved);
            renderSaleItems();
            // Reserve stock for loaded items
            reserveStockForSaleItems();
        } catch (error) {
            console.error('Error loading sale items from session:', error);
            saleItems = [];
        }
    }
}

function clearSaleItemsFromSession() {
    sessionStorage.removeItem('saleItems');
}

// Inventory management functions
async function reserveStockForSaleItems() {
    for (const item of saleItems) {
        try {
            // Get current product data from database
            const products = await API.get('/api/products', false);
            const product = products.find(p => p.id === item.product_id);
            if (product && product.stock >= item.qty) {
                // Update local display to show reserved stock
                updateLocalStockDisplay(item.product_id, product.stock - item.qty);
            }
        } catch (error) {
            console.error('Error reserving stock:', error);
        }
    }
}

function updateLocalStockDisplay(productId, newStock) {
    // Update stock display in inventory table (if on inventory page)
    const stockCells = document.querySelectorAll(`[data-product-stock="${productId}"]`);
    stockCells.forEach(cell => {
        cell.textContent = newStock;
        cell.className = newStock <= 3 ? 'stock-low' : 'stock-ok';
    });
    
    // Update stock in product dropdown (if on sales page)
    const select = document.getElementById('sale-product-select');
    if (select) {
        const options = select.querySelectorAll('option');
        options.forEach(option => {
            if (option.value === productId) {
                const productText = option.textContent;
                const updatedText = productText.replace(/\(Stock: \d+\)/, `(Stock: ${newStock})`);
                option.textContent = updatedText;
            }
        });
    }
}

async function releaseStockForItem(productId, quantity) {
    try {
        // Get current product data from database
        const products = await API.get('/api/products', false);
        const product = products.find(p => p.id === productId);
        if (product) {
            updateLocalStockDisplay(productId, product.stock + quantity);
        }
    } catch (error) {
        console.error('Error releasing stock:', error);
    }
}

async function refreshInventoryData() {
    // Refresh inventory data from database
    if (document.getElementById('page-inventory')?.classList.contains('active')) {
        await renderInventory();
    }
    // Refresh sales dropdown data
    if (document.getElementById('page-sales')?.classList.contains('active')) {
        await populateSaleProductDropdown();
    }
}

async function initializeSalesPage() {
    try {
        await populateSaleProductDropdown();
        loadSaleItemsFromSession(); // Load saved sale items
        hideLoader(); // Explicitly hide loader since we're not making API calls that show it
    } catch (error) {
        console.error('Error initializing sales page:', error);
        hideLoader(); // Hide loader even on error
        showError('Error loading sales page. Please try again.');
    }
}

async function populateSaleProductDropdown() {
    try {
        const products = await API.get('/api/products', false); // Don't show loader for dropdown data
        const availableProducts = products.filter(p => p.stock > 0);
        const select = document.getElementById('sale-product-select');
        select.innerHTML = '<option value="">Select Product</option>' +
            availableProducts.map(p => `<option value="${p.id}">${escapeHtml(p.name)} - ${escapeHtml(p.brand || '')} ${escapeHtml(p.model || '')} (Stock: ${p.stock}) - &#8377;${formatNum(p.selling_price)}</option>`).join('');
    } catch (error) {
        console.error('Error loading products for sale:', error);
        showError('Error loading products. Please try again.');
    }
}

document.getElementById('btn-add-sale-item').addEventListener('click', async () => {
    const productId = document.getElementById('sale-product-select').value;
    const qty = parseInt(document.getElementById('sale-qty').value) || 1;
    const discount = parseFloat(document.getElementById('sale-discount').value) || 0;

    if (!productId) {
        return;
    }

    try {
        const products = await API.get('/api/products', false);
        const product = products.find(p => p.id === productId);
        if (!product) return;

        if (qty > product.stock) {
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
            total: product.selling_price * qty * (1 - discount / 100)
        });

        document.getElementById('sale-product-select').value = '';
        document.getElementById('sale-qty').value = 1;
        document.getElementById('sale-discount').value = 0;

        renderSaleItems();
        saveSaleItemsToSession();
        updateLocalStockDisplay(product.id, product.stock - qty);
        showSuccess(`${product.name} added to sale successfully!`);
    } catch (error) {
        console.error('Error adding sale item:', error);
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
    // Show remove confirmation modal
    const modal = document.getElementById('remove-item-modal');
    modal.classList.add('active');
    
    // Store the item index for later use
    window.itemToRemove = index;
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

// Real-time validation for phone number
document.getElementById('customer-phone').addEventListener('input', (e) => {
    const value = e.target.value;
    const cleaned = value.replace(/\D/g, ''); // Remove non-digits
    
    // Clear previous error
    clearError('customer-phone');
    
    // Limit to 10 digits
    if (cleaned.length > 10) {
        e.target.value = cleaned.slice(0, 10);
    } else {
        e.target.value = cleaned;
    }
    
    // Format as XXXXX-XXXXX when 10 digits
    if (cleaned.length === 10) {
        e.target.value = formatPhoneNumber(cleaned);
    }
    
    // Validate if 10 digits
    if (cleaned.length === 10 && !validatePhoneNumber(cleaned)) {
        showError('customer-phone', 'Please enter a valid 10-digit phone number starting with 6-9');
    }
});

// Real-time validation for email
document.getElementById('customer-email').addEventListener('blur', (e) => {
    const email = e.target.value.trim();
    clearError('customer-email');
    
    if (email && !validateEmail(email)) {
        showError('customer-email', 'Please enter a valid email address');
    }
});

// Clear errors on input
document.getElementById('customer-name').addEventListener('input', () => {
    clearError('customer-name');
});

document.getElementById('customer-email').addEventListener('input', () => {
    clearError('customer-email');
});

// Complete Sale
document.getElementById('btn-complete-sale').addEventListener('click', async () => {
    const customerName = document.getElementById('customer-name').value.trim();
    const customerPhone = document.getElementById('customer-phone').value.trim();
    const customerEmail = document.getElementById('customer-email').value.trim();

    // Clear all previous errors
    clearAllErrors();
    
    let hasErrors = false;

    if (!customerName) {
        showError('customer-name', 'Please enter customer name.');
        hasErrors = true;
    }
    
    if (!customerPhone) {
        showError('customer-phone', 'Please enter customer phone number.');
        hasErrors = true;
    } else if (!validatePhoneNumber(customerPhone)) {
        showError('customer-phone', 'Please enter a valid 10-digit phone number starting with 6-9.');
        hasErrors = true;
    }
    
    if (!validateEmail(customerEmail)) {
        showError('customer-email', 'Please enter a valid email address.');
        hasErrors = true;
    }
    
    if (saleItems.length === 0) {
        showError('Please add at least one item to the sale.');
        hasErrors = true;
    }
    
    if (hasErrors) {
        return;
    }

    const taxRate = parseFloat(document.getElementById('sale-tax').value) || 0;
    const notes = document.getElementById('sale-notes').value.trim();

    const saleData = {
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: document.getElementById('customer-email').value.trim() || null,
        customer_address: document.getElementById('customer-address').value.trim() || null,
        items: saleItems,
        tax_rate: taxRate,
        notes: notes || null
    };

    try {
        const invoice = await API.post('/api/sales', saleData);

        // Clear sale form
        // Clear sale items and session
        saleItems = [];
        clearSaleItemsFromSession();
        renderSaleItems();
        await populateSaleProductDropdown();

        // Show the invoice
        showInvoice(invoice.invoice_number);
        showSuccess('Sale completed successfully!');
    } catch (error) {
        console.error('Error completing sale:', error);
        showError('Error completing sale. Please try again.');
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
        tbody.innerHTML = filtered.map(inv => {
            // Determine payment status
            // const paymentStatus = inv.payment_status || 'pending';
            // const paymentStatusClass = paymentStatus === 'paid' ? 'status-paid' : 'status-pending';
            // const paymentStatusText = paymentStatus === 'paid' ? 'Paid' : 'Pending';
            
            return `
            <tr>
                <td><strong>${inv.invoice_number}</strong></td>
                <td>${formatDate(inv.created_at)}</td>
                <td>${escapeHtml(inv.customer_name)}</td>
                <td>${escapeHtml(inv.customer_phone)}</td>
                <td>${inv.invoice_items ? inv.invoice_items.length : 0}</td>
                <td>&#8377;${formatNum(inv.grand_total)}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="showInvoice('${inv.invoice_number}')">View</button>
                </td>
            </tr>
        `;
        }).join('');
    } catch (error) {
        console.error('Error loading invoices:', error);
        showError('Error loading invoices. Please try again.');
    }
}

document.getElementById('invoice-search').addEventListener('input', renderInvoices);
document.getElementById('invoice-date-from').addEventListener('change', renderInvoices);
document.getElementById('invoice-date-to').addEventListener('change', renderInvoices);

async function showInvoice(invoiceNumber) {
    try {
        showLoader(); // Show loader while fetching invoice data
        
        const invoices = await API.get('/api/invoices', false); // Don't show loader for modal data
        const inv = invoices.find(i => i.invoice_number === invoiceNumber);
        if (!inv) {
            hideLoader();
            showError('Invoice not found');
            return;
        }

        const detail = document.getElementById('invoice-detail');
        detail.innerHTML = `
            <div class="invoice-container">
                <!-- Invoice Header -->
                <div class="invoice-header-section">
                    <div class="invoice-left">
                        <div class="invoice-title">
                            <h1>Invoice</h1>
                            <h2>Sales of Service</h2>
                        </div>
                        <div class="invoice-details-left">
                            <div class="detail-row">
                                <span>Invoice No #:</span>
                                <span>${inv.invoice_number}</span>
                            </div>
                            <div class="detail-row">
                                <span>Invoice Date:</span>
                                <span>${formatDate(inv.created_at)}</span>
                            </div>
                        </div>
                    </div>
                    <div class="invoice-right">
                        <div class="company-logo">
                            <div class="logo-circle">U&IT</div>
                            <div class="company-name">
                                <strong>U & I Technologies</strong><br>
                                <span>Solutions for every needs</span>
                            </div>
                        </div>
                        <div class="invoice-details-right">
                            <div class="detail-row">
                                <span>PO Number #:</span>
                                <span>PO-${inv.invoice_number}</span>
                            </div>
                            <div class="detail-row">
                                <span>PO Date:</span>
                                <span>${formatDate(inv.created_at)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Billed By and Billed To -->
                <div class="invoice-parties">
                    <div class="billed-by">
                        <h3>Billed By:</h3>
                        <div class="party-details">
                            <p><strong>U&I Technologies</strong></p>
                            <p>66, Nagappa Block, 3rd Cross, Srirampura</p>
                            <p>Bengaluru, karnataka- 560021</p>
                            <p>Bengaluru</p>
                            <p>GSTIN: 29KTTPS2968P1ZX</p>
                            <p>PAN: KTTPS2968P</p>
                            <p>Email: uitechsup@gmail.com</p>
                            <p>Mobile: +91 9606752864</p>
                        </div>
                    </div>
                    <div class="billed-to">
                        <h3>Billed To:</h3>
                        <div class="party-details">
                            <p><strong>${escapeHtml(inv.customer_name)}</strong></p>
                            ${inv.customer_address ? `<p>${escapeHtml(inv.customer_address)}</p>` : ''}
                            <p>Mobile: ${escapeHtml(inv.customer_phone)}</p>
                            ${inv.customer_email ? `<p>Email: ${escapeHtml(inv.customer_email)}</p>` : ''}
                            <p>GSTIN: N/A</p>
                            <p>PAN: N/A</p>
                        </div>
                    </div>
                </div>

                <!-- Items Table -->
                <table class="invoice-items-table">
                    <thead>
                        <tr>
                            <th>SI No</th>
                            <th>Descriptions</th>
                            <th>GST Rate</th>
                            <th>Quantity</th>
                            <th>Rate</th>
                            <th>Amount</th>
                            <th>CGST</th>
                            <th>SGST</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${inv.invoice_items ? inv.invoice_items.map((item, i) => {
                        const itemTotal = item.price * item.quantity * (1 - item.discount / 100);
                        const gstRate = inv.tax_rate || 0;
                        const cgst = (itemTotal * gstRate / 100) / 2;
                        const sgst = (itemTotal * gstRate / 100) / 2;
                        const hsnCode = item.product_brand === 'Samsung' ? '8517' : item.product_brand === 'Google' ? '8517' : item.product_brand === 'Apple' ? '8517' : '8517';
                        const serialNumber = item.product_model || `SSTS-AMD-${1000 + i}`;
                        return `
                            <tr>
                                <td>${i + 1}</td>
                                <td>${escapeHtml(item.product_name)} ${serialNumber}<br><small>${hsnCode}</small></td>
                                <td>${gstRate}%</td>
                                <td>${item.quantity}</td>
                                <td>&#8377;${formatNum(item.price)}</td>
                                <td>&#8377;${formatNum(item.price * item.quantity)}</td>
                                <td>&#8377;${formatNum(cgst)}</td>
                                <td>&#8377;${formatNum(sgst)}</td>
                                <td>&#8377;${formatNum(itemTotal)}</td>
                            </tr>
                        `;
                    }).join('') : ''}
                    </tbody>
                </table>

                <!-- Bank Details and Total -->
                <div class="invoice-footer-section">
                    <div class="bank-details">
                        <h3>Bank Details</h3>
                        <div class="bank-info">
                            <div class="bank-row">
                                <span>Account Holder Name:</span>
                                <span>U&I Technologies</span>
                            </div>
                            <div class="bank-row">
                                <span>Account Number:</span>
                                <span>50200057871189</span>
                            </div>
                            <div class="bank-row">
                                <span>IFSC:</span>
                                <span>HSBC0600002</span>
                            </div>
                            <div class="bank-row">
                                <span>Account Type:</span>
                                <span>Current Account</span>
                            </div>
                            <div class="bank-row">
                                <span>Bank Name:</span>
                                <span>HSBC Bank</span>
                            </div>
                        </div>
                    </div>
                    <div class="total-section">
                        <h3>Total (INR)</h3>
                        <div class="total-info">
                            <div class="total-row">
                                <span>Amount:</span>
                                <span>&#8377;${formatNum(inv.subtotal)}</span>
                            </div>
                            <div class="total-row">
                                <span>SGST:</span>
                                <span>&#8377;${formatNum(inv.tax_amount / 2)}</span>
                            </div>
                            <div class="total-row">
                                <span>CGST:</span>
                                <span>&#8377;${formatNum(inv.tax_amount / 2)}</span>
                            </div>
                            <div class="total-row grand-total-row">
                                <span>Total (INR):</span>
                                <span>&#8377;${formatNum(inv.grand_total)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Footer Note -->
                <div class="invoice-note">
                    <p>This is Computer Generated Document doesn't Require signature</p>
                </div>
            </div>
        `;

        document.getElementById('invoice-modal').classList.add('active');
        hideLoader(); // Hide loader after modal is shown
    } catch (error) {
        console.error('Error loading invoice:', error);
        hideLoader(); // Hide loader even on error
        showError('Error loading invoice. Please try again.');
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
        document.getElementById('stat-parts').textContent = stats.accessories;
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
        showError('Error loading dashboard. Please try again.');
    }
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

// Validation functions
function validatePhoneNumber(phone) {
    // Remove spaces, dashes, parentheses
    const cleanPhone = phone.replace(/\s+/g, '').replace(/[-()]/g, '');
    
    // Check if it's a valid Indian phone number (10 digits starting with 6-9)
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(cleanPhone);
}

function validateEmail(email) {
    if (!email) return true; // Email is optional
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function formatPhoneNumber(input) {
    // Format as XXXXX-XXXXX for better readability
    const cleaned = input.replace(/\D/g, '');
    if (cleaned.length === 10) {
        return cleaned.slice(0, 5) + '-' + cleaned.slice(5);
    }
    return cleaned;
}

// Inline error message functions
function showError(fieldId, message) {
    const field = document.getElementById(fieldId);
    const errorElement = document.getElementById(fieldId + '-error');
    
    if (field && errorElement) {
        field.classList.add('error');
        errorElement.textContent = message;
    }
}

function clearError(fieldId) {
    const field = document.getElementById(fieldId);
    const errorElement = document.getElementById(fieldId + '-error');
    
    if (field && errorElement) {
        field.classList.remove('error');
        errorElement.textContent = '';
    }
}

function clearAllErrors() {
    const errorElements = document.querySelectorAll('.error-message');
    const errorFields = document.querySelectorAll('.input-field.error');
    
    errorElements.forEach(el => el.textContent = '');
    errorFields.forEach(el => el.classList.remove('error'));
}

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


// Delete confirmation modal event listeners
document.getElementById('close-delete-modal').addEventListener('click', () => {
    document.getElementById('delete-confirm-modal').classList.remove('active');
    window.productToDelete = null;
});

document.getElementById('cancel-delete').addEventListener('click', () => {
    document.getElementById('delete-confirm-modal').classList.remove('active');
    window.productToDelete = null;
});

document.getElementById('confirm-delete').addEventListener('click', async () => {
    const productId = window.productToDelete;
    if (productId) {
        try {
            await API.delete(`/api/products/${productId}`);
            await renderInventory();
            await refreshInventoryData(); // Refresh sales dropdown too
            showSuccess('Product deleted successfully!');
        } catch (error) {
            console.error('Error deleting product:', error);
            showError('Error deleting product. Please try again.');
        }
    }
    
    // Close modal and clear stored ID
    document.getElementById('delete-confirm-modal').classList.remove('active');
    window.productToDelete = null;
});

// Remove item confirmation modal event listeners
document.getElementById('close-remove-modal').addEventListener('click', () => {
    document.getElementById('remove-item-modal').classList.remove('active');
    window.itemToRemove = null;
});

document.getElementById('cancel-remove').addEventListener('click', () => {
    document.getElementById('remove-item-modal').classList.remove('active');
    window.itemToRemove = null;
});

document.getElementById('confirm-remove').addEventListener('click', () => {
    const itemIndex = window.itemToRemove;
    if (itemIndex !== null && itemIndex !== undefined) {
        const item = saleItems[itemIndex];
        saleItems.splice(itemIndex, 1);
        renderSaleItems();
        saveSaleItemsToSession(); // Save to session storage
        releaseStockForItem(item.product_id, item.qty); // Release stock back
        showInfo('Item removed from sale.');
    }
    
    // Close modal and clear stored index
    document.getElementById('remove-item-modal').classList.remove('active');
    window.itemToRemove = null;
});

// Logout button event listener
document.getElementById('logout-btn').addEventListener('click', () => {
    logout();
});

// ============================================================
// INITIAL LOAD
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
    // We only need to show the correct initial state. 
    // The onAuthStateChange listener will handle the actual data loading (loadCurrentPage)
    // when it fires INITIAL_SESSION or SIGNED_IN.
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        currentUser = session.user;
        const mainApp = document.getElementById('main-app');
        if (mainApp && (mainApp.style.display === 'none' || mainApp.classList.contains('hidden'))) {
            showMainApp();
            updateUserInfoInSidebar(session.user);
        }
    } else {
        const loginPage = document.getElementById('login-page');
        if (loginPage && (loginPage.style.display === 'none' || loginPage.classList.contains('hidden'))) {
            showLoginPage();
        }
    }
});