console.log('🔍 Checking drawer elements...');
console.log('drawerNavMain exists?', document.getElementById('drawerNavMain'));
console.log('drawer exists?', document.getElementById('drawer'));

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { setupAdminDrawer, setupAdminLogout, setupAdminDrawerControls, getCurrentAdmin } from '/Assets/drawer-admin.js';

const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';
const supabase = createClient(supabaseUrl, supabaseKey);

// ============ DRAWER SETUP - THIS WAS MISSING ============
function initDrawer() {
    console.log('🔧 Initializing drawer...');
    
    // Get admin from localStorage
    const admin = getCurrentAdmin();
    const adminName = admin?.full_name || admin?.name || 'Administrator';
    const adminId = admin?.admin_id || admin?.email?.split('@')[0] || 'ADMIN001';
    
    // Setup the drawer with admin info
    setupAdminDrawer(adminName, adminId);
    setupAdminLogout('logoutBtn');
    setupAdminDrawerControls();
    
    console.log('✅ Drawer initialized with:', adminName);
}

// ============ LOAD PENALTIES FROM SUPABASE ============
async function loadPenalties() {
    try {
        const { data, error } = await supabase
            .from('penalties')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        displayPenalties(data || []);
        updateStats(data || []);
        
    } catch (error) {
        console.error('Error loading penalties:', error);
        showAlert('Failed to load penalties', 'error');
    }
}

function displayPenalties(penalties) {
    const tbody = document.getElementById('penaltiesTableBody');
    if (!tbody) return;
    
    if (penalties.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">No penalties found</td></tr>';
        return;
    }
    
    tbody.innerHTML = penalties.map(penalty => `
        <tr data-id="${penalty.id}">
            <td><input type="checkbox" class="penalty-checkbox" data-id="${penalty.id}"></td>
            <td>${escapeHtml(penalty.student_id || 'N/A')}</td>
            <td>${escapeHtml(penalty.violation || 'N/A')}</td>
            <td>${escapeHtml(penalty.service_type || 'N/A')}</td>
            <td>${penalty.hours || 0}</td>
            <td><span class="status-badge status-${penalty.status || 'pending'}">${penalty.status || 'pending'}</span></td>
            <td>${penalty.deadline ? new Date(penalty.deadline).toLocaleDateString() : 'N/A'}</td>
            <td>
                <button class="edit-penalty-btn" data-id="${penalty.id}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="delete-penalty-btn" data-id="${penalty.id}">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
    
    // Attach event listeners to edit/delete buttons
    document.querySelectorAll('.edit-penalty-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.dataset.id;
            editPenalty(id);
        });
    });
    
    document.querySelectorAll('.delete-penalty-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.dataset.id;
            deletePenalty(id);
        });
    });
}

function updateStats(penalties) {
    document.getElementById('totalStudents')?.setAttribute('data-count', penalties.length);
    document.getElementById('totalPenalties')?.setAttribute('data-count', penalties.length);
    
    const pending = penalties.filter(p => p.status === 'pending').length;
    document.getElementById('pendingCases')?.setAttribute('data-count', pending);
    
    const completedHours = penalties
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + (p.hours || 0), 0);
    document.getElementById('completedHours')?.setAttribute('data-count', completedHours);
    
    // Update actual text content
    document.getElementById('totalStudents').textContent = penalties.length;
    document.getElementById('totalPenalties').textContent = penalties.length;
    document.getElementById('pendingCases').textContent = pending;
    document.getElementById('completedHours').textContent = completedHours;
}

// ============ ADD/EDIT PENALTY ============
async function savePenalty(event) {
    event.preventDefault();
    
    const penaltyId = document.getElementById('penaltyId').value;
    const studentId = document.getElementById('penaltyStudentId').value.trim();
    const violation = document.getElementById('penaltyViolation').value;
    const serviceType = document.getElementById('penaltyServiceType').value;
    const hours = parseInt(document.getElementById('penaltyHours').value);
    const status = document.getElementById('penaltyStatus').value;
    const deadline = document.getElementById('penaltyDeadline').value;
    
    if (!studentId || !violation || !serviceType || !hours || !deadline) {
        showAlert('Please fill all required fields', 'error');
        return;
    }
    
    const penaltyData = {
        student_id: studentId,
        violation: violation,
        service_type: serviceType,
        hours: hours,
        status: status,
        deadline: deadline,
        updated_at: new Date().toISOString()
    };
    
    try {
        if (penaltyId) {
            // Update existing
            const { error } = await supabase
                .from('penalties')
                .update(penaltyData)
                .eq('id', penaltyId);
            
            if (error) throw error;
            showAlert('Penalty updated successfully!', 'success');
        } else {
            // Add new
            penaltyData.created_at = new Date().toISOString();
            const { error } = await supabase
                .from('penalties')
                .insert([penaltyData]);
            
            if (error) throw error;
            showAlert('Penalty added successfully!', 'success');
        }
        
        closeModal();
        loadPenalties();
        
    } catch (error) {
        console.error('Error saving penalty:', error);
        showAlert('Failed to save penalty', 'error');
    }
}

async function editPenalty(id) {
    try {
        const { data, error } = await supabase
            .from('penalties')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) throw error;
        
        document.getElementById('modalTitle').textContent = 'Edit Penalty';
        document.getElementById('penaltyId').value = data.id;
        document.getElementById('penaltyStudentId').value = data.student_id || '';
        document.getElementById('penaltyViolation').value = data.violation || '';
        document.getElementById('penaltyServiceType').value = data.service_type || '';
        document.getElementById('penaltyHours').value = data.hours || '';
        document.getElementById('penaltyStatus').value = data.status || 'pending';
        document.getElementById('penaltyDeadline').value = data.deadline || '';
        
        openModal();
        
    } catch (error) {
        console.error('Error loading penalty:', error);
        showAlert('Failed to load penalty data', 'error');
    }
}

async function deletePenalty(id) {
    if (!confirm('Are you sure you want to delete this penalty?')) return;
    
    try {
        const { error } = await supabase
            .from('penalties')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        
        showAlert('Penalty deleted successfully!', 'success');
        loadPenalties();
        
    } catch (error) {
        console.error('Error deleting penalty:', error);
        showAlert('Failed to delete penalty', 'error');
    }
}

// ============ MODAL CONTROLS ============
function openModal() {
    const modal = document.getElementById('penaltyModal');
    if (modal) modal.style.display = 'flex';
}

function closeModal() {
    const modal = document.getElementById('penaltyModal');
    if (modal) {
        modal.style.display = 'none';
        document.getElementById('penaltyForm').reset();
        document.getElementById('penaltyId').value = '';
        document.getElementById('modalTitle').textContent = 'Add New Penalty';
    }
}

// ============ DARK MODE ============
function initDarkMode() {
    const darkModeToggle = document.getElementById('darkModeToggle');
    const savedMode = localStorage.getItem('docst_dark_mode');
    
    if (savedMode === 'enabled') {
        document.body.classList.add('dark-mode');
        if (darkModeToggle) {
            darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        }
    }
    
    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', () => {
            const isDark = document.body.classList.toggle('dark-mode');
            localStorage.setItem('docst_dark_mode', isDark ? 'enabled' : 'disabled');
            darkModeToggle.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        });
    }
}

// ============ SELECT ALL CHECKBOXES ============
function initSelectAll() {
    const selectAll = document.getElementById('selectAll');
    if (!selectAll) return;
    
    selectAll.addEventListener('change', (e) => {
        document.querySelectorAll('.penalty-checkbox').forEach(cb => {
            cb.checked = e.target.checked;
        });
    });
}

// ============ BULK ACTIONS ============
function getSelectedPenaltyIds() {
    const checkboxes = document.querySelectorAll('.penalty-checkbox:checked');
    return Array.from(checkboxes).map(cb => cb.dataset.id);
}

document.getElementById('editPenaltyBtn')?.addEventListener('click', () => {
    const selected = getSelectedPenaltyIds();
    if (selected.length !== 1) {
        showAlert('Please select exactly one penalty to edit', 'error');
        return;
    }
    editPenalty(selected[0]);
});

document.getElementById('deletePenaltyBtn')?.addEventListener('click', async () => {
    const selected = getSelectedPenaltyIds();
    if (selected.length === 0) {
        showAlert('Please select at least one penalty to delete', 'error');
        return;
    }
    
    if (confirm(`Delete ${selected.length} penalty(ies)?`)) {
        for (const id of selected) {
            await deletePenalty(id);
        }
        loadPenalties();
    }
});

document.getElementById('communityServiceBtn')?.addEventListener('click', () => {
    window.location.href = '/Assets/Admin dashboard/penalties/community-service.html';
});

// ============ ALERT SYSTEM ============
function showAlert(message, type) {
    const alertDiv = document.getElementById('alertMessage');
    if (!alertDiv) {
        console.log(`${type}: ${message}`);
        return;
    }
    
    alertDiv.textContent = message;
    alertDiv.className = `alert ${type} show`;
    
    setTimeout(() => {
        alertDiv.classList.remove('show');
    }, 3000);
}

// ============ ESCAPE HTML ============
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ============ INITIALIZE EVERYTHING ============
function init() {
    console.log('🚀 Initializing Penalties Page...');
    
    // FIRST: Initialize drawer (this was missing!)
    initDrawer();
    
    // THEN: Initialize everything else
    initDarkMode();
    loadPenalties();
    initSelectAll();
    
    // Modal controls
    document.getElementById('addPenaltyBtn')?.addEventListener('click', () => {
        document.getElementById('modalTitle').textContent = 'Add New Penalty';
        document.getElementById('penaltyId').value = '';
        document.getElementById('penaltyForm').reset();
        openModal();
    });
    
    document.getElementById('closeModalBtn')?.addEventListener('click', closeModal);
    document.getElementById('penaltyModal')?.addEventListener('click', (e) => {
        if (e.target === document.getElementById('penaltyModal')) closeModal();
    });
    
    document.getElementById('penaltyForm')?.addEventListener('submit', savePenalty);
    
    // Admin pill click - open/close drawer on mobile
    document.getElementById('adminPill')?.addEventListener('click', () => {
        const drawer = document.getElementById('drawer');
        const overlay = document.getElementById('overlay');
        drawer?.classList.toggle('open');
        overlay?.classList.toggle('open');
    });
    
    console.log('✅ Penalties Page Initialized');
}

// Start everything when DOM is ready
document.addEventListener('DOMContentLoaded', init);