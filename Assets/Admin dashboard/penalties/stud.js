// stud.js - Penalties Management with Supabase
import { supabase } from '../funct.js';

let penalties = [];
let currentEditPenaltyId = null;
let selectedPenalties = new Set();

// ============ DRAWER FUNCTIONALITY ============
const overlay = document.getElementById('overlay');
const drawer = document.getElementById('drawer');
const hamburger = document.getElementById('hamburger');
const drawerClose = document.getElementById('drawerClose');
const adminPill = document.getElementById('adminPill');

function openDrawer() {
    overlay?.classList.add('open');
    drawer?.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeDrawer() {
    overlay?.classList.remove('open');
    drawer?.classList.remove('open');
    document.body.style.overflow = '';
}

if (window.innerWidth <= 768) {
    if (hamburger) hamburger.addEventListener('click', openDrawer);
    if (drawerClose) drawerClose.addEventListener('click', closeDrawer);
    if (overlay) overlay.addEventListener('click', closeDrawer);
    if (adminPill) adminPill.addEventListener('click', openDrawer);
}

window.addEventListener('resize', () => {
    if (window.innerWidth > 768) closeDrawer();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDrawer();
});

// ============ LOAD ADMIN NAME ============
async function loadAdminName() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && user.email) {
            const { data: admin } = await supabase
                .from('admins')
                .select('full_name')
                .eq('email', user.email)
                .single();
            
            if (admin && admin.full_name) {
                const adminNameEl = document.querySelector('.drawer-name');
                if (adminNameEl) adminNameEl.textContent = admin.full_name;
            }
        }
    } catch (error) {
        console.error('Error loading admin name:', error);
    }
}

// ============ LOAD STUDENTS COUNT ============
async function loadStudentsCount() {
    try {
        const { count, error } = await supabase
            .from('students')
            .select('*', { count: 'exact', head: true });
        
        if (!error) {
            document.getElementById('totalStudents').textContent = count || 0;
        }
    } catch (error) {
        console.error('Error loading students count:', error);
    }
}

// ============ LOAD PENALTIES ============
async function loadPenalties() {
    try {
        const { data, error } = await supabase
            .from('penalties')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        penalties = (data || []).map(p => ({
            id: p.id,
            studentId: p.student_id,
            violation: p.violation,
            serviceType: p.service_type || 'Community Service',
            hours: p.hours,
            status: p.status || 'pending',
            deadline: p.deadline,
            dateCreated: p.created_at
        }));
        
        renderPenaltiesTable();
        updateStats();
        return penalties;
    } catch (error) {
        console.error('Error loading penalties:', error);
        penalties = [];
        renderPenaltiesTable();
        updateStats();
        return [];
    }
}

// ============ UPDATE STATISTICS ============
function updateStats() {
    const totalPenalties = penalties.length;
    const pendingCases = penalties.filter(p => p.status === 'pending').length;
    const completedHours = penalties
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + (parseInt(p.hours) || 0), 0);
    
    document.getElementById('totalPenalties').textContent = totalPenalties;
    document.getElementById('pendingCases').textContent = pendingCases;
    document.getElementById('completedHours').textContent = completedHours;
}

// ============ RENDER PENALTIES TABLE ============
function renderPenaltiesTable() {
    const tbody = document.getElementById('penaltiesTableBody');
    if (!tbody) return;
    
    if (penalties.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-state">
                    <div class="empty-icon">⚠️</div>
                    <div class="empty-title">No Penalty Records</div>
                    <div class="empty-sub">Click "Add Penalty" to create a new penalty record</div>
                 </div>
                 </span>
                </td>
            </tr>
        `;
        return;
    }
    
    const sortedPenalties = [...penalties].sort((a, b) => b.id - a.id);
    
    tbody.innerHTML = sortedPenalties.map(penalty => `
        <tr data-penalty-id="${penalty.id}">
            <td>
                <input type="checkbox" class="penalty-checkbox" data-id="${penalty.id}" ${selectedPenalties.has(penalty.id) ? 'checked' : ''}>
             </span>
            <td><strong>${escapeHtml(penalty.studentId)}</strong></td>
            <td>${escapeHtml(penalty.violation)}</span></td>
            <td>${escapeHtml(penalty.serviceType)}</span></td>
            <td>${penalty.hours}</td>
            <td>
                <span class="status-badge status-${penalty.status === 'in-progress' ? 'in-progress' : penalty.status}">
                    ${penalty.status === 'in-progress' ? 'In Progress' : penalty.status.charAt(0).toUpperCase() + penalty.status.slice(1)}
                </span>
             </span>
            <td>${formatDate(penalty.deadline)}</span></td>
            <td>
                <button class="action-icon edit-penalty" data-id="${penalty.id}" title="Edit">✏️</button>
                <button class="action-icon delete-penalty" data-id="${penalty.id}" title="Delete">🗑️</button>
             </span>
        </tr>
    `).join('');
    
    document.querySelectorAll('.edit-penalty').forEach(btn => {
        btn.onclick = () => editPenaltyById(parseInt(btn.dataset.id));
    });
    
    document.querySelectorAll('.delete-penalty').forEach(btn => {
        btn.onclick = () => deleteSinglePenalty(parseInt(btn.dataset.id));
    });
    
    document.querySelectorAll('.penalty-checkbox').forEach(cb => {
        cb.onchange = () => updateSelectAllCheckbox();
    });
    
    updateSelectAllCheckbox();
}

// ============ DELETE SINGLE PENALTY ============
async function deleteSinglePenalty(id) {
    if (confirm('Are you sure you want to delete this penalty?')) {
        const { error } = await supabase
            .from('penalties')
            .delete()
            .eq('id', id);
        
        if (error) {
            showNotification('Failed to delete penalty', 'error');
            return;
        }
        
        selectedPenalties.delete(id);
        await loadPenalties();
        showNotification('Penalty deleted successfully!', 'success');
    }
}

// ============ SAVE PENALTY ============
async function savePenaltyToSupabase(penaltyData, isEdit = false) {
    try {
        if (isEdit && currentEditPenaltyId) {
            const { error } = await supabase
                .from('penalties')
                .update({
                    student_id: penaltyData.studentId,
                    violation: penaltyData.violation,
                    service_type: penaltyData.serviceType,
                    hours: parseInt(penaltyData.hours),
                    status: penaltyData.status,
                    deadline: penaltyData.deadline,
                    updated_at: new Date().toISOString()
                })
                .eq('id', currentEditPenaltyId);
            
            if (error) throw error;
            showNotification('Penalty updated successfully!', 'success');
            return true;
        } else {
            // Check if student exists
            const { data: studentExists } = await supabase
                .from('students')
                .select('id')
                .eq('id', penaltyData.studentId)
                .maybeSingle();
            
            if (!studentExists) {
                showNotification(`Student ID "${penaltyData.studentId}" not found!`, 'error');
                return false;
            }
            
            const { error } = await supabase
                .from('penalties')
                .insert([{
                    student_id: penaltyData.studentId,
                    violation: penaltyData.violation,
                    service_type: penaltyData.serviceType,
                    hours: parseInt(penaltyData.hours),
                    status: penaltyData.status,
                    deadline: penaltyData.deadline,
                    created_at: new Date().toISOString()
                }]);
            
            if (error) throw error;
            showNotification('Penalty added successfully!', 'success');
            return true;
        }
    } catch (error) {
        console.error('Error saving penalty:', error);
        showNotification('Failed to save penalty: ' + error.message, 'error');
        return false;
    }
}

// ============ SAVE PENALTY (Form Submit) ============
async function savePenalty(e) {
    e.preventDefault();
    
    const studentId = document.getElementById('penaltyStudentId').value.trim();
    const violation = document.getElementById('penaltyViolation').value.trim();
    const serviceType = document.getElementById('penaltyServiceType').value;
    const hours = parseInt(document.getElementById('penaltyHours').value);
    const status = document.getElementById('penaltyStatus').value;
    const deadline = document.getElementById('penaltyDeadline').value;
    
    if (!studentId || !violation || !hours || !deadline) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }
    
    const penaltyData = {
        studentId: studentId,
        violation: violation,
        serviceType: serviceType,
        hours: hours,
        status: status,
        deadline: deadline
    };
    
    const success = await savePenaltyToSupabase(penaltyData, !!currentEditPenaltyId);
    
    if (success) {
        await loadPenalties();
        closePenaltyModal();
    }
}

// ============ EDIT PENALTY ============
function editPenaltyById(id) {
    const penalty = penalties.find(p => p.id === id);
    if (!penalty) return;
    
    currentEditPenaltyId = id;
    document.getElementById('modalTitle').textContent = 'Edit Penalty';
    document.getElementById('penaltyId').value = penalty.id;
    document.getElementById('penaltyStudentId').value = penalty.studentId;
    document.getElementById('penaltyViolation').value = penalty.violation;
    document.getElementById('penaltyServiceType').value = penalty.serviceType;
    document.getElementById('penaltyHours').value = penalty.hours;
    document.getElementById('penaltyStatus').value = penalty.status;
    document.getElementById('penaltyDeadline').value = penalty.deadline;
    document.getElementById('penaltyModal').classList.add('open');
}

// ============ DELETE SELECTED ============
async function deleteSelectedPenalties() {
    if (selectedPenalties.size === 0) {
        showNotification('Please select penalties to delete', 'warning');
        return;
    }
    
    if (confirm(`Are you sure you want to delete ${selectedPenalties.size} penalty/penalties?`)) {
        let success = true;
        for (const id of selectedPenalties) {
            const { error } = await supabase
                .from('penalties')
                .delete()
                .eq('id', id);
            if (error) success = false;
        }
        
        if (success) {
            selectedPenalties.clear();
            await loadPenalties();
            showNotification('Penalties deleted successfully!', 'success');
        } else {
            showNotification('Some penalties could not be deleted', 'error');
        }
    }
}

// ============ COMMUNITY SERVICE FILTER ============
let isFiltered = false;
let originalPenalties = [];

function filterCommunityService() {
    if (!isFiltered) {
        originalPenalties = [...penalties];
        const filtered = penalties.filter(p => p.serviceType === 'Community Service');
        renderFilteredTable(filtered);
        isFiltered = true;
        const btn = document.getElementById('communityServiceBtn');
        if (btn) btn.style.background = '#2563eb';
    } else {
        renderFilteredTable(originalPenalties);
        isFiltered = false;
        const btn = document.getElementById('communityServiceBtn');
        if (btn) btn.style.background = '';
    }
}

function renderFilteredTable(filtered) {
    const tbody = document.getElementById('penaltiesTableBody');
    if (!tbody) return;
    
    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="empty-state">No community service penalties found</td</tr>`;
        return;
    }
    
    tbody.innerHTML = filtered.map(penalty => `
        <tr data-penalty-id="${penalty.id}">
            <td><input type="checkbox" class="penalty-checkbox" data-id="${penalty.id}"></td>
            <td><strong>${escapeHtml(penalty.studentId)}</strong></td>
            <td>${escapeHtml(penalty.violation)}</span></td>
            <td>${escapeHtml(penalty.serviceType)}</span></td>
            <td>${penalty.hours}</td>
            <td><span class="status-badge status-${penalty.status}">${penalty.status}</span></span></td>
            <td>${formatDate(penalty.deadline)}</span></td>
            <td>
                <button class="action-icon edit-penalty" data-id="${penalty.id}">✏️</button>
                <button class="action-icon delete-penalty" data-id="${penalty.id}">🗑️</button>
             </span>
        </tr>
    `).join('');
    
    document.querySelectorAll('.edit-penalty').forEach(btn => {
        btn.onclick = () => editPenaltyById(parseInt(btn.dataset.id));
    });
    document.querySelectorAll('.delete-penalty').forEach(btn => {
        btn.onclick = () => deleteSinglePenalty(parseInt(btn.dataset.id));
    });
}

// ============ HELPER FUNCTIONS ============
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
}

function updateSelectAllCheckbox() {
    const selectAll = document.getElementById('selectAll');
    if (!selectAll) return;
    
    const allCheckboxes = document.querySelectorAll('.penalty-checkbox');
    if (allCheckboxes.length === 0) {
        selectAll.checked = false;
        selectAll.indeterminate = false;
        return;
    }
    
    const checkedCount = document.querySelectorAll('.penalty-checkbox:checked').length;
    selectAll.checked = checkedCount === allCheckboxes.length;
    selectAll.indeterminate = checkedCount > 0 && checkedCount < allCheckboxes.length;
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.textContent = message;
    const bgColor = type === 'success' ? '#10B981' : (type === 'error' ? '#EF4444' : '#F59E0B');
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 12px 20px;
        background: ${bgColor};
        color: white;
        border-radius: 10px;
        font-size: 13px;
        font-weight: 500;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============ MODAL FUNCTIONS ============
function openAddPenaltyModal() {
    currentEditPenaltyId = null;
    document.getElementById('modalTitle').textContent = 'Add New Penalty';
    document.getElementById('penaltyForm').reset();
    document.getElementById('penaltyId').value = '';
    document.getElementById('penaltyModal').classList.add('open');
}

function closePenaltyModal() {
    document.getElementById('penaltyModal').classList.remove('open');
    currentEditPenaltyId = null;
}

// ============ LOGOUT ============
async function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        await supabase.auth.signOut();
        localStorage.clear();
        window.location.href = '/Assets/Landing/index.html';
    }
}

// ============ SETUP EVENT LISTENERS ============
function setupEventListeners() {
    document.getElementById('addPenaltyBtn')?.addEventListener('click', openAddPenaltyModal);
    document.getElementById('closeModalBtn')?.addEventListener('click', closePenaltyModal);
    document.getElementById('penaltyModal')?.addEventListener('click', (e) => {
        if (e.target === document.getElementById('penaltyModal')) closePenaltyModal();
    });
    document.getElementById('penaltyForm')?.addEventListener('submit', savePenalty);
    document.getElementById('editPenaltyBtn')?.addEventListener('click', () => {
        if (selectedPenalties.size !== 1) {
            showNotification('Please select exactly one penalty to edit', 'warning');
            return;
        }
        const id = Array.from(selectedPenalties)[0];
        editPenaltyById(id);
    });
    document.getElementById('deletePenaltyBtn')?.addEventListener('click', deleteSelectedPenalties);
    document.getElementById('communityServiceBtn')?.addEventListener('click', filterCommunityService);
    document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
    
    const selectAll = document.getElementById('selectAll');
    if (selectAll) {
        selectAll.addEventListener('change', (e) => {
            document.querySelectorAll('.penalty-checkbox').forEach(cb => {
                cb.checked = e.target.checked;
                const id = parseInt(cb.dataset.id);
                if (e.target.checked) {
                    selectedPenalties.add(id);
                } else {
                    selectedPenalties.delete(id);
                }
            });
        });
    }
}
// ============ DARK MODE ============
// Check saved preference on page load
const savedDarkMode = localStorage.getItem('docst_dark_mode');
if (savedDarkMode === 'enabled') {
    document.body.classList.add('dark-mode');
}

// Function to toggle dark mode
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('docst_dark_mode', isDark ? 'enabled' : 'disabled');
    
    // Optional: Show notification
    const notification = document.createElement('div');
    notification.textContent = isDark ? '🌙 Dark mode enabled' : '☀️ Light mode enabled';
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 10px 20px;
        background: ${isDark ? '#1E293B' : '#1D4ED8'};
        color: white;
        border-radius: 8px;
        font-size: 13px;
        z-index: 10000;
        animation: fadeInOut 2s ease;
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 2000);
}

// Add dark mode toggle button to topbar
function addDarkModeButton() {
    const topbarRight = document.querySelector('.topbar-right');
    if (topbarRight && !document.getElementById('darkModeToggleBtn')) {
        const btn = document.createElement('button');
        btn.id = 'darkModeToggleBtn';
        btn.className = 'icon-btn';
        btn.style.marginRight = '8px';
        btn.onclick = toggleDarkMode;
        
        // Set initial icon based on current mode
        const isDark = document.body.classList.contains('dark-mode');
        btn.innerHTML = isDark ? '☀️' : '🌙';
        
        topbarRight.insertBefore(btn, topbarRight.firstChild);
    }
}

// Update button icon when dark mode toggles (optional)
function updateDarkModeButtonIcon() {
    const btn = document.getElementById('darkModeToggleBtn');
    if (btn) {
        const isDark = document.body.classList.contains('dark-mode');
        btn.innerHTML = isDark ? '☀️' : '🌙';
    }
}

// Override toggleDarkMode to update button
const originalToggle = toggleDarkMode;
window.toggleDarkMode = function() {
    originalToggle();
    updateDarkModeButtonIcon();
};

// Add animation keyframes
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInOut {
        0% { opacity: 0; transform: translateX(20px); }
        15% { opacity: 1; transform: translateX(0); }
        85% { opacity: 1; transform: translateX(0); }
        100% { opacity: 0; transform: translateX(20px); }
    }
`;
document.head.appendChild(style);

// Call this when page loads
document.addEventListener('DOMContentLoaded', addDarkModeButton);
// ============ INITIALIZE ============
async function init() {
    console.log('Initializing Penalties Management...');
    await loadAdminName();
    await loadStudentsCount();
    await loadPenalties();
    setupEventListeners();
}

init();