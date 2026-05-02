// rec.js - Students Management (Clean Version)
import { supabase } from '../funct.js';

let students = [];
let editingStudentId = null;
let currentAdmin = null;
let searchTerm = '';

// ============ DRAWER SETUP ============
function setupDrawer() {
    const overlay = document.getElementById('overlay');
    const drawer = document.getElementById('drawer');
    const hamburger = document.getElementById('hamburger');
    const drawerClose = document.getElementById('drawerClose');
    const adminPill = document.getElementById('adminPill');

    window.openDrawer = function() {
        overlay?.classList.add('open');
        drawer?.classList.add('open');
        document.body.style.overflow = 'hidden';
    };

    window.closeDrawer = function() {
        overlay?.classList.remove('open');
        drawer?.classList.remove('open');
        document.body.style.overflow = '';
    };

    if (window.innerWidth <= 768) {
        if (hamburger) hamburger.addEventListener('click', window.openDrawer);
        if (drawerClose) drawerClose.addEventListener('click', window.closeDrawer);
        if (overlay) overlay.addEventListener('click', window.closeDrawer);
        if (adminPill) adminPill.addEventListener('click', window.openDrawer);
    }

    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) window.closeDrawer();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') window.closeDrawer();
    });
}

// ============ DARK MODE ============
function initDarkMode() {
    const savedDarkMode = localStorage.getItem('docst_dark_mode');
    if (savedDarkMode === 'enabled') {
        document.body.classList.add('dark-mode');
    }

    const topbarRight = document.querySelector('.topbar-right');
    if (topbarRight && !document.getElementById('darkModeToggle')) {
        const btn = document.createElement('button');
        btn.id = 'darkModeToggle';
        btn.innerHTML = savedDarkMode === 'enabled' ? '☀️' : '🌙';
        btn.className = 'icon-btn';
        btn.style.marginRight = '8px';
        btn.style.fontSize = '16px';
        btn.onclick = () => {
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            localStorage.setItem('docst_dark_mode', isDark ? 'enabled' : 'disabled');
            btn.innerHTML = isDark ? '☀️' : '🌙';
        };
        topbarRight.insertBefore(btn, topbarRight.firstChild);
    }
}

// ============ LOAD ADMIN PROFILE ============
async function loadAdminProfile() {
    try {
        const storedAdmin = localStorage.getItem('currentAdmin');
        if (storedAdmin) {
            currentAdmin = JSON.parse(storedAdmin);
            const adminName = currentAdmin.full_name || currentAdmin.name || 'Administrator';
            
            const drawerName = document.querySelector('.drawer-name');
            const drawerRole = document.querySelector('.drawer-role');
            const adminPill = document.getElementById('adminPill');
            const drawerAvatar = document.querySelector('.drawer-avatar');
            
            if (drawerName) drawerName.textContent = adminName;
            if (drawerRole) drawerRole.textContent = 'Disciplinary Officer';
            if (adminPill) adminPill.textContent = adminName.split(' ')[0] || 'Admin';
            if (drawerAvatar) {
                const initials = adminName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                drawerAvatar.innerHTML = `<span style="font-size: 16px; font-weight: 600; color: white;">${initials || 'AD'}</span>`;
            }
            return;
        }
        
        const { data: { user } } = await supabase.auth.getUser();
        if (user && user.email) {
            const { data: admin } = await supabase
                .from('admins')
                .select('full_name, email, role')
                .eq('email', user.email)
                .single();
            
            if (admin) {
                currentAdmin = admin;
                localStorage.setItem('currentAdmin', JSON.stringify(admin));
                
                const drawerName = document.querySelector('.drawer-name');
                const adminPill = document.getElementById('adminPill');
                const drawerAvatar = document.querySelector('.drawer-avatar');
                
                if (drawerName) drawerName.textContent = admin.full_name;
                if (adminPill) adminPill.textContent = admin.full_name?.split(' ')[0] || 'Admin';
                if (drawerAvatar) {
                    const initials = admin.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                    drawerAvatar.innerHTML = `<span style="font-size: 16px; font-weight: 600; color: white;">${initials || 'AD'}</span>`;
                }
            }
        }
    } catch (error) {
        console.error('Error loading admin profile:', error);
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
                idNumber: s.id,
                email: s.email,
                course: s.course || 'Not Assigned',
                year: s.year_level || 1,
                status: s.status || 'active',
                reports: s.reports || 0,
                last_login: s.last_login,
                created_at: s.created_at
            }));
            console.log('Processed students:', students);
        } else {
            students = [];
            console.log('No students found in database');
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

// ============ RENDER STUDENTS TABLE - FIXED ============
function renderStudents() {
    const tbody = document.getElementById('studentsTableBody');
    if (!tbody) {
        console.error('studentsTableBody not found!');
        return;
    }
    
    if (students.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="empty-state"><div class="empty-icon">👨‍🎓</div><div class="empty-title">No students yet</div><div>Click "Add Student" to enroll</div>TeD</td</td>`;
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
        // Format name - extract proper full name
        let fullName = student.name || 'Unknown';
        // If name is in "Last, First" format, convert to "First Last"
        if (fullName.includes(',')) {
            const parts = fullName.split(',');
            fullName = `${parts[1].trim()} ${parts[0].trim()}`;
        }
        // Get initials for avatar
        const initials = getInitials(fullName);
        
        // Get year display with proper suffix
        const yearNum = parseInt(student.year) || 1;
        const yearSuffix = yearNum === 1 ? 'st' : yearNum === 2 ? 'nd' : yearNum === 3 ? 'rd' : 'th';
        const yearDisplay = `${yearNum}${yearSuffix} Year`;
        
        // Format last login
        const lastLoginDisplay = formatDate(student.last_login);
        
        // Status display
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
            </span>
            <td class="email-col">
                <span class="email-badge">${escapeHtml(student.email)}</span>
            </span>
            <td class="course-col">
                <span class="course-badge">${escapeHtml(student.course)}</span>
            </span>
            <td class="year-col">
                ${yearDisplay}
            </span>
            <td class="status-col">
                <span class="status-badge ${statusClass}">${statusDisplay}</span>
            </span>
            <td class="last-login-col">
                ${lastLoginDisplay}
            </span>
            <td class="actions-col">
                <div class="action-btns">
                    <button class="action-icon edit-student" data-id="${student.id}" title="Edit">✏️</button>
                    <button class="action-icon toggle-status" data-id="${student.id}" title="Toggle Status">🔄</button>
                    <button class="action-icon delete delete-student" data-id="${student.id}" title="Delete">🗑️</button>
                </div>
            </span>
        </tr>
    `}).join('');
    
    // Attach event listeners
    document.querySelectorAll('.edit-student').forEach(btn => {
        btn.onclick = (e) => { e.preventDefault(); editStudent(btn.dataset.id); };
    });
    
    document.querySelectorAll('.delete-student').forEach(btn => {
        btn.onclick = (e) => { e.preventDefault(); deleteStudent(btn.dataset.id); };
    });
    
    document.querySelectorAll('.toggle-status').forEach(btn => {
        btn.onclick = (e) => { e.preventDefault(); toggleStudentStatus(btn.dataset.id); };
    });
}

function getInitials(fullName) {
    if (!fullName) return '??';
    const words = fullName.trim().split(/\s+/);
    if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

function getYearDisplay(year) {
    if (!year) return '1st Year';
    const num = parseInt(year);
    const suffixes = {1: 'st', 2: 'nd', 3: 'rd', 4: 'th'};
    return `${num}${suffixes[num] || 'th'} Year`;
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
    n.style.cssText = `position:fixed;bottom:20px;right:20px;background:${bgColor};color:white;padding:10px 18px;border-radius:40px;z-index:2000;`;
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
    document.getElementById('studentFullName').value = student.name;
    document.getElementById('studentIdNumber').value = student.idNumber;
    document.getElementById('studentCourse').value = student.course;
    document.getElementById('studentYear').value = student.year;
    document.getElementById('studentEmail').value = student.email;
    document.getElementById('studentStatus').value = student.status;
    document.getElementById('modalTitle').textContent = 'Edit Student';
    openModal();
}

// ============ ADD/UPDATE STUDENT ============
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
                    status: studentData.status
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
            name: document.getElementById('studentFullName')?.value.trim() || '',
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

// ============ UPDATE DATABASE WITH PROPER DATA ============
async function updateStudentData() {
    // Update specific student data
    const { error } = await supabase
        .from('students')
        .update({
            course: 'BSCS',
            year_level: 3
        })
        .eq('id', '202410312');
    
    if (error) {
        console.error('Error updating student:', error);
    } else {
        console.log('Student data updated');
    }
}

// ============ INITIALIZE ============
async function init() {
    console.log('Initializing Student Management...');
    setupDrawer();
    initDarkMode();
    await loadAdminProfile();
    await loadStudents();
    // Uncomment to update student data
    // await updateStudentData();
}

init();