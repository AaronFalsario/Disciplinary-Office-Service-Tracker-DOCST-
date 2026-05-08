import { createClient } from '@supabase/supabase-js'
import { setupAdminDrawer, setupAdminLogout, setupAdminDrawerControls, getCurrentAdmin } from '/Assets/drawer-admin.js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

let students = [];
let editingStudentId = null;
let currentAdmin = null;
let searchTerm = '';

// ============ DARK MODE - USING YOUR FUNCTION ============
function updateDarkModeIcon(btn, isDark) {
    if (!btn) return;
    if (isDark) {
        btn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="12" x2="23" y2="12"/>
            </svg>
        `;
    } else {
        btn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
        `;
    }
}

function setupDarkModeToggle() {
    const darkModeBtn = document.getElementById('darkModeToggle');
    if (!darkModeBtn) return;
    
    // Apply saved dark mode on page load
    const savedMode = localStorage.getItem('docst_dark_mode');
    if (savedMode === 'enabled') {
        document.body.classList.add('dark-mode');
        updateDarkModeIcon(darkModeBtn, true);
    } else {
        updateDarkModeIcon(darkModeBtn, false);
    }
    
    darkModeBtn.onclick = () => {
        document.body.classList.toggle('dark-mode');
        const nowDark = document.body.classList.contains('dark-mode');
        localStorage.setItem('docst_dark_mode', nowDark ? 'enabled' : 'disabled');
        updateDarkModeIcon(darkModeBtn, nowDark);
        
        const notification = document.createElement('div');
        notification.textContent = nowDark ? '🌙 Dark mode enabled' : '☀️ Light mode enabled';
        notification.style.cssText = `
            position: fixed; bottom: 20px; right: 20px; padding: 10px 20px;
            background: ${nowDark ? '#1E293B' : '#2563EB'}; color: white;
            border-radius: 8px; font-size: 13px; z-index: 10000;
            animation: fadeInOut 2s ease;
        `;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 2000);
    };
}

// Add fadeInOut animation
const darkModeStyle = document.createElement('style');
darkModeStyle.textContent = `
    @keyframes fadeInOut {
        0% { opacity: 0; transform: translateX(20px); }
        15% { opacity: 1; transform: translateX(0); }
        85% { opacity: 1; transform: translateX(0); }
        100% { opacity: 0; transform: translateX(20px); }
    }
`;
document.head.appendChild(darkModeStyle);

// ============ UPDATE DRAWER WITH ADMIN NAME ============
function updateDrawerWithAdminName(adminName, adminId) {
    console.log('🔧 Updating drawer with:', adminName, adminId);
    
    const drawerNameEl = document.getElementById('drawerAdminName');
    const drawerIdEl = document.getElementById('drawerAdminId');
    const avatarInitials = document.getElementById('avatarInitials');
    
    if (drawerNameEl) {
        drawerNameEl.textContent = adminName;
    }
    
    if (drawerIdEl) {
        drawerIdEl.textContent = adminId || 'Admin';
    }
    
    if (avatarInitials && adminName) {
        const initials = getInitialsFromName(adminName);
        avatarInitials.textContent = initials;
    }
}

function getInitialsFromName(fullName) {
    if (!fullName) return 'AD';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) {
        return parts[0].substring(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ============ LOAD ADMIN PROFILE ============
async function loadAdminProfile() {
    try {
        const admin = getCurrentAdmin();
        if (admin && (admin.full_name || admin.name)) {
            currentAdmin = admin;
            const adminName = admin.full_name || admin.name;
            updateDrawerWithAdminName(adminName, admin.admin_id || 'Admin');
            return;
        }
        
        const { data: { user } } = await supabase.auth.getUser();
        if (user && user.email) {
            let adminData = null;
            
            const { data: data1, error: err1 } = await supabase
                .from('admins')
                .select('full_name, name, email, role, admin_id')
                .eq('email', user.email)
                .maybeSingle();
            
            if (!err1 && data1) {
                adminData = data1;
            } else {
                const { data: data2, error: err2 } = await supabase
                    .from('admin')
                    .select('full_name, name, email, role, admin_id')
                    .eq('email', user.email)
                    .maybeSingle();
                
                if (!err2 && data2) {
                    adminData = data2;
                }
            }
            
            if (adminData) {
                const adminName = adminData.full_name || adminData.name || user.email.split('@')[0];
                currentAdmin = {
                    full_name: adminName,
                    name: adminName,
                    email: adminData.email,
                    role: adminData.role,
                    admin_id: adminData.admin_id
                };
                localStorage.setItem('currentAdmin', JSON.stringify(currentAdmin));
                updateDrawerWithAdminName(adminName, adminData.admin_id || 'Admin');
            } else {
                const emailName = user.email.split('@')[0];
                updateDrawerWithAdminName(emailName, 'Admin');
            }
        }
    } catch (error) {
        console.error('Error loading admin profile:', error);
        const admin = getCurrentAdmin();
        if (admin && (admin.full_name || admin.name)) {
            updateDrawerWithAdminName(admin.full_name || admin.name, admin.admin_id || 'Admin');
        }
    }
}

// ============ LOAD STUDENTS FROM SUPABASE ============
async function loadStudents() {
    try {
        console.log('Loading students from Supabase...');
        
        const { data, error } = await supabase
            .from('students')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        if (data && data.length > 0) {
            students = data.map(s => ({
                id: s.id,
                name: s.name,
                idNumber: s.id_number || s.id,
                email: s.email,
                course: s.course || 'Not Assigned',
                year: s.year_level || 1,
                status: s.status || 'active',
                reports: s.reports || 0,
                last_login: s.last_login,
                created_at: s.created_at
            }));
            console.log('Processed students:', students.length);
        } else {
            students = [];
        }
        
        renderStudents();
        updateStats();
        
    } catch (error) {
        console.error('Error loading students:', error);
        students = [];
        renderStudents();
        updateStats();
        showNotification('Failed to load students: ' + error.message, 'error');
    }
}

// ============ RENDER STUDENTS TABLE ============
function renderStudents() {
    const tbody = document.getElementById('studentsTableBody');
    if (!tbody) return;
    
    if (students.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="empty-state"><div class="empty-icon">👨‍🎓</div><div class="empty-title">No students yet</div><div>Click "Add Student" to enroll</div></td></tr>`;
        return;
    }
    
    let filtered = students;
    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = students.filter(s => 
            s.name?.toLowerCase().includes(term) ||
            s.idNumber?.toLowerCase().includes(term) ||
            s.email?.toLowerCase().includes(term)
        );
    }
    
    tbody.innerHTML = filtered.map(student => {
        let fullName = student.name || 'Unknown';
        const initials = getInitials(fullName);
        
        const yearNum = parseInt(student.year) || 1;
        const yearSuffix = yearNum === 1 ? 'st' : yearNum === 2 ? 'nd' : yearNum === 3 ? 'rd' : 'th';
        const yearDisplay = `${yearNum}${yearSuffix} Year`;
        
        const lastLoginDisplay = formatDate(student.last_login);
        const statusDisplay = student.status === 'active' ? '🟢 Active' : '⚫ Inactive';
        const statusClass = student.status === 'active' ? 'status-active' : 'status-inactive';
        
        return `
        <tr data-id="${student.id}">
            <td class="student-col">
                <div class="student-cell">
                    <div class="student-avatar">${initials}</div>
                    <div>
                        <div class="student-name">${escapeHtml(fullName)}</div>
                        <div class="student-id-small">${escapeHtml(student.idNumber)}</div>
                    </div>
                </div>
              </td>
            <td class="id-col">
                <span class="id-badge">${escapeHtml(student.idNumber)}</span>
              </td>
            <td class="email-col">
                <span class="email-badge">${escapeHtml(student.email)}</span>
              </td>
            <td class="course-col">
                <span class="course-badge">${escapeHtml(student.course)}</span>
              </td>
            <td class="year-col">
                ${yearDisplay}
              </td>
            <td class="status-col">
                <span class="status-badge ${statusClass}">${statusDisplay}</span>
              </td>
            <td class="last-login-col">
                ${lastLoginDisplay}
              </td>
            <td class="actions-col">
                <div class="action-btns">
                    <button class="action-icon edit-student" data-id="${student.id}" title="Edit">✏️</button>
                    <button class="action-icon toggle-status" data-id="${student.id}" title="Toggle Status">🔄</button>
                    <button class="action-icon delete-student" data-id="${student.id}" title="Delete">🗑️</button>
                </div>
              </td>
        </tr>
    `}).join('');
    
    document.querySelectorAll('.edit-student').forEach(btn => {
        btn.onclick = () => editStudent(btn.dataset.id);
    });
    
    document.querySelectorAll('.delete-student').forEach(btn => {
        btn.onclick = () => deleteStudent(btn.dataset.id);
    });
    
    document.querySelectorAll('.toggle-status').forEach(btn => {
        btn.onclick = () => toggleStudentStatus(btn.dataset.id);
    });
}

function getInitials(fullName) {
    if (!fullName) return '??';
    const words = fullName.trim().split(/\s+/);
    if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

function formatDate(dateString) {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = Math.floor((now - date) / 3600000);
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours} hours ago`;
    return date.toLocaleDateString();
}

function updateStats() {
    const total = students.length;
    const active = students.filter(s => s.status === 'active').length;
    const verified = students.filter(s => s.email?.endsWith('@gordoncollege.edu.ph')).length;
    
    const totalEl = document.getElementById('totalStudents');
    const activeEl = document.getElementById('activeStudents');
    const verifiedEl = document.getElementById('verifiedEmails');
    
    if (totalEl) totalEl.textContent = total;
    if (activeEl) activeEl.textContent = active;
    if (verifiedEl) verifiedEl.textContent = verified;
}

function showNotification(message, type = 'success') {
    const n = document.createElement('div');
    n.textContent = message;
    const bgColor = type === 'success' ? '#10B981' : (type === 'error' ? '#DC2626' : '#F59E0B');
    n.style.cssText = `position:fixed;bottom:20px;right:20px;background:${bgColor};color:white;padding:10px 18px;border-radius:40px;z-index:2000;font-size:14px;`;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 3000);
}

function escapeHtml(text) { 
    if (!text) return ''; 
    const div = document.createElement('div'); 
    div.textContent = text; 
    return div.innerHTML; 
}

// ============ TOGGLE STUDENT STATUS ============
async function toggleStudentStatus(id) {
    const student = students.find(s => s.id == id);
    if (student) {
        const newStatus = student.status === 'active' ? 'inactive' : 'active';
        
        const { error } = await supabase
            .from('students')
            .update({ status: newStatus })
            .eq('id', id);
        
        if (error) {
            showNotification('Failed to update status', 'error');
            return;
        }
        
        student.status = newStatus;
        renderStudents();
        updateStats();
        showNotification(`${student.name} is now ${newStatus}`, 'success');
    }
}

// ============ DELETE STUDENT ============
async function deleteStudent(id) {
    const student = students.find(s => s.id == id);
    if (!student) return;
    
    if (confirm(`Are you sure you want to delete "${student.name}"?`)) {
        const { error } = await supabase
            .from('students')
            .delete()
            .eq('id', id);
        
        if (error) {
            showNotification('Failed to delete student', 'error');
            return;
        }
        
        students = students.filter(s => s.id != id);
        renderStudents();
        updateStats();
        showNotification(`✓ ${student.name} has been deleted`, 'success');
    }
}

// ============ EDIT STUDENT ============
function editStudent(id) {
    const student = students.find(s => s.id == id);
    if (!student) return;
    
    editingStudentId = id;
    document.getElementById('studentId').value = student.id;
    document.getElementById('studentName').value = student.name;
    document.getElementById('studentIdNumber').value = student.idNumber;
    document.getElementById('studentCourse').value = student.course;
    document.getElementById('studentYear').value = student.year;
    document.getElementById('studentEmail').value = student.email;
    document.getElementById('studentStatus').value = student.status;
    document.getElementById('modalTitle').textContent = 'Edit Student';
    openModal();
}

// ============ SAVE STUDENT ============
async function saveStudent(studentData, isEdit = false) {
    try {
        if (isEdit && editingStudentId) {
            const { error } = await supabase
                .from('students')
                .update({
                    name: studentData.name,
                    email: studentData.email,
                    course: studentData.course,
                    year_level: parseInt(studentData.year),
                    status: studentData.status,
                    updated_at: new Date().toISOString()
                })
                .eq('id', editingStudentId);
            
            if (error) throw error;
            showNotification('Student updated successfully!');
        } else {
            const { error } = await supabase
                .from('students')
                .insert([{
                    id: studentData.idNumber,
                    name: studentData.name,
                    email: studentData.email,
                    course: studentData.course,
                    year_level: parseInt(studentData.year),
                    status: studentData.status,
                    created_at: new Date().toISOString()
                }]);
            
            if (error) throw error;
            showNotification('Student added successfully!');
        }
        
        await loadStudents();
        closeModal();
    } catch (error) {
        console.error('Error saving student:', error);
        showNotification('Failed to save student: ' + error.message, 'error');
    }
}

// ============ FORM SUBMIT ============
const studentForm = document.getElementById('studentForm');
if (studentForm) {
    studentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const studentData = {
            name: document.getElementById('studentName')?.value.trim() || '',
            idNumber: document.getElementById('studentIdNumber')?.value.trim() || '',
            course: document.getElementById('studentCourse')?.value || 'Not Assigned',
            year: document.getElementById('studentYear')?.value || '1',
            email: document.getElementById('studentEmail')?.value.trim() || '',
            status: document.getElementById('studentStatus')?.value || 'active'
        };
        
        if (!studentData.name || !studentData.idNumber || !studentData.email) {
            showNotification('Please fill in all fields', 'error');
            return;
        }
        
        if (!studentData.email.endsWith('@gordoncollege.edu.ph')) {
            showNotification('Email must end with @gordoncollege.edu.ph', 'error');
            return;
        }
        
        const existingId = document.getElementById('studentId')?.value;
        
        if (existingId) {
            editingStudentId = existingId;
            await saveStudent(studentData, true);
        } else {
            await saveStudent(studentData, false);
        }
    });
}

// ============ MODAL FUNCTIONS ============
function openModal() { 
    const modal = document.getElementById('studentModal');
    if (modal) modal.classList.add('open'); 
    document.body.style.overflow = 'hidden'; 
}

function closeModal() {
    const modal = document.getElementById('studentModal');
    if (modal) modal.classList.remove('open');
    const form = document.getElementById('studentForm');
    if (form) form.reset();
    document.getElementById('studentId').value = '';
    editingStudentId = null;
    document.getElementById('modalTitle').textContent = 'Add New Student';
    document.body.style.overflow = '';
}

// ============ SEARCH ============
const searchInput = document.getElementById('searchInput');
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        searchTerm = e.target.value.toLowerCase();
        renderStudents();
    });
}

// ============ LOGOUT ============
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        if (confirm('Are you sure you want to logout?')) {
            await supabase.auth.signOut();
            localStorage.clear();
            window.location.href = '/Assets/Landing/index.html';
        }
    });
}

// ============ ADD BUTTON ============
const addBtn = document.getElementById('addStudentBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const studentModal = document.getElementById('studentModal');

if (addBtn) addBtn.addEventListener('click', openModal);
if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
if (studentModal) {
    studentModal.addEventListener('click', (e) => {
        if (e.target === studentModal) closeModal();
    });
}

// ============ INITIALIZE ============
async function init() {
    console.log('Initializing Student Management...');
    
    await loadAdminProfile();
    
    const admin = getCurrentAdmin();
    const adminName = admin?.full_name || admin?.name || 'Administrator';
    const adminId = admin?.admin_id || 'Admin';
    
    setupAdminDrawer(adminName, adminId);
    setupAdminLogout('logoutBtn');
    setupAdminDrawerControls();
    
    setupDarkModeToggle();  // Using your dark mode function
    await loadStudents();
}

init();