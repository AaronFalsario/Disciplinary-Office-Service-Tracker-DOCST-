// ============ DRAWER & MOBILE ============
const overlay = document.getElementById('overlay');
const drawer = document.getElementById('drawer');
const hamburger = document.getElementById('hamburger');
const drawerClose = document.getElementById('drawerClose');
const studentPill = document.getElementById('studentPill');

function openDrawer() { 
    if (window.innerWidth <= 768) { 
        overlay.classList.add('open'); 
        drawer.classList.add('open'); 
        document.body.style.overflow = 'hidden'; 
    } 
}

function closeDrawer() { 
    if (window.innerWidth <= 768) { 
        overlay.classList.remove('open'); 
        drawer.classList.remove('open'); 
        document.body.style.overflow = ''; 
    } 
}

function checkScreenSize() { 
    if (window.innerWidth > 768) { 
        drawer.classList.remove('open'); 
        overlay.classList.remove('open'); 
        document.body.style.overflow = ''; 
    } 
}

if (window.innerWidth <= 768) { 
    hamburger?.addEventListener('click', openDrawer); 
    drawerClose?.addEventListener('click', closeDrawer); 
    overlay?.addEventListener('click', closeDrawer); 
    studentPill?.addEventListener('click', openDrawer); 
}

window.addEventListener('resize', checkScreenSize);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });
checkScreenSize();

// ============ GET STUDENT INITIALS ============
function getStudentInitials(fullName) {
    if (!fullName || fullName === 'Student') return 'ST';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) {
        return parts[0].substring(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function updateDrawerAvatar(studentName) {
    const drawerAvatar = document.querySelector('.drawer-avatar');
    if (drawerAvatar) {
        const initials = getStudentInitials(studentName);
        drawerAvatar.innerHTML = '';
        const span = document.createElement('span');
        span.textContent = initials;
        span.style.fontSize = '22px';
        span.style.fontWeight = '700';
        span.style.color = 'white';
        drawerAvatar.appendChild(span);
    }
}

// ============ STUDENT SESSION ============
let currentStudent = null;

function initStudentSession() {
    let stored = localStorage.getItem('currentStudent');
    if (stored) {
        currentStudent = JSON.parse(stored);
        document.getElementById('drawerStudentName').innerText = currentStudent.name || 'Student';
        updateDrawerAvatar(currentStudent.name || 'Student');
        return true;
    } else {
        window.location.href = '/Assets/Student Authentication/Student.html';
        return false;
    }
}

if (!initStudentSession()) {
    throw new Error('No student logged in');
}

// ============ DARK MODE FUNCTIONAL ============
function updateDarkModeIcon(btn, isDark) {
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
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
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

function initDarkMode() {
    const darkModeBtn = document.getElementById('darkModeToggle');
    if (!darkModeBtn) return;
    
    const savedMode = localStorage.getItem('docst_dark_mode');
    if (savedMode === 'enabled') {
        document.body.classList.add('dark-mode');
        updateDarkModeIcon(darkModeBtn, true);
    } else {
        document.body.classList.remove('dark-mode');
        updateDarkModeIcon(darkModeBtn, false);
    }
    
    darkModeBtn.onclick = () => {
        document.body.classList.toggle('dark-mode');
        const nowDark = document.body.classList.contains('dark-mode');
        localStorage.setItem('docst_dark_mode', nowDark ? 'enabled' : 'disabled');
        updateDarkModeIcon(darkModeBtn, nowDark);
        
        showNotification(nowDark ? '🌙 Dark mode enabled' : '☀️ Light mode enabled', 'info');
    };
}

// ============ NOTIFICATION FUNCTIONAL ============
function initNotification() {
    const notifyBtn = document.getElementById('notifyBtn');
    if (!notifyBtn) return;
    
    notifyBtn.onclick = () => {
        showNotification('🔔 No new notifications at this time.', 'info');
    };
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.textContent = message;
    const bgColor = type === 'success' ? '#10B981' : (type === 'error' ? '#EF4444' : '#3B82F6');
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
        animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

// Add animation keyframes if not exists
if (!document.querySelector('#notificationStyles')) {
    const style = document.createElement('style');
    style.id = 'notificationStyles';
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes fadeInOut {
            0% { opacity: 0; transform: translateX(20px); }
            15% { opacity: 1; transform: translateX(0); }
            85% { opacity: 1; transform: translateX(0); }
            100% { opacity: 0; transform: translateX(20px); }
        }
    `;
    document.head.appendChild(style);
}

// ============ PROFILE DATA MANAGEMENT ============
let studentProfile = {};
function getStorageKey() { return `student_profile_${currentStudent.studentId}`; }

function loadProfile() {
    const key = getStorageKey();
    const stored = localStorage.getItem(key);
    if (stored) { 
        studentProfile = JSON.parse(stored); 
    } else {
        studentProfile = {
            name: currentStudent.name || '',
            studentId: currentStudent.studentId || '',
            email: currentStudent.email || '',
            contact_number: '',
            course: '',
            year_level: '1'
        };
        saveProfile();
    }
    document.getElementById('fullName').value = studentProfile.name || '';
    document.getElementById('studentId').value = studentProfile.studentId || '';
    
    // Make email field readonly and set value
    const emailField = document.getElementById('email');
    if (emailField) {
        emailField.value = studentProfile.email || '';
        emailField.readOnly = true;
        emailField.style.backgroundColor = 'rgba(0, 0, 0, 0.03)';
        emailField.style.cursor = 'not-allowed';
        
        // Dark mode support for readonly field
        if (document.body.classList.contains('dark-mode')) {
            emailField.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
        }
    }
    
    document.getElementById('contactNumber').value = studentProfile.contact_number || '';
    document.getElementById('course').value = studentProfile.course || '';
    document.getElementById('yearLevel').value = studentProfile.year_level || '1';
}

function saveProfile() { 
    // Save everything EXCEPT email (email is permanent)
    const profileToSave = {
        name: studentProfile.name,
        studentId: studentProfile.studentId,
        email: studentProfile.email, // Keep existing email, don't change
        contact_number: studentProfile.contact_number,
        course: studentProfile.course,
        year_level: studentProfile.year_level
    };
    localStorage.setItem(getStorageKey(), JSON.stringify(profileToSave)); 
}

// ============ NOTIFICATIONS PREFS ============
function loadNotifPrefs() {
    const key = `notif_prefs_${currentStudent.studentId}`;
    const prefs = localStorage.getItem(key);
    if (prefs) {
        const data = JSON.parse(prefs);
        document.getElementById('emailNotifications').checked = data.emailNotifications !== undefined ? data.emailNotifications : true;
        document.getElementById('penaltyNotifications').checked = data.penaltyNotifications !== undefined ? data.penaltyNotifications : true;
        document.getElementById('appealNotifications').checked = data.appealNotifications !== undefined ? data.appealNotifications : true;
        document.getElementById('deadlineReminders').checked = data.deadlineReminders !== undefined ? data.deadlineReminders : true;
    } else {
        document.getElementById('emailNotifications').checked = true;
        document.getElementById('penaltyNotifications').checked = true;
        document.getElementById('appealNotifications').checked = true;
        document.getElementById('deadlineReminders').checked = true;
    }
}

function saveNotifPrefs() {
    const prefs = {
        emailNotifications: document.getElementById('emailNotifications').checked,
        penaltyNotifications: document.getElementById('penaltyNotifications').checked,
        appealNotifications: document.getElementById('appealNotifications').checked,
        deadlineReminders: document.getElementById('deadlineReminders').checked
    };
    localStorage.setItem(`notif_prefs_${currentStudent.studentId}`, JSON.stringify(prefs));
}

// ============ ALERT HELPER ============
function showAlert(message, type) {
    const alertDiv = document.getElementById('alertMessage');
    alertDiv.className = `alert ${type}`;
    alertDiv.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> ${message}`;
    alertDiv.style.display = 'flex';
    setTimeout(() => { alertDiv.style.display = 'none'; }, 3000);
}

function animateButton(btn) { 
    if(btn) { 
        btn.style.transform = 'scale(0.97)'; 
        setTimeout(() => { if(btn) btn.style.transform = ''; }, 120); 
    } 
}

// ============ PROFILE SAVE ============
document.getElementById('saveProfileBtn')?.addEventListener('click', () => {
    // Update profile fields (email is NOT updated - it's permanent)
    studentProfile.name = document.getElementById('fullName').value;
    studentProfile.contact_number = document.getElementById('contactNumber').value;
    studentProfile.course = document.getElementById('course').value;
    studentProfile.year_level = document.getElementById('yearLevel').value;
    // Email is NOT changed - it remains as is
    
    saveProfile();
    
    // Update current session name
    currentStudent.name = studentProfile.name;
    localStorage.setItem('currentStudent', JSON.stringify(currentStudent));
    document.getElementById('drawerStudentName').innerText = studentProfile.name;
    updateDrawerAvatar(studentProfile.name);
    
    showAlert('Profile updated successfully!', 'success');
    animateButton(document.getElementById('saveProfileBtn'));
});

// ============ NOTIFICATION SAVE ============
document.getElementById('saveNotificationBtn')?.addEventListener('click', () => {
    saveNotifPrefs();
    showAlert('Notification preferences saved!', 'success');
    animateButton(document.getElementById('saveNotificationBtn'));
});

// ============ LOGOUT ============
document.getElementById('logoutBtn')?.addEventListener('click', () => {
    animateButton(document.getElementById('logoutBtn'));
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('currentStudent');
        window.location.href = '/Assets/Landing/index.html';
    }
});

// Listen for dark mode changes to update readonly field style
const observer = new MutationObserver(() => {
    const emailField = document.getElementById('email');
    if (emailField) {
        if (document.body.classList.contains('dark-mode')) {
            emailField.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
        } else {
            emailField.style.backgroundColor = 'rgba(0, 0, 0, 0.03)';
        }
    }
});
observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

// ============ INITIALIZE EVERYTHING ============
function init() {
    loadProfile();
    loadNotifPrefs();
    initDarkMode();
    initNotification();
}

init();