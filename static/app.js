// API Configuration
const API_BASE = '/api';

// State
let currentUser = null;
let token = null;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    // Check for existing token
    token = localStorage.getItem('token');
    if (token) {
        verifyToken();
    } else {
        showLoginPage();
    }

    // Event listeners
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => navigateTo(item.dataset.page));
    });

    // Filters
    document.getElementById('walkins-filter').addEventListener('change', loadWalkins);
    document.getElementById('parties-filter').addEventListener('change', loadParties);
    document.getElementById('packages-filter').addEventListener('change', loadPackages);

    // Modal close on overlay click
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
        if (e.target.id === 'modal-overlay') closeModal();
    });
});

// API Helper
async function apiCall(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
        }
    };

    if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
    }

    if (body) {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_BASE}${endpoint}`, options);
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'API Error');
    }

    return data;
}

// Format update history for display
function formatUpdateHistory(historyStr) {
    if (!historyStr) return '<p style="color:#64748b;">No update history</p>';
    
    const entries = historyStr.split(';').filter(e => e);
    if (entries.length === 0) return '<p style="color:#64748b;">No update history</p>';
    
    return entries.map(entry => {
        const parts = entry.split('|');
        const username = parts[0] || 'unknown';
        const timestamp = parts[1] || '';
        const action = parts[2] || 'edit';
        
        let formattedDate = '';
        if (timestamp) {
            const date = new Date(timestamp);
            formattedDate = date.toLocaleString('en-IN', { 
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit', hour12: true 
            });
        }
        
        const actionLabel = action === 'checkout' ? '🚪 Checkout' : 
                           action === 'use-visit' ? '✅ Used Visit' : '✏️ Edited';
        
        return `<div class="history-entry">
            <span class="history-user">${escapeHtml(username)}</span>
            <span class="history-action">${actionLabel}</span>
            <span class="history-date">${formattedDate}</span>
        </div>`;
    }).reverse().join(''); // Show newest first
}

function showUpdateHistory(historyStr, title = 'Update History') {
    const modal = document.getElementById('modal-content');
    modal.innerHTML = `
        <div class="modal-header">
            <h2>📝 ${title}</h2>
            <button class="modal-close" onclick="closeModal()">&times;</button>
        </div>
        <div class="history-container">
            ${formatUpdateHistory(historyStr)}
        </div>
        <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick="closeModal()">Close</button>
        </div>
    `;
    document.getElementById('modal-overlay').classList.remove('hidden');
}

// Authentication
async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('login-error');

    try {
        const data = await apiCall('/auth/login', 'POST', { username, password });
        token = data.token;
        currentUser = data.user;
        localStorage.setItem('token', token);
        showDashboard();
    } catch (error) {
        errorDiv.textContent = error.message;
        errorDiv.classList.remove('hidden');
    }
}

async function verifyToken() {
    try {
        const data = await apiCall('/auth/verify');
        currentUser = data.user;
        showDashboard();
    } catch (error) {
        localStorage.removeItem('token');
        token = null;
        showLoginPage();
    }
}

function handleLogout() {
    localStorage.removeItem('token');
    token = null;
    currentUser = null;
    showLoginPage();
}

// Page Navigation
function showLoginPage() {
    document.getElementById('login-page').classList.remove('hidden');
    document.getElementById('dashboard-page').classList.add('hidden');
    document.getElementById('login-form').reset();
    document.getElementById('login-error').classList.add('hidden');
}

function showDashboard() {
    document.getElementById('login-page').classList.add('hidden');
    document.getElementById('dashboard-page').classList.remove('hidden');
    
    // Update user info
    document.getElementById('user-role-display').textContent = 
        currentUser.role === 'admin' ? 'Administrator' : 'Store Manager';
    
    // Show/hide admin-only menu items
    document.querySelectorAll('.admin-only').forEach(el => {
        el.classList.toggle('hidden', currentUser.role !== 'admin');
    });

    // Setup role-based filter restrictions
    setupRoleBasedFilters();

    // Load dashboard
    navigateTo('dashboard');
}

function setupRoleBasedFilters() {
    const isAdmin = currentUser?.role === 'admin';
    
    // Walk-ins filter
    const walkinsFilter = document.getElementById('walkins-filter');
    if (walkinsFilter) {
        if (isAdmin) {
            walkinsFilter.innerHTML = `
                <option value="today">Today</option>
                <option value="active">Active Only</option>
                <option value="completed">Checked Out</option>
                <option value="daterange">Date Range</option>
                <option value="all">All</option>
            `;
        } else {
            // Store manager: only today and last 7 days
            walkinsFilter.innerHTML = `
                <option value="today">Today</option>
                <option value="active">Active Only</option>
                <option value="last7days">Last 7 Days</option>
            `;
        }
    }
    
    // Parties filter
    const partiesFilter = document.getElementById('parties-filter');
    if (partiesFilter) {
        if (isAdmin) {
            partiesFilter.innerHTML = `
                <option value="upcoming">Upcoming</option>
                <option value="today">Today</option>
                <option value="thismonth">This Month</option>
                <option value="completed">Completed</option>
                <option value="all">All</option>
            `;
        } else {
            // Store manager: upcoming, today, last 7 days
            partiesFilter.innerHTML = `
                <option value="upcoming">Upcoming</option>
                <option value="today">Today</option>
                <option value="last7days">Last 7 Days</option>
            `;
        }
    }
    
    // Packages filter
    const packagesFilter = document.getElementById('packages-filter');
    if (packagesFilter) {
        if (isAdmin) {
            packagesFilter.innerHTML = `
                <option value="active">Active</option>
                <option value="expiring">Expiring (With Visits Left)</option>
                <option value="completed">Completed</option>
                <option value="all">All</option>
            `;
        } else {
            // Store manager: active and expiring only
            packagesFilter.innerHTML = `
                <option value="active">Active</option>
                <option value="expiring">Expiring (With Visits Left)</option>
            `;
        }
    }
    
    // Hide date range for non-admins
    const dateRangeDiv = document.getElementById('walkins-date-range');
    if (dateRangeDiv && !isAdmin) {
        dateRangeDiv.classList.add('hidden');
    }
}

function navigateTo(page) {
    // Update active nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.page === page);
    });

    // Show section
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.add('hidden');
    });
    document.getElementById(`section-${page}`).classList.remove('hidden');

    // Load data
    switch (page) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'walkins':
            loadWalkins();
            break;
        case 'packages':
            loadPackages();
            break;
        case 'parties':
            loadParties();
            break;
        case 'users':
            loadUsers();
            break;
        case 'reports':
            loadReports();
            break;
        case 'backup':
            loadBackups();
            break;
    }
}

// Monthly summary state
let summaryYear = new Date().getFullYear();
let summaryMonth = new Date().getMonth() + 1;

// Dashboard
async function loadDashboard() {
    document.getElementById('current-date').textContent = new Date().toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    // Set default date range (current month)
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    
    // First day of current month (YYYY-MM-01)
    const firstDayStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    // Last day of current month
    const lastDay = new Date(year, month + 1, 0).getDate();
    const lastDayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    
    const fromInput = document.getElementById('parties-date-from');
    const toInput = document.getElementById('parties-date-to');
    
    if (fromInput && !fromInput.value) {
        fromInput.value = firstDayStr;
    }
    if (toInput && !toInput.value) {
        toInput.value = lastDayStr;
    }

    // Show monthly summary for admin
    const monthlySummary = document.getElementById('monthly-summary');
    if (currentUser?.role === 'admin' && monthlySummary) {
        monthlySummary.classList.remove('hidden');
        loadMonthlySummary();
    }

    try {
        // Load stats
        const [activeWalkins, todayWalkins, completedParties] = await Promise.all([
            apiCall('/walkins/active'),
            apiCall('/walkins/today'),
            apiCall('/parties/completed')
        ]);
        
        // Load upcoming parties with date range
        const upcomingParties = await loadUpcomingPartiesData();

        document.getElementById('stat-active-walkins').textContent = activeWalkins.length;
        document.getElementById('stat-today-walkins').textContent = todayWalkins.length;
        document.getElementById('stat-completed-parties').textContent = completedParties.length;
        document.getElementById('stat-upcoming-parties').textContent = upcomingParties.length;

        // Active walkins table
        const activeTable = document.getElementById('dashboard-active-walkins');
        activeTable.innerHTML = activeWalkins.length ? activeWalkins.map(w => `
            <tr class="walkin-active">
                <td>${escapeHtml(w.childName)}</td>
                <td>${escapeHtml(w.parentName)}</td>
                <td>${formatTime(w.checkInTime)}</td>
                <td>
                    <button class="btn btn-secondary btn-small" onclick="editWalkin('${w.id}')">Edit</button>
                    <button class="btn btn-success btn-small" onclick="checkoutWalkin('${w.id}')">Check Out</button>
                </td>
            </tr>
        `).join('') : '<tr><td colspan="4" style="text-align:center;color:#64748b;">No active walk-ins</td></tr>';

        // Upcoming parties table (next 2 weeks)
        renderUpcomingPartiesTable(upcomingParties);

    } catch (error) {
        console.error('Dashboard load error:', error);
    }
}

// Walk-ins
async function loadWalkins() {
    const filter = document.getElementById('walkins-filter').value;
    let endpoint = '/walkins';
    
    // Show/hide date range inputs (admin only)
    const dateRangeDiv = document.getElementById('walkins-date-range');
    if (filter === 'daterange' && currentUser?.role === 'admin') {
        dateRangeDiv.classList.remove('hidden');
        const fromDate = document.getElementById('walkins-from-date').value;
        const toDate = document.getElementById('walkins-to-date').value;
        if (fromDate && toDate) {
            endpoint = `/walkins/daterange?from=${fromDate}&to=${toDate}`;
        } else {
            // Set default dates to current month if not set
            const now = new Date();
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            document.getElementById('walkins-from-date').value = firstDay.toISOString().split('T')[0];
            document.getElementById('walkins-to-date').value = lastDay.toISOString().split('T')[0];
            return; // Wait for user to click Apply
        }
    } else {
        dateRangeDiv.classList.add('hidden');
        if (filter === 'today') endpoint = '/walkins/today';
        else if (filter === 'active') endpoint = '/walkins/active';
        else if (filter === 'completed') endpoint = '/walkins/completed';
        else if (filter === 'last7days') {
            // Calculate last 7 days range
            const today = new Date();
            const sevenDaysAgo = new Date(today);
            sevenDaysAgo.setDate(today.getDate() - 7);
            const fromDate = sevenDaysAgo.toISOString().split('T')[0];
            const toDate = today.toISOString().split('T')[0];
            endpoint = `/walkins/daterange?from=${fromDate}&to=${toDate}`;
        }
    }

    try {
        const walkins = await apiCall(endpoint);
        const tbody = document.getElementById('walkins-table-body');
        const isAdmin = currentUser?.role === 'admin';
        
        tbody.innerHTML = walkins.length ? walkins.map(w => {
            const isCompleted = !!w.checkOutTime;
            const canDelete = isAdmin || !isCompleted; // Admin can delete anything, manager only active
            return `
            <tr class="${isCompleted ? 'walkin-out' : 'walkin-active'}">
                <td>${w.tagNo || '-'}</td>
                <td>${escapeHtml(w.childName)}</td>
                <td>${w.childAge || '-'}</td>
                <td>${w.gender || '-'}</td>
                <td>${escapeHtml(w.parentName)}</td>
                <td>${w.parentPhone || '-'}</td>
                <td>${w.amount ? '₹' + w.amount : '-'}</td>
                <td>${w.paymentMode || '-'}</td>
                <td>${formatDateTime(w.checkInTime)}</td>
                <td>${isCompleted ? formatDateTime(w.checkOutTime) : '<span class="badge badge-success">Active</span>'}</td>
                <td class="actions">
                    ${!isCompleted ? `<button class="btn btn-success btn-small" onclick="checkoutWalkin('${w.id}')">Check Out</button>` : ''}
                    <button class="btn btn-secondary btn-small" onclick="editWalkin('${w.id}')">Edit</button>
                    ${w.updateHistory ? `<button class="btn btn-info btn-small" onclick="showUpdateHistory('${escapeHtml(w.updateHistory).replace(/'/g, "\\'")}')">History</button>` : ''}
                    ${canDelete ? `<button class="btn btn-danger btn-small" onclick="deleteWalkin('${w.id}')">Delete</button>` : ''}
                </td>
            </tr>
        `}).join('') : '<tr><td colspan="11" style="text-align:center;color:#64748b;">No walk-ins found</td></tr>';
    } catch (error) {
        console.error('Load walkins error:', error);
    }
}

function showWalkinModal(walkin = null) {
    const isEdit = !!walkin;
    const isAdmin = currentUser?.role === 'admin';
    const isManager = currentUser?.role === 'store_manager';
    // For managers in edit mode, restrict certain fields
    const restrictField = isEdit && isManager;
    const modal = document.getElementById('modal-content');
    
    modal.innerHTML = `
        <div class="modal-header">
            <h2>${isEdit ? 'Edit Walk-in' : 'New Walk-in'}</h2>
            <button class="modal-close" onclick="closeModal()">&times;</button>
        </div>
        <form id="walkin-form">
            ${!isEdit ? `
            <div class="search-tabs">
                <button type="button" class="search-tab active" data-type="name">Search by Name</button>
                <button type="button" class="search-tab" data-type="phone">Search by Phone</button>
            </div>
            <div class="form-group search-group">
                <label>Quick Search</label>
                <input type="text" id="walkin-search" placeholder="Type child name or phone to search..." autocomplete="off">
                <div id="search-results" class="search-results hidden"></div>
            </div>
            <hr style="margin: 15px 0; border: none; border-top: 1px solid #e2e8f0;">
            ` : ''}
            <div class="form-row">
                <div class="form-group">
                    <label>Tag No</label>
                    <input type="text" name="tagNo" id="input-tagNo" value="${walkin?.tagNo || ''}" ${restrictField ? 'readonly' : ''}>
                </div>
                <div class="form-group">
                    <label>Mobile *</label>
                    <input type="tel" name="parentPhone" id="input-parentPhone" required value="${walkin?.parentPhone || ''}">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Child Name *</label>
                    <input type="text" name="childName" id="input-childName" required value="${walkin?.childName || ''}">
                </div>
                <div class="form-group">
                    <label>Child Age</label>
                    <input type="text" name="childAge" id="input-childAge" value="${walkin?.childAge || ''}">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Gender</label>
                    <select name="gender" id="input-gender" ${restrictField ? 'disabled' : ''}>
                        <option value="">Select</option>
                        <option value="Male" ${walkin?.gender === 'Male' ? 'selected' : ''}>Male</option>
                        <option value="Female" ${walkin?.gender === 'Female' ? 'selected' : ''}>Female</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>DOB (Optional)</label>
                    <input type="date" name="dob" id="input-dob" value="${walkin?.dob || ''}" ${restrictField ? 'readonly' : ''} onchange="calculateAge()">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Parent Name *</label>
                    <input type="text" name="parentName" id="input-parentName" required value="${walkin?.parentName || ''}">
                </div>
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" name="parentEmail" id="input-parentEmail" value="${walkin?.parentEmail || ''}" placeholder="parent@email.com">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Amount</label>
                    <input type="number" name="amount" id="input-amount" value="${walkin?.amount || ''}" ${restrictField ? 'readonly' : ''}>
                </div>
                <div class="form-group">
                    <label>Payment Mode</label>
                    <select name="paymentMode" id="input-paymentMode" ${restrictField ? 'disabled' : ''}>
                        <option value="">Select</option>
                        <option value="Cash" ${walkin?.paymentMode === 'Cash' ? 'selected' : ''}>Cash</option>
                        <option value="GPay" ${walkin?.paymentMode === 'GPay' ? 'selected' : ''}>GPay</option>
                        <option value="Gift Voucher" ${walkin?.paymentMode === 'Gift Voucher' ? 'selected' : ''}>Gift Voucher</option>
                        <option value="Package" ${walkin?.paymentMode === 'Package' ? 'selected' : ''}>Package</option>
                    </select>
                </div>
            </div>
            ${isEdit ? `
            <div class="form-group">
                <label>Food (₹)</label>
                <input type="number" name="food" id="input-food" value="${walkin?.food || ''}" placeholder="Enter food amount" min="0" step="1">
            </div>
            ` : ''}
            <div class="form-group">
                <label>Notes</label>
                <textarea name="notes" rows="2">${walkin?.notes || ''}</textarea>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Check In'}</button>
            </div>
        </form>
    `;

    // Setup autofill search for new walk-ins
    if (!isEdit) {
        setupWalkinSearch();
    }

    document.getElementById('walkin-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);

        try {
            if (isEdit) {
                await apiCall(`/walkins/${walkin.id}`, 'PUT', data);
            } else {
                await apiCall('/walkins', 'POST', data);
            }
            closeModal();
            loadWalkins();
            loadDashboard();
        } catch (error) {
            alert(error.message);
        }
    });

    document.getElementById('modal-overlay').classList.remove('hidden');
}

// Walkin search functionality
let searchType = 'name';
let searchTimeout = null;

function setupWalkinSearch() {
    const searchInput = document.getElementById('walkin-search');
    const searchResults = document.getElementById('search-results');
    const tabs = document.querySelectorAll('.search-tab');

    // Tab switching
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            searchType = tab.dataset.type;
            searchInput.placeholder = searchType === 'name' 
                ? 'Type child name to search...' 
                : 'Type phone number to search...';
            searchInput.value = '';
            searchResults.classList.add('hidden');
        });
    });

    // Search input handler with debounce
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        
        if (searchTimeout) clearTimeout(searchTimeout);
        
        if (query.length < 2) {
            searchResults.classList.add('hidden');
            return;
        }

        searchTimeout = setTimeout(async () => {
            try {
                const results = await apiCall(`/walkins/search?q=${encodeURIComponent(query)}&type=${searchType}`);
                
                if (results.length === 0) {
                    searchResults.innerHTML = '<div class="search-item no-results">No matching records found</div>';
                } else {
                    searchResults.innerHTML = results.map((r, i) => `
                        <div class="search-item" data-index="${i}">
                            <div class="search-item-main">
                                <strong>${escapeHtml(r.childName)}</strong>
                                ${r.childAge ? `<span class="age-badge">${r.childAge} yrs</span>` : ''}
                            </div>
                            <div class="search-item-sub">
                                ${escapeHtml(r.parentName)} ${r.parentPhone ? `• ${r.parentPhone}` : ''}
                            </div>
                        </div>
                    `).join('');

                    // Add click handlers to results
                    searchResults.querySelectorAll('.search-item:not(.no-results)').forEach((item, index) => {
                        item.addEventListener('click', () => {
                            fillWalkinForm(results[index]);
                            searchResults.classList.add('hidden');
                            searchInput.value = '';
                        });
                    });
                }
                
                searchResults.classList.remove('hidden');
            } catch (error) {
                console.error('Search error:', error);
            }
        }, 300);
    });

    // Hide results when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-group')) {
            searchResults.classList.add('hidden');
        }
    });
}

function fillWalkinForm(data) {
    document.getElementById('input-childName').value = data.childName || '';
    document.getElementById('input-childAge').value = data.childAge || '';
    document.getElementById('input-parentName').value = data.parentName || '';
    document.getElementById('input-parentPhone').value = data.parentPhone || '';
    document.getElementById('input-parentEmail').value = data.parentEmail || '';
    
    // Fill additional fields if they exist
    const genderSelect = document.getElementById('input-gender');
    if (genderSelect && data.gender) {
        genderSelect.value = data.gender;
    }
    
    const dobInput = document.getElementById('input-dob');
    if (dobInput && data.dob) {
        dobInput.value = data.dob;
        calculateAge(); // Calculate age from DOB
    }
}

function calculateAge() {
    const dobInput = document.getElementById('input-dob');
    const ageInput = document.getElementById('input-childAge');
    
    if (dobInput && dobInput.value && ageInput) {
        const dob = new Date(dobInput.value);
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const monthDiff = today.getMonth() - dob.getMonth();
        
        // Adjust age if birthday hasn't occurred yet this year
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
            age--;
        }
        
        if (age >= 0) {
            ageInput.value = age;
        }
    }
}

async function editWalkin(id) {
    try {
        const walkin = await apiCall(`/walkins/${id}`);
        showWalkinModal(walkin);
    } catch (error) {
        alert(error.message);
    }
}

async function checkoutWalkin(id) {
    if (!confirm('Check out this child?')) return;
    
    try {
        await apiCall(`/walkins/${id}/checkout`, 'POST');
        loadWalkins();
        loadDashboard();
    } catch (error) {
        alert(error.message);
    }
}

async function deleteWalkin(id) {
    if (!confirm('Delete this walk-in record?')) return;
    
    try {
        await apiCall(`/walkins/${id}`, 'DELETE');
        loadWalkins();
        loadDashboard();
    } catch (error) {
        alert(error.message);
    }
}

// Parties
async function loadParties() {
    const filter = document.getElementById('parties-filter').value;
    let endpoint = '/parties';
    
    if (filter === 'upcoming') endpoint = '/parties/upcoming';
    else if (filter === 'today') endpoint = '/parties/today';
    else if (filter === 'completed') endpoint = '/parties/completed';
    else if (filter === 'thismonth') endpoint = '/parties/thismonth';
    else if (filter === 'last7days') {
        // Calculate last 7 days range
        const today = new Date();
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 7);
        const fromDate = sevenDaysAgo.toISOString().split('T')[0];
        const toDate = today.toISOString().split('T')[0];
        endpoint = `/parties/daterange?from=${fromDate}&to=${toDate}`;
    }

    try {
        const parties = await apiCall(endpoint);
        const tbody = document.getElementById('parties-table-body');
        const isAdmin = currentUser?.role === 'admin';
        
        tbody.innerHTML = parties.length ? parties.map(p => {
            const isCompleted = p.status === 'completed';
            const canDelete = isAdmin || !isCompleted; // Admin can delete anything, manager only non-completed
            return `
            <tr>
                <td>${p.id}</td>
                <td>${escapeHtml(p.childName)}</td>
                <td>${p.childAge || '-'}</td>
                <td>${escapeHtml(p.parentName)}</td>
                <td>${p.partyDate}</td>
                <td>${formatTimeAmPm(p.partyTime)}</td>
                <td>${p.guestCount || '-'}</td>
                <td>${p.packageType || '-'}</td>
                <td><span class="badge badge-${getStatusBadge(p.status)}">${p.status}</span></td>
                <td class="actions">
                    <button class="btn btn-secondary btn-small" onclick="editParty('${p.id}')">Edit</button>
                    ${p.updateHistory ? `<button class="btn btn-info btn-small" onclick="showUpdateHistory('${escapeHtml(p.updateHistory).replace(/'/g, "\\\\'")}')">History</button>` : ''}
                    ${canDelete ? `<button class="btn btn-danger btn-small" onclick="deleteParty('${p.id}')">Delete</button>` : ''}
                </td>
            </tr>
        `}).join('') : '<tr><td colspan="10" style="text-align:center;color:#64748b;">No parties found</td></tr>';
    } catch (error) {
        console.error('Load parties error:', error);
    }
}

function showPartyModal(party = null) {
    const isEdit = !!party;
    const isAdmin = currentUser?.role === 'admin';
    const isManager = currentUser?.role === 'store_manager';
    // For managers in edit mode, restrict certain fields
    const restrictField = isEdit && isManager;
    const modal = document.getElementById('modal-content');
    
    modal.innerHTML = `
        <div class="modal-header">
            <h2>${isEdit ? 'Edit Party Booking' : 'New Party Booking'}</h2>
            <button class="modal-close" onclick="closeModal()">&times;</button>
        </div>
        <form id="party-form">
            <div class="form-group">
                <label>Child Name *</label>
                <input type="text" name="childName" required value="${party?.childName || ''}" ${restrictField ? 'readonly' : ''}>
            </div>
            <div class="form-group">
                <label>Child Age</label>
                <input type="text" name="childAge" value="${party?.childAge || ''}">
            </div>
            <div class="form-group">
                <label>Parent Name *</label>
                <input type="text" name="parentName" required value="${party?.parentName || ''}" ${restrictField ? 'readonly' : ''}>
            </div>
            <div class="form-group">
                <label>Parent Phone</label>
                <input type="tel" name="parentPhone" value="${party?.parentPhone || ''}">
            </div>
            <div class="form-group">
                <label>Party Date *</label>
                <input type="date" name="partyDate" required value="${party?.partyDate || ''}" ${restrictField ? 'readonly' : ''}>
            </div>
            <div class="form-group">
                <label>Party Time</label>
                <div class="time-picker-row">
                    <select name="partyTimeHour" id="party-time-hour" ${restrictField ? 'disabled' : ''}>
                        ${[12,1,2,3,4,5,6,7,8,9,10,11].map(h => `<option value="${h}">${h}</option>`).join('')}
                    </select>
                    <span>:</span>
                    <select name="partyTimeMinute" id="party-time-minute" ${restrictField ? 'disabled' : ''}>
                        ${['00','15','30','45'].map(m => `<option value="${m}">${m}</option>`).join('')}
                    </select>
                    <select name="partyTimeAmPm" id="party-time-ampm" ${restrictField ? 'disabled' : ''}>
                        <option value="AM">AM</option>
                        <option value="PM">PM</option>
                    </select>
                </div>
                <input type="hidden" name="partyTime" id="party-time-hidden" value="${party?.partyTime || ''}">
            </div>
            <div class="form-group">
                <label>Number of Guests</label>
                <input type="number" name="guestCount" value="${party?.guestCount || ''}">
            </div>
            <div class="form-group">
                <label>Package Type</label>
                <select name="packageType" ${restrictField ? 'disabled' : ''}>
                    <option value="standard" ${party?.packageType === 'standard' ? 'selected' : ''}>Standard</option>
                    <option value="premium" ${party?.packageType === 'premium' ? 'selected' : ''}>Premium</option>
                    <option value="deluxe" ${party?.packageType === 'deluxe' ? 'selected' : ''}>Deluxe</option>
                </select>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Advance (₹)</label>
                    <input type="number" name="advance" value="${party?.advance || ''}" placeholder="Advance amount" min="0">
                </div>
                <div class="form-group">
                    <label>Total Amount (₹)</label>
                    <input type="number" name="totalAmount" value="${party?.totalAmount || ''}" placeholder="Total amount" min="0">
                </div>
            </div>
            ${isEdit ? `
            <div class="form-group">
                <label>Status</label>
                <select name="status" ${restrictField ? 'disabled' : ''}>
                    <option value="booked" ${party?.status === 'booked' ? 'selected' : ''}>Booked</option>
                    <option value="confirmed" ${party?.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                    <option value="in-progress" ${party?.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
                    <option value="completed" ${party?.status === 'completed' ? 'selected' : ''}>Completed</option>
                    <option value="cancelled" ${party?.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                </select>
            </div>
            ` : ''}
            <div class="form-group">
                <label>Notes</label>
                <textarea name="notes" rows="3">${party?.notes || ''}</textarea>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Book Party'}</button>
            </div>
        </form>
    `;

    // Setup time picker
    setupPartyTimePicker(party?.partyTime);

    document.getElementById('party-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Convert time picker to 24-hour format before submit
        updatePartyTimeHidden();
        
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);
        
        // Remove individual time fields, keep only partyTime
        delete data.partyTimeHour;
        delete data.partyTimeMinute;
        delete data.partyTimeAmPm;

        try {
            if (isEdit) {
                await apiCall(`/parties/${party.id}`, 'PUT', data);
            } else {
                await apiCall('/parties', 'POST', data);
            }
            closeModal();
            loadParties();
            loadDashboard();
        } catch (error) {
            alert(error.message);
        }
    });

    document.getElementById('modal-overlay').classList.remove('hidden');
}

// Setup party time picker with existing value
function setupPartyTimePicker(timeValue) {
    const hourSelect = document.getElementById('party-time-hour');
    const minuteSelect = document.getElementById('party-time-minute');
    const ampmSelect = document.getElementById('party-time-ampm');
    
    if (timeValue) {
        const [hours, minutes] = timeValue.split(':');
        let h = parseInt(hours, 10);
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        
        hourSelect.value = h;
        minuteSelect.value = minutes.substring(0, 2);
        ampmSelect.value = ampm;
    }
    
    // Add change listeners to update hidden field
    [hourSelect, minuteSelect, ampmSelect].forEach(el => {
        el.addEventListener('change', updatePartyTimeHidden);
    });
}

// Convert AM/PM time to 24-hour format
function updatePartyTimeHidden() {
    const hour = parseInt(document.getElementById('party-time-hour').value, 10);
    const minute = document.getElementById('party-time-minute').value;
    const ampm = document.getElementById('party-time-ampm').value;
    
    let h24 = hour;
    if (ampm === 'PM' && hour !== 12) {
        h24 = hour + 12;
    } else if (ampm === 'AM' && hour === 12) {
        h24 = 0;
    }
    
    const timeStr = `${String(h24).padStart(2, '0')}:${minute}`;
    document.getElementById('party-time-hidden').value = timeStr;
}

async function editParty(id) {
    try {
        const party = await apiCall(`/parties/${id}`);
        showPartyModal(party);
    } catch (error) {
        alert(error.message);
    }
}

async function deleteParty(id) {
    if (!confirm('Delete this party booking?')) return;
    
    try {
        await apiCall(`/parties/${id}`, 'DELETE');
        loadParties();
        loadDashboard();
    } catch (error) {
        alert(error.message);
    }
}

// Users (Admin only)
async function loadUsers() {
    try {
        const users = await apiCall('/users');
        const tbody = document.getElementById('users-table-body');
        
        tbody.innerHTML = users.map(u => `
            <tr>
                <td>${u.id}</td>
                <td>${escapeHtml(u.username)}</td>
                <td>${escapeHtml(u.fullName || '-')}</td>
                <td>${escapeHtml(u.email || '-')}</td>
                <td><span class="badge badge-${u.role === 'admin' ? 'danger' : 'info'}">${u.role}</span></td>
                <td>${formatDate(u.createdAt)}</td>
                <td class="actions">
                    <button class="btn btn-secondary btn-small" onclick="editUser('${u.id}')">Edit</button>
                    ${u.id !== currentUser.id ? `<button class="btn btn-danger btn-small" onclick="deleteUser('${u.id}')">Delete</button>` : ''}
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Load users error:', error);
    }
}

function showUserModal(user = null) {
    const isEdit = !!user;
    const modal = document.getElementById('modal-content');
    
    modal.innerHTML = `
        <div class="modal-header">
            <h2>${isEdit ? 'Edit User' : 'Add User'}</h2>
            <button class="modal-close" onclick="closeModal()">&times;</button>
        </div>
        <form id="user-form">
            <div class="form-group">
                <label>Username *</label>
                <input type="text" name="username" required value="${user?.username || ''}">
            </div>
            <div class="form-group">
                <label>${isEdit ? 'New Password (leave blank to keep current)' : 'Password *'}</label>
                <input type="password" name="password" ${isEdit ? '' : 'required'}>
            </div>
            <div class="form-group">
                <label>Full Name</label>
                <input type="text" name="fullName" value="${user?.fullName || ''}">
            </div>
            <div class="form-group">
                <label>Email</label>
                <input type="email" name="email" value="${user?.email || ''}">
            </div>
            <div class="form-group">
                <label>Role *</label>
                <select name="role" required>
                    <option value="store_manager" ${user?.role === 'store_manager' ? 'selected' : ''}>Store Manager</option>
                    <option value="admin" ${user?.role === 'admin' ? 'selected' : ''}>Admin</option>
                </select>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Create User'}</button>
            </div>
        </form>
    `;

    document.getElementById('user-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);
        
        // Remove empty password for edit
        if (isEdit && !data.password) {
            delete data.password;
        }

        try {
            if (isEdit) {
                await apiCall(`/users/${user.id}`, 'PUT', data);
            } else {
                await apiCall('/users', 'POST', data);
            }
            closeModal();
            loadUsers();
        } catch (error) {
            alert(error.message);
        }
    });

    document.getElementById('modal-overlay').classList.remove('hidden');
}

async function editUser(id) {
    try {
        const users = await apiCall('/users');
        const user = users.find(u => u.id === id);
        showUserModal(user);
    } catch (error) {
        alert(error.message);
    }
}

async function deleteUser(id) {
    if (!confirm('Delete this user?')) return;
    
    try {
        await apiCall(`/users/${id}`, 'DELETE');
        loadUsers();
    } catch (error) {
        alert(error.message);
    }
}

// Backups (Admin only)
async function loadBackups() {
    try {
        const backups = await apiCall('/backup/list');
        const tbody = document.getElementById('backups-table-body');
        
        tbody.innerHTML = backups.length ? backups.map(b => `
            <tr>
                <td>${escapeHtml(b.filename)}</td>
                <td>${formatBytes(b.size)}</td>
                <td>${formatDateTime(b.createdAt)}</td>
                <td class="actions">
                    <button class="btn btn-primary btn-small" onclick="downloadBackup('${b.filename}')">Download</button>
                    <button class="btn btn-success btn-small" onclick="restoreBackup('${b.filename}')">Restore</button>
                    <button class="btn btn-danger btn-small" onclick="deleteBackupFile('${b.filename}')">Delete</button>
                </td>
            </tr>
        `).join('') : '<tr><td colspan="4" style="text-align:center;color:#64748b;">No backups available</td></tr>';
    } catch (error) {
        console.error('Load backups error:', error);
    }
}

async function createBackup() {
    try {
        const result = await apiCall('/backup/create', 'POST');
        alert('Backup created: ' + result.filename);
        loadBackups();
    } catch (error) {
        alert(error.message);
    }
}

function downloadBackup(filename) {
    window.open(`${API_BASE}/backup/download/${filename}`, '_blank');
}

async function restoreBackup(filename) {
    if (!confirm(`Restore from backup "${filename}"? This will overwrite current data.`)) return;
    
    try {
        await apiCall(`/backup/restore/${filename}`, 'POST');
        alert('Backup restored successfully');
        loadDashboard();
    } catch (error) {
        alert(error.message);
    }
}

async function restoreFromUpload(input) {
    if (!input.files.length) return;
    
    if (!confirm('Restore from uploaded backup? This will overwrite current data.')) {
        input.value = '';
        return;
    }

    const formData = new FormData();
    formData.append('backup', input.files[0]);

    try {
        const response = await fetch(`${API_BASE}/backup/restore-upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error);
        }

        alert('Backup restored successfully');
        loadBackups();
        loadDashboard();
    } catch (error) {
        alert(error.message);
    }

    input.value = '';
}

async function deleteBackupFile(filename) {
    if (!confirm(`Delete backup "${filename}"?`)) return;
    
    try {
        await apiCall(`/backup/${filename}`, 'DELETE');
        loadBackups();
    } catch (error) {
        alert(error.message);
    }
}

// Modal
function closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
}

// Utilities
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDateTime(isoString) {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleString();
}

function formatDate(isoString) {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleDateString();
}

function formatTime(isoString) {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatTimeAmPm(timeStr) {
    if (!timeStr) return '-';
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
}

function getStatusBadge(status) {
    const badges = {
        'booked': 'info',
        'confirmed': 'success',
        'in-progress': 'warning',
        'completed': 'success',
        'cancelled': 'danger'
    };
    return badges[status] || 'info';
}

// Navigate to Walk-ins page with Active filter
function goToActiveWalkins() {
    document.getElementById('walkins-filter').value = 'active';
    navigateTo('walkins');
}

// Navigate to Walk-ins page with Today filter
function goToTodayWalkins() {
    document.getElementById('walkins-filter').value = 'today';
    navigateTo('walkins');
}

// Navigate to Parties page with Upcoming filter
function goToUpcomingParties() {
    document.getElementById('parties-filter').value = 'upcoming';
    navigateTo('parties');
}

// Navigate to Parties page (all parties to see completed)
function goToCompletedParties() {
    document.getElementById('parties-filter').value = 'all';
    navigateTo('parties');
}

// Load upcoming parties with date range
async function loadUpcomingPartiesData() {
    const fromDate = document.getElementById('parties-date-from')?.value || '';
    const toDate = document.getElementById('parties-date-to')?.value || '';
    
    let endpoint = '/parties/upcoming';
    if (fromDate || toDate) {
        const params = new URLSearchParams();
        if (fromDate) params.append('from', fromDate);
        if (toDate) params.append('to', toDate);
        endpoint += '?' + params.toString();
    }
    
    return await apiCall(endpoint);
}

// Filter upcoming parties by date range
async function filterUpcomingParties() {
    try {
        const upcomingParties = await loadUpcomingPartiesData();
        document.getElementById('stat-upcoming-parties').textContent = upcomingParties.length;
        renderUpcomingPartiesTable(upcomingParties);
    } catch (error) {
        console.error('Filter parties error:', error);
    }
}

// Render upcoming parties table
function renderUpcomingPartiesTable(parties) {
    const partiesTable = document.getElementById('dashboard-today-parties');
    partiesTable.innerHTML = parties.length ? parties.map(p => `
        <tr>
            <td>${p.partyDate || '-'}</td>
            <td>${formatTimeAmPm(p.partyTime)}</td>
            <td>${escapeHtml(p.childName)}</td>
            <td>${escapeHtml(p.parentName)}</td>
            <td>${p.parentPhone || '-'}</td>
            <td>${p.guestCount || '-'}</td>
            <td>${p.packageType || '-'}</td>
            <td><span class="badge badge-${getStatusBadge(p.status)}">${p.status}</span></td>
        </tr>
    `).join('') : '<tr><td colspan="8" style="text-align:center;color:#64748b;">No parties in selected range</td></tr>';
}

// Monthly Summary Functions
async function loadMonthlySummary() {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'];
    
    document.getElementById('summary-month-label').textContent = 
        `${monthNames[summaryMonth - 1]} ${summaryYear}`;
    
    try {
        const [walkinsSummary, partiesSummary] = await Promise.all([
            apiCall(`/walkins/monthly-summary?year=${summaryYear}&month=${summaryMonth}`),
            apiCall(`/parties/monthly-summary?year=${summaryYear}&month=${summaryMonth}`)
        ]);
        
        document.getElementById('summary-walkins-count').textContent = walkinsSummary.count;
        document.getElementById('summary-walkins-amount').textContent = `₹${walkinsSummary.amount.toLocaleString()}`;
        document.getElementById('summary-food-amount').textContent = `₹${walkinsSummary.food.toLocaleString()}`;
        document.getElementById('summary-parties-count').textContent = partiesSummary.count;
        document.getElementById('summary-parties-advance').textContent = `₹${partiesSummary.advance.toLocaleString()}`;
        document.getElementById('summary-parties-total').textContent = `₹${partiesSummary.totalAmount.toLocaleString()}`;
    } catch (error) {
        console.error('Monthly summary error:', error);
    }
}

function changeMonth(delta) {
    summaryMonth += delta;
    
    if (summaryMonth > 12) {
        summaryMonth = 1;
        summaryYear++;
    } else if (summaryMonth < 1) {
        summaryMonth = 12;
        summaryYear--;
    }
    
    loadMonthlySummary();
}

// Reports Section
let reportYear = new Date().getFullYear();
let reportMonth = new Date().getMonth() + 1;

async function loadReports() {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'];
    
    document.getElementById('report-month-label').textContent = 
        `${monthNames[reportMonth - 1]} ${reportYear}`;
    
    try {
        // Fetch summary data
        const [walkinsSummary, partiesSummary] = await Promise.all([
            apiCall(`/walkins/monthly-summary?year=${reportYear}&month=${reportMonth}`),
            apiCall(`/parties/monthly-summary?year=${reportYear}&month=${reportMonth}`)
        ]);
        
        // Walk-ins summary
        const walkinsTotal = walkinsSummary.amount + walkinsSummary.food;
        document.getElementById('report-walkins-count').textContent = walkinsSummary.count;
        document.getElementById('report-walkins-amount').textContent = `₹${walkinsSummary.amount.toLocaleString()}`;
        document.getElementById('report-food-amount').textContent = `₹${walkinsSummary.food.toLocaleString()}`;
        document.getElementById('report-walkins-total').textContent = `₹${walkinsTotal.toLocaleString()}`;
        
        // Parties summary
        const partiesBalance = partiesSummary.totalAmount - partiesSummary.advance;
        document.getElementById('report-parties-count').textContent = partiesSummary.count;
        document.getElementById('report-parties-advance').textContent = `₹${partiesSummary.advance.toLocaleString()}`;
        document.getElementById('report-parties-amount').textContent = `₹${partiesSummary.totalAmount.toLocaleString()}`;
        document.getElementById('report-parties-balance').textContent = `₹${partiesBalance.toLocaleString()}`;
        
        // Grand total (walkins revenue + food + parties total)
        const grandTotal = walkinsTotal + partiesSummary.totalAmount;
        document.getElementById('report-grand-total').textContent = `₹${grandTotal.toLocaleString()}`;
        
        // Fetch detailed data
        const [walkinsData, partiesData] = await Promise.all([
            apiCall(`/walkins/monthly?year=${reportYear}&month=${reportMonth}`),
            apiCall(`/parties/monthly?year=${reportYear}&month=${reportMonth}`)
        ]);
        
        // Render walk-ins table
        const walkinsTable = document.getElementById('report-walkins-table');
        walkinsTable.innerHTML = walkinsData.length ? walkinsData.map(w => `
            <tr>
                <td>${formatDate(w.checkInTime)}</td>
                <td>${escapeHtml(w.childName)}</td>
                <td>${escapeHtml(w.parentName)}</td>
                <td>${w.amount ? '₹' + w.amount : '-'}</td>
                <td>${w.food ? '₹' + w.food : '-'}</td>
                <td>${w.paymentMode || '-'}</td>
            </tr>
        `).join('') : '<tr><td colspan="6" style="text-align:center;color:#64748b;">No walk-ins this month</td></tr>';
        
        // Render parties table
        const partiesTable = document.getElementById('report-parties-table');
        partiesTable.innerHTML = partiesData.length ? partiesData.map(p => `
            <tr>
                <td>${p.partyDate}</td>
                <td>${formatTimeAmPm(p.partyTime)}</td>
                <td>${escapeHtml(p.childName)}</td>
                <td>${p.packageType || '-'}</td>
                <td>${p.guestCount || '-'}</td>
                <td>${p.advance ? '₹' + p.advance : '-'}</td>
                <td>${p.totalAmount ? '₹' + p.totalAmount : '-'}</td>
                <td><span class="badge badge-${getStatusBadge(p.status)}">${p.status}</span></td>
            </tr>
        `).join('') : '<tr><td colspan="8" style="text-align:center;color:#64748b;">No parties this month</td></tr>';
        
    } catch (error) {
        console.error('Reports load error:', error);
    }
}

function changeReportMonth(delta) {
    reportMonth += delta;
    
    if (reportMonth > 12) {
        reportMonth = 1;
        reportYear++;
    } else if (reportMonth < 1) {
        reportMonth = 12;
        reportYear--;
    }
    
    loadReports();
}

// Packages
async function loadPackages() {
    const filter = document.getElementById('packages-filter').value;
    let endpoint = '/packages';
    
    if (filter === 'active') endpoint = '/packages/active';
    else if (filter === 'completed') endpoint = '/packages/completed';
    else if (filter === 'expiring') endpoint = '/packages/expiring';

    try {
        const packages = await apiCall(endpoint);
        const tbody = document.getElementById('packages-table-body');
        const today = new Date().toISOString().split('T')[0];
        
        tbody.innerHTML = packages.length ? packages.map(p => {
            const total = parseInt(p.totalVisits) || 0;
            const used = parseInt(p.usedVisits) || 0;
            const remaining = total - used;
            const endDate = p.endDate || '';
            const isExpiringSoon = endDate && endDate <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            const hasVisitsLeft = p.packageType !== 'monthly' && remaining > 0 && p.status === 'active';
            
            // Determine row class
            let rowClass = '';
            if (p.status === 'completed') {
                rowClass = 'package-completed';
            } else if (hasVisitsLeft && isExpiringSoon) {
                rowClass = 'package-expiring-warning';
            } else if (p.status === 'active') {
                rowClass = 'package-active';
            }
            
            return `
            <tr class="${rowClass}">
                <td>${p.id}</td>
                <td>${escapeHtml(p.childName)}</td>
                <td>${escapeHtml(p.parentName)}</td>
                <td>${p.parentPhone || '-'}</td>
                <td>${getPackageTypeLabel(p.packageType)}</td>
                <td>${p.packageType === 'monthly' ? '∞' : total}</td>
                <td>${used}</td>
                <td>${p.packageType === 'monthly' ? '∞' : remaining}</td>
                <td>${p.startDate || '-'}</td>
                <td>${endDate || '-'}</td>
                <td>${p.amount ? '₹' + p.amount : '-'}</td>
                <td><span class="badge badge-${p.status === 'active' ? 'success' : 'secondary'}">${p.status}</span></td>
                <td class="actions">
                    ${p.status === 'active' ? `<button class="btn btn-success btn-small" onclick="usePackageVisit('${p.id}')">Use Visit</button>` : ''}
                    <button class="btn btn-secondary btn-small" onclick="editPackage('${p.id}')">Edit</button>
                    ${p.updateHistory ? `<button class="btn btn-info btn-small" onclick="showUpdateHistory('${escapeHtml(p.updateHistory).replace(/'/g, "\\\\'")}')">History</button>` : ''}
                    ${(currentUser?.role === 'admin' || p.status === 'active') ? `<button class="btn btn-danger btn-small" onclick="deletePackage('${p.id}')">Delete</button>` : ''}
                </td>
            </tr>
        `}).join('') : '<tr><td colspan="13" style="text-align:center;color:#64748b;">No packages found</td></tr>';
    } catch (error) {
        console.error('Load packages error:', error);
    }
}

function getPackageTypeLabel(type) {
    const labels = {
        'monthly': 'Monthly',
        '10visits': '10 Visits',
        '20visits': '20 Visits',
        '30visits': '30 Visits'
    };
    return labels[type] || type;
}

function showPackageModal(pkg = null) {
    const isEdit = !!pkg;
    const modal = document.getElementById('modal-content');
    
    modal.innerHTML = `
        <div class="modal-header">
            <h2>${isEdit ? 'Edit Package' : 'New Package'}</h2>
            <button class="modal-close" onclick="closeModal()">&times;</button>
        </div>
        <form id="package-form">
            <div class="form-row">
                <div class="form-group">
                    <label>Child Name *</label>
                    <input type="text" name="childName" required value="${pkg?.childName || ''}">
                </div>
                <div class="form-group">
                    <label>Child Age</label>
                    <input type="text" name="childAge" value="${pkg?.childAge || ''}">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Parent Name *</label>
                    <input type="text" name="parentName" required value="${pkg?.parentName || ''}">
                </div>
                <div class="form-group">
                    <label>Phone *</label>
                    <input type="tel" name="parentPhone" required value="${pkg?.parentPhone || ''}">
                </div>
            </div>
            <div class="form-group">
                <label>Email</label>
                <input type="email" name="parentEmail" value="${pkg?.parentEmail || ''}">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Package Type *</label>
                    <select name="packageType" required ${isEdit ? 'disabled' : ''}>
                        <option value="">Select Package</option>
                        <option value="10visits" ${pkg?.packageType === '10visits' ? 'selected' : ''}>10 Visits</option>
                        <option value="20visits" ${pkg?.packageType === '20visits' ? 'selected' : ''}>20 Visits</option>
                        <option value="30visits" ${pkg?.packageType === '30visits' ? 'selected' : ''}>30 Visits</option>
                        <option value="monthly" ${pkg?.packageType === 'monthly' ? 'selected' : ''}>Monthly</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Amount (₹)</label>
                    <input type="number" name="amount" value="${pkg?.amount || ''}" min="0">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Start Date *</label>
                    <input type="date" name="startDate" required value="${pkg?.startDate || new Date().toISOString().split('T')[0]}">
                </div>
                <div class="form-group">
                    <label>End Date *</label>
                    <input type="date" name="endDate" required value="${pkg?.endDate || ''}">
                </div>
            </div>
            <div class="form-group">
                <label>Payment Mode</label>
                <select name="paymentMode">
                    <option value="">Select</option>
                    <option value="Cash" ${pkg?.paymentMode === 'Cash' ? 'selected' : ''}>Cash</option>
                    <option value="GPay" ${pkg?.paymentMode === 'GPay' ? 'selected' : ''}>GPay</option>
                    <option value="Card" ${pkg?.paymentMode === 'Card' ? 'selected' : ''}>Card</option>
                    <option value="Bank Transfer" ${pkg?.paymentMode === 'Bank Transfer' ? 'selected' : ''}>Bank Transfer</option>
                </select>
            </div>
            ${isEdit ? `
            <div class="form-row">
                <div class="form-group">
                    <label>Used Visits</label>
                    <input type="number" name="usedVisits" value="${pkg?.usedVisits || 0}" min="0">
                </div>
                <div class="form-group">
                    <label>Status</label>
                    <select name="status">
                        <option value="active" ${pkg?.status === 'active' ? 'selected' : ''}>Active</option>
                        <option value="completed" ${pkg?.status === 'completed' ? 'selected' : ''}>Completed</option>
                    </select>
                </div>
            </div>
            ` : ''}
            <div class="form-group">
                <label>Notes</label>
                <textarea name="notes" rows="2">${pkg?.notes || ''}</textarea>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Create Package'}</button>
            </div>
        </form>
    `;

    document.getElementById('package-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);

        try {
            if (isEdit) {
                await apiCall(`/packages/${pkg.id}`, 'PUT', data);
            } else {
                await apiCall('/packages', 'POST', data);
            }
            closeModal();
            loadPackages();
        } catch (error) {
            alert(error.message);
        }
    });

    document.getElementById('modal-overlay').classList.remove('hidden');
}

async function editPackage(id) {
    try {
        const pkg = await apiCall(`/packages/${id}`);
        showPackageModal(pkg);
    } catch (error) {
        alert(error.message);
    }
}

async function usePackageVisit(id) {
    if (!confirm('Record a visit for this package?')) return;
    
    try {
        await apiCall(`/packages/${id}/use-visit`, 'POST');
        loadPackages();
    } catch (error) {
        alert(error.message);
    }
}

async function deletePackage(id) {
    if (!confirm('Delete this package?')) return;
    
    try {
        await apiCall(`/packages/${id}`, 'DELETE');
        loadPackages();
    } catch (error) {
        alert(error.message);
    }
}
