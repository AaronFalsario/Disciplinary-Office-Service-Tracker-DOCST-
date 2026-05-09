import { initAdminDrawer } from '../../drawer-admin.js';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';
const supabase = createClient(supabaseUrl, supabaseKey);

// ============ INITIALIZE DRAWER (SAME AS ADMIN DASHBOARD) ============
initAdminDrawer();

// ============ LOAD PENALTIES ============
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
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 40px;">No penalties found</td></tr>';
        return;
    }
    
    tbody.innerHTML = penalties.map(penalty => `
        <tr data-id="${penalty.id}">
            <td style="text-align: center;"><input type="checkbox" class="penalty-checkbox" data-id="${penalty.id}"></td>
            <td><strong>${escapeHtml(penalty.student_id || 'N/A')}</strong></td>
            <td>${escapeHtml(penalty.violation || 'N/A')}</td>
            <td>${escapeHtml(penalty.service_type || 'N/A')}</td>
            <td>${penalty.hours || 0} hrs</td>
            <td><span class="status-badge status-${penalty.status || 'pending'}">${penalty.status || 'pending'}</span></td>
            <td>${penalty.deadline ? new Date(penalty.deadline).toLocaleDateString() : 'N/A'}</td>
            <td>
                <button class="edit-penalty-btn" data-id="${penalty.id}" style="background: none; border: none; cursor: pointer; margin-right: 8px;">
                    <i class="fas fa-edit" style="color: var(--blue);"></i>
                </button>
                <button class="delete-penalty-btn" data-id="${penalty.id}" style="background: none; border: none; cursor: pointer;">
                    <i class="fas fa-trash" style="color: var(--red);"></i>
                </button>
            </td>
        </tr>
    `).join('');
    
    document.querySelectorAll('.edit-penalty-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            editPenalty(btn.dataset.id);
        });
    });
    
    document.querySelectorAll('.delete-penalty-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            deletePenalty(btn.dataset.id);
        });
    });
}

function updateStats(penalties) {
    const totalStudents = document.getElementById('totalStudents');
    const totalPenalties = document.getElementById('totalPenalties');
    const pendingCases = document.getElementById('pendingCases');
    const completedHours = document.getElementById('completedHours');
    
    if (totalStudents) totalStudents.textContent = penalties.length;
    if (totalPenalties) totalPenalties.textContent = penalties.length;
    
    const pending = penalties.filter(p => p.status === 'pending').length;
    if (pendingCases) pendingCases.textContent = pending;
    
    const completed = penalties
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + (p.hours || 0), 0);
    if (completedHours) completedHours.textContent = completed;
}

// ============ SAVE PENALTY ============
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
            const { error } = await supabase
                .from('penalties')
                .update(penaltyData)
                .eq('id', penaltyId);
            if (error) throw error;
            showAlert('Penalty updated successfully!', 'success');
        } else {
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
        if (darkModeToggle) darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }
    
    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', () => {
            const isDark = document.body.classList.toggle('dark-mode');
            localStorage.setItem('docst_dark_mode', isDark ? 'enabled' : 'disabled');
            darkModeToggle.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        });
    }
}

// ============ SELECT ALL ============
function initSelectAll() {
    const selectAll = document.getElementById('selectAll');
    if (!selectAll) return;
    
    selectAll.addEventListener('change', (e) => {
        document.querySelectorAll('.penalty-checkbox').forEach(cb => {
            cb.checked = e.target.checked;
        });
    });
}

function getSelectedPenaltyIds() {
    return Array.from(document.querySelectorAll('.penalty-checkbox:checked'))
        .map(cb => cb.dataset.id);
}

// ============ ALERT ============
function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.textContent = message;
    alertDiv.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        z-index: 10000;
        background: ${type === 'success' ? '#10B981' : '#EF4444'};
        color: white;
        animation: slideIn 0.3s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 3000);
}

// Add animation style
if (!document.querySelector('#alert-styles')) {
    const style = document.createElement('style');
    style.id = 'alert-styles';
    style.textContent = `
        @keyframes slideIn {
            from { opacity: 0; transform: translateX(100%); }
            to { opacity: 1; transform: translateX(0); }
        }
    `;
    document.head.appendChild(style);
}

function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ============ INITIALIZE ============
function init() {
    console.log('Initializing Penalties Page...');
    initDarkMode();
    loadPenalties();
    initSelectAll();

    const addPenaltyBtn = document.getElementById('addPenaltyBtn');
    const editPenaltyBtn = document.getElementById('editPenaltyBtn');
    const deletePenaltyBtn = document.getElementById('deletePenaltyBtn');
    const communityServiceBtn = document.getElementById('communityServiceBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const penaltyModal = document.getElementById('penaltyModal');
    const penaltyForm = document.getElementById('penaltyForm');

    if (addPenaltyBtn) {
        addPenaltyBtn.addEventListener('click', () => {
            document.getElementById('modalTitle').textContent = 'Add New Penalty';
            document.getElementById('penaltyId').value = '';
            document.getElementById('penaltyForm').reset();
            openModal();
        });
    }

    if (editPenaltyBtn) {
        editPenaltyBtn.addEventListener('click', () => {
            const selected = getSelectedPenaltyIds();
            if (selected.length !== 1) {
                showAlert('Please select exactly one penalty to edit', 'error');
                return;
            }
            editPenalty(selected[0]);
        });
    }

    if (deletePenaltyBtn) {
        deletePenaltyBtn.addEventListener('click', async () => {
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
    }

    if (communityServiceBtn) {
        communityServiceBtn.addEventListener('click', () => {
            window.location.href = 'community-service.html';
        });
    }

    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    
    if (penaltyModal) {
        penaltyModal.addEventListener('click', (e) => {
            if (e.target === penaltyModal) closeModal();
        });
    }
    
    if (penaltyForm) penaltyForm.addEventListener('submit', savePenalty);
    
    console.log('Penalties Page Initialized');
}

// Start everything when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}