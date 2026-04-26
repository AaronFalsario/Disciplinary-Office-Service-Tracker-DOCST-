// Storage key for Gordon College students only
const STUDENTS_STORAGE_KEY = 'gordon_college_students';
const STUDENT_CREDENTIALS_KEY = 'student_login_credentials';
const ALLOWED_DOMAIN = '@gordoncollege.edu.ph';

let students = [];
let currentEditId = null;
let searchTerm = '';

// Drawer functionality - FIXED RESPONSIVE
const overlay = document.getElementById('overlay');
const drawer = document.getElementById('drawer');
const hamburger = document.getElementById('hamburger');
const drawerClose = document.getElementById('drawerClose');
const adminPill = document.getElementById('adminPill');

function openDrawer() {
    overlay.classList.add('open');
    drawer.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeDrawer() {
    overlay.classList.remove('open');
    drawer.classList.remove('open');
    document.body.style.overflow = '';
}

// Function to check screen size and setup drawer behavior
function setupResponsiveDrawer() {
    if (window.innerWidth > 768) {
        drawer.classList.remove('open');
        overlay.classList.remove('open');
        document.body.style.overflow = '';
    } else {
        drawer.classList.remove('open');
        overlay.classList.remove('open');
        document.body.style.overflow = '';
    }
}

function attachEventListeners() {
    if (window.innerWidth <= 768) {
        hamburger?.addEventListener('click', openDrawer);
        drawerClose?.addEventListener('click', closeDrawer);
        overlay?.addEventListener('click', closeDrawer);
        adminPill?.addEventListener('click', openDrawer);
    } else {
        hamburger?.removeEventListener('click', openDrawer);
        drawerClose?.removeEventListener('click', closeDrawer);
        overlay?.removeEventListener('click', closeDrawer);
        adminPill?.removeEventListener('click', openDrawer);
    }
}

setupResponsiveDrawer();
attachEventListeners();

window.addEventListener('resize', () => {
    setupResponsiveDrawer();
    attachEventListeners();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && window.innerWidth <= 768) {
        closeDrawer();
    }
});

// Load students from localStorage
function loadStudents() {
    const stored = localStorage.getItem(STUDENTS_STORAGE_KEY);
    if (stored) {
        students = JSON.parse(stored);
        students = students.filter(s => s.email && s.email.toLowerCase().endsWith(ALLOWED_DOMAIN));
    } else {
        students = [];
        saveStudents();
    }
    updateStats();
    renderStudentsTable();
}

function saveStudents() {
    localStorage.setItem(STUDENTS_STORAGE_KEY, JSON.stringify(students));
    // Update student credentials when students are saved
    updateStudentCredentials();
}

// Generate a random password for new student
function generateRandomPassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

// Update student login credentials storage
function updateStudentCredentials() {
    const credentials = {};
    students.forEach(student => {
        if (student.email && student.password) {
            credentials[student.email] = {
                password: student.password,
                studentId: student.idNumber,
                name: student.name,
                status: student.status
            };
        } else if (student.email && !student.password) {
            // Generate default password for existing students without password
            const defaultPassword = generateRandomPassword();
            student.password = defaultPassword;
            credentials[student.email] = {
                password: defaultPassword,
                studentId: student.idNumber,
                name: student.name,
                status: student.status
            };
        }
    });
    localStorage.setItem(STUDENT_CREDENTIALS_KEY, JSON.stringify(credentials));
    saveStudents(); // Save updated passwords back to students array
}

// Get student credentials for login
function getStudentCredentials() {
    const stored = localStorage.getItem(STUDENT_CREDENTIALS_KEY);
    return stored ? JSON.parse(stored) : {};
}

// Verify student login (called from student login page)
window.verifyStudentLogin = function(email, password) {
    const credentials = getStudentCredentials();
    const student = credentials[email];
    
    if (student && student.password === password) {
        if (student.status !== 'active') {
            return { success: false, message: 'Account is inactive. Please contact administrator.' };
        }
        
        // Store current student session
        const session = {
            email: email,
            studentId: student.studentId,
            name: student.name,
            loginTime: new Date().toISOString()
        };
        localStorage.setItem('currentStudentSession', JSON.stringify(session));
        
        return { 
            success: true, 
            student: {
                name: student.name,
                studentId: student.studentId,
                email: email
            }
        };
    }
    return { success: false, message: 'Invalid email or password' };
}

// Get current logged-in student
window.getCurrentStudent = function() {
    const session = localStorage.getItem('currentStudentSession');
    if (session) {
        return JSON.parse(session);
    }
    return null;
};

// Logout student
window.studentLogout = function() {
    localStorage.removeItem('currentStudentSession');
    window.location.href = '/student-login.html';
};

// Reset student password (admin function)
function resetStudentPassword(studentId, newPassword = null) {
    const student = students.find(s => s.id === studentId);
    if (!student) return false;
    
    const password = newPassword || generateRandomPassword();
    student.password = password;
    saveStudents();
    updateStudentCredentials();
    
    showNotification(`Password reset for ${student.name}. New password: ${password}`, 'info');
    return password;
}

// Send email notification to student (simulated)
function sendStudentCredentials(student) {
    // This would integrate with EmailJS or your email service
    console.log(`Email would be sent to ${student.email}:`);
    console.log(`Subject: Your DOCST Account Credentials`);
    console.log(`Body: 
        Dear ${student.name},
        
        Your DOCST account has been created successfully.
        
        Student ID: ${student.idNumber}
        Email: ${student.email}
        Password: ${student.password || 'Use the password provided by the administrator'}
        
        Please login at: /student-login.html
        
        Regards,
        DOCST Administration
    `);
    
    showNotification(`Credentials sent to ${student.email} (simulated)`, 'info');
}

function validateEmail(email) {
    return email && email.toLowerCase().endsWith(ALLOWED_DOMAIN);
}

function updateStats() {
    const total = students.length;
    const active = students.filter(s => s.status === 'active').length;
    const verified = students.filter(s => validateEmail(s.email)).length;
    
    const totalEl = document.getElementById('totalStudents');
    const activeEl = document.getElementById('activeStudents');
    const verifiedEl = document.getElementById('verifiedEmails');
    
    if (totalEl) totalEl.textContent = total;
    if (activeEl) activeEl.textContent = active;
    if (verifiedEl) verifiedEl.textContent = verified;
}

function renderStudentsTable() {
    const tbody = document.getElementById('studentsTableBody');
    if (!tbody) return;
    
    let filteredStudents = students;
    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filteredStudents = students.filter(s => 
            s.name.toLowerCase().includes(term) ||
            s.idNumber.toLowerCase().includes(term) ||
            s.email.toLowerCase().includes(term)
        );
    }
    
    if (filteredStudents.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-state">
                    <div class="empty-icon">${searchTerm ? '🔍' : '👨‍🎓'}</div>
                    <div class="empty-title">${searchTerm ? 'No matching students found' : 'No students enrolled yet'}</div>
                    <div class="empty-sub">${searchTerm ? 'Try a different search term' : 'Click "Add Student" to enroll a new student'}</div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = filteredStudents.map(student => `
        <tr data-student-id="${student.id}">
            <td>
                <div class="student-cell">
                    <div class="student-avatar">${getInitials(student.name)}</div>
                    <div>
                        <div class="student-name">${escapeHtml(student.name)}</div>
                    </div>
                </div>
            </td>
            <td><strong>${escapeHtml(student.idNumber)}</strong></td>
            <td><span class="email-badge">${escapeHtml(student.email)}</span></td>
            <td>${escapeHtml(student.course || 'N/A')}</td>
            <td>${student.year}${getYearSuffix(student.year)} Year</td>
            <td>
                <span class="status-badge" style="background: ${student.status === 'active' ? 'var(--green-light)' : 'var(--red-light)'}; color: ${student.status === 'active' ? 'var(--green)' : 'var(--red)'}; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 500;">
                    ${student.status === 'active' ? 'Active' : 'Inactive'}
                </span>
            </td>
            <td>
                <div class="action-btns">
                    <button class="action-icon" onclick="editStudent(${student.id})" title="Edit">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                    </button>
                    <button class="action-icon" onclick="resetStudentPasswordPrompt(${student.id})" title="Reset Password">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 2L15 8M3 12h9m-9 4h9m-9 4h9"/>
                            <path d="M17 8v8a2 2 0 0 1-2 2"/>
                            <path d="M21 12a4 4 0 0 0-4-4h-2"/>
                        </svg>
                    </button>
                    <button class="action-icon delete" onclick="deleteStudent(${student.id})" title="Delete">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                        </svg>
                    </button>
                </div>
            </td>
         </tr>
    `).join('');
}

// Reset password prompt
window.resetStudentPasswordPrompt = function(id) {
    const student = students.find(s => s.id === id);
    if (!student) return;
    
    const customPassword = prompt(`Enter new password for ${student.name} (leave empty for auto-generated):`);
    const newPassword = resetStudentPassword(id, customPassword || null);
    
    if (confirm(`Send login credentials to ${student.email}?`)) {
        sendStudentCredentials(student);
    }
};

function getInitials(name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
}

function getYearSuffix(year) {
    const suffixes = {1: 'st', 2: 'nd', 3: 'rd', 4: 'th'};
    return suffixes[year] || 'th';
}

// Modal functions
const modal = document.getElementById('studentModal');
const addBtn = document.getElementById('addStudentBtn');
const closeModalBtn = document.getElementById('closeModalBtn');

function openModal(editId = null) {
    const modalTitle = document.getElementById('modalTitle');
    const form = document.getElementById('studentForm');
    
    if (editId) {
        currentEditId = editId;
        const student = students.find(s => s.id === editId);
        if (student) {
            modalTitle.textContent = 'Edit Student';
            const studentIdField = document.getElementById('studentId');
            const studentNameField = document.getElementById('studentName');
            const studentIdNumberField = document.getElementById('studentIdNumber');
            const studentEmailField = document.getElementById('studentEmail');
            const studentCourseField = document.getElementById('studentCourse');
            const studentYearField = document.getElementById('studentYear');
            const studentStatusField = document.getElementById('studentStatus');
            
            if (studentIdField) studentIdField.value = student.id;
            if (studentNameField) studentNameField.value = student.name;
            if (studentIdNumberField) studentIdNumberField.value = student.idNumber;
            if (studentEmailField) studentEmailField.value = student.email;
            if (studentCourseField) studentCourseField.value = student.course || '';
            if (studentYearField) studentYearField.value = student.year;
            if (studentStatusField) studentStatusField.value = student.status;
        }
    } else {
        currentEditId = null;
        if (modalTitle) modalTitle.textContent = 'Add New Student';
        if (form) form.reset();
        const studentIdField = document.getElementById('studentId');
        if (studentIdField) studentIdField.value = '';
        
        // Pre-generate student ID
        const idNumberField = document.getElementById('studentIdNumber');
        if (idNumberField && students.length > 0) {
            const year = new Date().getFullYear();
            const nextNumber = students.length + 1;
            idNumberField.value = `${year}-${String(nextNumber).padStart(5, '0')}`;
        }
    }
    if (modal) modal.classList.add('open');
}

function closeModal() {
    if (modal) modal.classList.remove('open');
    currentEditId = null;
}

if (addBtn) addBtn.addEventListener('click', () => openModal());
if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
if (modal) modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
});

// Save student
const studentForm = document.getElementById('studentForm');
if (studentForm) {
    studentForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const emailInput = document.getElementById('studentEmail');
        const email = emailInput ? emailInput.value.trim() : '';
        
        if (!validateEmail(email)) {
            alert(`Invalid email domain. Only ${ALLOWED_DOMAIN} emails are allowed.`);
            return;
        }
        
        const nameInput = document.getElementById('studentName');
        const idNumberInput = document.getElementById('studentIdNumber');
        const courseInput = document.getElementById('studentCourse');
        const yearInput = document.getElementById('studentYear');
        const statusInput = document.getElementById('studentStatus');
        
        const studentData = {
            name: nameInput ? nameInput.value.trim() : '',
            idNumber: idNumberInput ? idNumberInput.value.trim() : '',
            email: email,
            course: courseInput ? courseInput.value : '',
            year: yearInput ? parseInt(yearInput.value) : 1,
            status: statusInput ? statusInput.value : 'active'
        };
        
        if (!currentEditId) {
            const existingId = students.find(s => s.idNumber === studentData.idNumber);
            if (existingId) {
                alert('A student with this ID number already exists.');
                return;
            }
            
            const existingEmail = students.find(s => s.email === studentData.email);
            if (existingEmail) {
                alert('A student with this email already exists.');
                return;
            }
        }
        
        if (currentEditId) {
            const index = students.findIndex(s => s.id === currentEditId);
            if (index !== -1) {
                students[index] = { ...students[index], ...studentData };
                showNotification('Student updated successfully!');
            }
        } else {
            const newPassword = generateRandomPassword();
            const newStudent = {
                id: Date.now(),
                ...studentData,
                password: newPassword,
                dateAdded: new Date().toISOString()
            };
            students.push(newStudent);
            showNotification(`Student enrolled successfully! Password: ${newPassword}`, 'info');
            
            if (confirm(`Send login credentials to ${email}?`)) {
                sendStudentCredentials(newStudent);
            }
        }
        
        saveStudents();
        loadStudents();
        closeModal();
    });
}

window.editStudent = function(id) {
    openModal(id);
};

window.deleteStudent = function(id) {
    const student = students.find(s => s.id === id);
    if (!student) return;
    
    if (confirm(`Are you sure you want to delete ${student.name} from the records?`)) {
        students = students.filter(s => s.id !== id);
        saveStudents();
        loadStudents();
        showNotification('Student removed successfully!');
    }
};

// Search functionality
const searchInput = document.getElementById('searchInput');
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        searchTerm = e.target.value;
        renderStudentsTable();
    });
}

// Logout
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to logout?')) {
            localStorage.removeItem('currentAdmin');
            window.location.href = '/LANDING PAGE/land.html';
        }
    });
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.textContent = message;
    const bgColor = type === 'success' ? '#1D4ED8' : (type === 'warning' ? '#D97706' : '#10B981');
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
        animation: slideIn 0.3s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize
loadStudents();

// Export for student login page
window.DOCSTAuth = {
    verifyLogin: window.verifyStudentLogin,
    getCurrentStudent: window.getCurrentStudent,
    logout: window.studentLogout
};