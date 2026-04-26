//  DRAWER & MOBILE 
const overlay = document.getElementById('overlay');
const drawer = document.getElementById('drawer');
const hamburger = document.getElementById('hamburger');
const drawerClose = document.getElementById('drawerClose');
const studentPill = document.getElementById('studentPill');

function openDrawer() { if (window.innerWidth <= 768) { overlay.classList.add('open'); drawer.classList.add('open'); document.body.style.overflow = 'hidden'; } }
function closeDrawer() { if (window.innerWidth <= 768) { overlay.classList.remove('open'); drawer.classList.remove('open'); document.body.style.overflow = ''; } }
function checkScreenSize() { if (window.innerWidth > 768) { drawer.classList.remove('open'); overlay.classList.remove('open'); document.body.style.overflow = ''; } }
if (window.innerWidth <= 768) { hamburger?.addEventListener('click', openDrawer); drawerClose?.addEventListener('click', closeDrawer); overlay?.addEventListener('click', closeDrawer); studentPill?.addEventListener('click', openDrawer); }
window.addEventListener('resize', checkScreenSize);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });
checkScreenSize();


// STUDENT SESSION 
let currentStudent = null;

function initStudentSession() {
    let stored = localStorage.getItem('currentStudent');
    if (stored) {
        currentStudent = JSON.parse(stored);
        document.getElementById('drawerStudentName').innerText = currentStudent.name || 'Student';
        return true;
    } else {
        window.location.href = '/Assets/Student Authentication/Student.html';
        return false;
    }
}

if (!initStudentSession()) {
    throw new Error('No student logged in');
}

// Profile data management
let studentProfile = {};
function getStorageKey() { return `student_profile_${currentStudent.studentId}`; }
function loadProfile() {
    const key = getStorageKey();
    const stored = localStorage.getItem(key);
    if (stored) { studentProfile = JSON.parse(stored); } 
    else {
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
    document.getElementById('email').value = studentProfile.email || '';
    document.getElementById('contactNumber').value = studentProfile.contact_number || '';
    document.getElementById('course').value = studentProfile.course || '';
    document.getElementById('yearLevel').value = studentProfile.year_level || '1';
}
function saveProfile() { localStorage.setItem(getStorageKey(), JSON.stringify(studentProfile)); }

// Notifications prefs
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

// 2FA preference
function loadTwoFactor() {
    const val = localStorage.getItem(`twofactor_${currentStudent.studentId}`);
    document.getElementById('twoFactorAuth').checked = val === 'true';
}
function saveTwoFactor() {
    localStorage.setItem(`twofactor_${currentStudent.studentId}`, document.getElementById('twoFactorAuth').checked);
}

// Avatar
function loadAvatar() {
    const avatarData = localStorage.getItem(`avatar_${currentStudent.studentId}`);
    const preview = document.getElementById('avatarPreview');
    if (avatarData && preview) {
        preview.innerHTML = `<img src="${avatarData}" alt="Avatar">`;
    } else {
        preview.innerHTML = `<i class="fas fa-user"></i>`;
    }
}

// Alert helper
function showAlert(message, type) {
    const alertDiv = document.getElementById('alertMessage');
    alertDiv.className = `alert ${type}`;
    alertDiv.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> ${message}`;
    alertDiv.style.display = 'flex';
    setTimeout(() => { alertDiv.style.display = 'none'; }, 3000);
}

function animateButton(btn) { if(btn) { btn.style.transform = 'scale(0.97)'; setTimeout(() => { if(btn) btn.style.transform = ''; }, 120); } }
function errorShake(btn) { if(btn) { btn.classList.add('error-shake'); setTimeout(() => btn.classList.remove('error-shake'), 400); } }

// PROFILE SAVE
document.getElementById('saveProfileBtn')?.addEventListener('click', () => {
    studentProfile.name = document.getElementById('fullName').value;
    studentProfile.contact_number = document.getElementById('contactNumber').value;
    studentProfile.course = document.getElementById('course').value;
    studentProfile.year_level = document.getElementById('yearLevel').value;
    studentProfile.email = document.getElementById('email').value;
    studentProfile.studentId = document.getElementById('studentId').value;
    saveProfile();
    // update current session name
    currentStudent.name = studentProfile.name;
    localStorage.setItem('currentStudent', JSON.stringify(currentStudent));
    document.getElementById('drawerStudentName').innerText = studentProfile.name;
    showAlert('Profile updated successfully!', 'success');
    animateButton(document.getElementById('saveProfileBtn'));
});

// PASSWORD CHANGE (secure mock)
document.getElementById('changePasswordBtn')?.addEventListener('click', () => {
    const current = document.getElementById('currentPassword').value;
    const newPw = document.getElementById('newPassword').value;
    const confirm = document.getElementById('confirmPassword').value;
    if (!current || !newPw || !confirm) { showAlert('Please fill all password fields', 'error'); errorShake(document.getElementById('changePasswordBtn')); return; }
    if (newPw.length < 6) { showAlert('New password must be at least 6 characters', 'error'); errorShake(document.getElementById('changePasswordBtn')); return; }
    if (newPw !== confirm) { showAlert('Passwords do not match', 'error'); errorShake(document.getElementById('changePasswordBtn')); return; }
    // simulate stored password (mock)
    localStorage.setItem(`student_pass_${currentStudent.studentId}`, newPw);
    showAlert('Password changed successfully!', 'success');
    document.getElementById('currentPassword').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';
    animateButton(document.getElementById('changePasswordBtn'));
});

// NOTIFICATION SAVE
document.getElementById('saveNotificationBtn')?.addEventListener('click', () => {
    saveNotifPrefs();
    showAlert('Notification preferences saved!', 'success');
    animateButton(document.getElementById('saveNotificationBtn'));
});

// TWO FACTOR SAVE on change
document.getElementById('twoFactorAuth')?.addEventListener('change', () => {
    saveTwoFactor();
    showAlert('Two-Factor Authentication preference saved', 'success');
});

// AVATAR UPLOAD
document.getElementById('uploadAvatarBtn')?.addEventListener('click', () => { document.getElementById('avatarInput').click(); animateButton(document.getElementById('uploadAvatarBtn')); });
document.getElementById('avatarInput')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            const imgData = ev.target.result;
            localStorage.setItem(`avatar_${currentStudent.studentId}`, imgData);
            const preview = document.getElementById('avatarPreview');
            preview.innerHTML = `<img src="${imgData}" alt="Avatar">`;
            showAlert('Profile picture updated!', 'success');
        };
        reader.readAsDataURL(file);
    }
});

// LOGOUT
document.getElementById('logoutBtn')?.addEventListener('click', () => {
    animateButton(document.getElementById('logoutBtn'));
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('currentStudent');
        window.location.href = '#';
        setTimeout(() => { alert('Logged out (demo). Redirect to login page.'); location.reload(); }, 200);
    }
});

// load all data on start
loadProfile();
loadNotifPrefs();
loadTwoFactor();
loadAvatar();