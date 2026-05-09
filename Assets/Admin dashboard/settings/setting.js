import { initAdminDrawer } from '/Assets/drawer-admin.js';
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// ============ INITIALIZE DRAWER ============
initAdminDrawer();

// ============ MODAL FUNCTIONS ============
window.openModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

window.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// Close modal when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal-overlay')) {
        event.target.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// ============ PROFILE MODAL ============
window.openProfileModal = function() {
    const nameInput = document.getElementById('adminName');
    const emailInput = document.getElementById('adminEmail');
    const usernameInput = document.getElementById('adminUsername');
    const twoFactorInput = document.getElementById('twoFactorAuth');
    
    const modalName = document.getElementById('modalAdminName');
    const modalEmail = document.getElementById('modalAdminEmail');
    const modalUsername = document.getElementById('modalAdminUsername');
    const modalTwoFactor = document.getElementById('modalTwoFactorAuth');
    
    if (modalName) modalName.value = nameInput?.value || '';
    if (modalEmail) modalEmail.value = emailInput?.value || '';
    if (modalUsername) modalUsername.value = usernameInput?.value || '';
    if (modalTwoFactor) modalTwoFactor.checked = twoFactorInput?.checked || false;
    
    window.openModal('profileModal');
}

window.saveProfileFromModal = async function() {
    const adminName = document.getElementById('modalAdminName')?.value.trim();
    const adminEmail = document.getElementById('modalAdminEmail')?.value.trim();
    const adminUsername = document.getElementById('modalAdminUsername')?.value.trim();
    const twoFactorAuth = document.getElementById('modalTwoFactorAuth')?.checked || false;

    if (!adminName) {
        showAlert('Please enter admin name', 'error');
        return;
    }

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await supabase
                .from('admins')
                .update({
                    full_name: adminName,
                    email: adminEmail,
                    username: adminUsername,
                    two_factor_auth: twoFactorAuth,
                    updated_at: new Date().toISOString()
                })
                .eq('email', user.email);
        }

        const currentAdmin = JSON.parse(localStorage.getItem('currentAdmin') || '{}');
        localStorage.setItem('currentAdmin', JSON.stringify({
            ...currentAdmin,
            full_name: adminName,
            email: adminEmail,
            username: adminUsername
        }));

        const nameInput = document.getElementById('adminName');
        const emailInput = document.getElementById('adminEmail');
        const usernameInput = document.getElementById('adminUsername');
        const twoFactorInput = document.getElementById('twoFactorAuth');
        const userEmailDisplay = document.getElementById('userEmailDisplay');
        
        if (nameInput) nameInput.value = adminName;
        if (emailInput) emailInput.value = adminEmail;
        if (usernameInput) usernameInput.value = adminUsername;
        if (twoFactorInput) twoFactorInput.checked = twoFactorAuth;
        if (userEmailDisplay) userEmailDisplay.textContent = adminName;

        window.closeModal('profileModal');
        showAlert('Profile updated successfully!', 'success');

    } catch (error) {
        console.error('Error updating:', error);
        showAlert('Failed to update profile', 'error');
    }
}

// ============ PASSWORD MODAL ============
window.openPasswordModal = function() {
    const modalCurrent = document.getElementById('modalCurrentPassword');
    const modalNew = document.getElementById('modalNewPassword');
    const modalConfirm = document.getElementById('modalConfirmPassword');
    
    if (modalCurrent) modalCurrent.value = '';
    if (modalNew) modalNew.value = '';
    if (modalConfirm) modalConfirm.value = '';
    
    window.openModal('passwordModal');
}

window.savePasswordFromModal = async function() {
    const currentPassword = document.getElementById('modalCurrentPassword')?.value;
    const newPassword = document.getElementById('modalNewPassword')?.value;
    const confirmPassword = document.getElementById('modalConfirmPassword')?.value;

    if (!currentPassword || !newPassword || !confirmPassword) {
        showAlert('Fill all password fields', 'error');
        return;
    }

    if (newPassword.length < 6) {
        showAlert('Password must be at least 6 characters', 'error');
        return;
    }

    if (newPassword !== confirmPassword) {
        showAlert('Passwords do not match', 'error');
        return;
    }

    try {
        const { data: { user } } = await supabase.auth.getUser();

        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: user.email,
            password: currentPassword
        });

        if (signInError) {
            showAlert('Current password is incorrect', 'error');
            return;
        }

        await supabase.auth.updateUser({ password: newPassword });

        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmPassword').value = '';

        window.closeModal('passwordModal');
        showAlert('Password changed successfully!', 'success');

    } catch (error) {
        console.error('Error changing password:', error);
        showAlert('Failed to change password', 'error');
    }
}

// ============ NOTIFICATIONS MODAL ============
window.openNotificationsModal = function() {
    const emailSwitch = document.getElementById('emailNotificationsSwitch');
    const smsSwitch = document.getElementById('smsNotificationsSwitch');
    const firstReminder = document.getElementById('firstReminder');
    const secondReminder = document.getElementById('secondReminder');
    const finalReminder = document.getElementById('finalReminder');
    
    const modalEmail = document.getElementById('modalEmailNotifications');
    const modalSms = document.getElementById('modalSmsNotifications');
    const modalFirst = document.getElementById('modalFirstReminder');
    const modalSecond = document.getElementById('modalSecondReminder');
    const modalFinal = document.getElementById('modalFinalReminder');
    
    if (modalEmail) modalEmail.checked = emailSwitch?.checked || false;
    if (modalSms) modalSms.checked = smsSwitch?.checked || false;
    if (modalFirst) modalFirst.value = firstReminder?.value || 7;
    if (modalSecond) modalSecond.value = secondReminder?.value || 3;
    if (modalFinal) modalFinal.value = finalReminder?.value || 1;
    
    window.openModal('notificationsModal');
}

window.saveNotificationsFromModal = function() {
    const emailNotifications = document.getElementById('modalEmailNotifications')?.checked || false;
    const smsNotifications = document.getElementById('modalSmsNotifications')?.checked || false;
    const firstReminder = parseInt(document.getElementById('modalFirstReminder')?.value) || 7;
    const secondReminder = parseInt(document.getElementById('modalSecondReminder')?.value) || 3;
    const finalReminder = parseInt(document.getElementById('modalFinalReminder')?.value) || 1;
    
    const emailSwitch = document.getElementById('emailNotificationsSwitch');
    const smsSwitch = document.getElementById('smsNotificationsSwitch');
    const firstInput = document.getElementById('firstReminder');
    const secondInput = document.getElementById('secondReminder');
    const finalInput = document.getElementById('finalReminder');
    const desktopEmail = document.getElementById('emailNotifications');
    const desktopSms = document.getElementById('smsNotifications');
    
    if (emailSwitch) emailSwitch.checked = emailNotifications;
    if (smsSwitch) smsSwitch.checked = smsNotifications;
    if (firstInput) firstInput.value = firstReminder;
    if (secondInput) secondInput.value = secondReminder;
    if (finalInput) finalInput.value = finalReminder;
    if (desktopEmail) desktopEmail.checked = emailNotifications;
    if (desktopSms) desktopSms.checked = smsNotifications;
    
    const settings = JSON.parse(localStorage.getItem('docst_settings') || '{}');
    if (!settings.notifications) settings.notifications = {};
    settings.notifications.emailNotifications = emailNotifications;
    settings.notifications.smsNotifications = smsNotifications;
    settings.notifications.firstReminder = firstReminder;
    settings.notifications.secondReminder = secondReminder;
    settings.notifications.finalReminder = finalReminder;
    localStorage.setItem('docst_settings', JSON.stringify(settings));
    
    window.closeModal('notificationsModal');
    showAlert('Notification settings saved!', 'success');
}

// ============ RATE US MODAL ============
window.openRateUsModal = function() {
    document.getElementById('selectedRating').value = '0';
    document.getElementById('reviewText').value = '';
    const stars = document.querySelectorAll('.rating-stars i');
    stars.forEach(star => {
        star.className = 'far fa-star';
    });
    window.openModal('rateUsModal');
}

window.setRating = function(rating) {
    document.getElementById('selectedRating').value = rating;
    const stars = document.querySelectorAll('.rating-stars i');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.className = 'fas fa-star';
        } else {
            star.className = 'far fa-star';
        }
    });
}

window.submitRating = function() {
    const rating = document.getElementById('selectedRating')?.value;
    const review = document.getElementById('reviewText')?.value;
    
    if (!rating || rating === '0') {
        showAlert('Please select a rating', 'error');
        return;
    }
    
    const ratings = JSON.parse(localStorage.getItem('app_ratings') || '[]');
    ratings.push({
        rating: parseInt(rating),
        review: review || '',
        date: new Date().toISOString()
    });
    localStorage.setItem('app_ratings', JSON.stringify(ratings));
    
    window.closeModal('rateUsModal');
    showAlert('Thank you for your rating!', 'success');
}

// ============ FEEDBACK MODAL ============
window.openFeedbackModal = function() {
    document.getElementById('feedbackText').value = '';
    window.openModal('feedbackModal');
}

window.submitFeedback = function() {
    const feedback = document.getElementById('feedbackText')?.value;
    
    if (!feedback || feedback.trim() === '') {
        showAlert('Please enter your feedback', 'error');
        return;
    }
    
    const feedbacks = JSON.parse(localStorage.getItem('user_feedback') || '[]');
    feedbacks.push({
        feedback: feedback,
        date: new Date().toISOString()
    });
    localStorage.setItem('user_feedback', JSON.stringify(feedbacks));
    
    window.closeModal('feedbackModal');
    showAlert('Thank you for your feedback!', 'success');
}

// ============ LOAD ADMIN PROFILE ============
async function loadAdminProfile() {
    try {
        const stored = localStorage.getItem('currentAdmin');
        if (stored) {
            const admin = JSON.parse(stored);
            const nameInput = document.getElementById('adminName');
            const emailInput = document.getElementById('adminEmail');
            const usernameInput = document.getElementById('adminUsername');
            const userEmailDisplay = document.getElementById('userEmailDisplay');
            
            if (nameInput) nameInput.value = admin.full_name || admin.name || '';
            if (emailInput) emailInput.value = admin.email || '';
            if (usernameInput) usernameInput.value = admin.username || '';
            if (userEmailDisplay) userEmailDisplay.textContent = admin.full_name || admin.name || 'Administrator';
            return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: adminData } = await supabase
            .from('admins')
            .select('full_name, email, username, admin_id')
            .eq('email', user.email)
            .single();

        if (adminData) {
            document.getElementById('adminName').value = adminData.full_name || '';
            document.getElementById('adminEmail').value = adminData.email || '';
            document.getElementById('adminUsername').value = adminData.username || '';
            const userEmailDisplay = document.getElementById('userEmailDisplay');
            if (userEmailDisplay) userEmailDisplay.textContent = adminData.full_name || 'Administrator';

            localStorage.setItem('currentAdmin', JSON.stringify({
                full_name: adminData.full_name,
                email: adminData.email,
                username: adminData.username,
                admin_id: adminData.admin_id
            }));
        }
    } catch (error) {
        console.error('Error loading admin:', error);
    }
}

// ============ UPDATE PROFILE (Desktop) ============
async function updateAdminProfile() {
    const adminName = document.getElementById('adminName').value.trim();
    const adminEmail = document.getElementById('adminEmail').value.trim();
    const adminUsername = document.getElementById('adminUsername').value.trim();
    const twoFactorAuth = document.getElementById('twoFactorAuth').checked;

    if (!adminName) {
        showAlert('Please enter admin name', 'error');
        return false;
    }

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await supabase
                .from('admins')
                .update({
                    full_name: adminName,
                    email: adminEmail,
                    username: adminUsername,
                    two_factor_auth: twoFactorAuth,
                    updated_at: new Date().toISOString()
                })
                .eq('email', user.email);
        }

        const currentAdmin = JSON.parse(localStorage.getItem('currentAdmin') || '{}');
        localStorage.setItem('currentAdmin', JSON.stringify({
            ...currentAdmin,
            full_name: adminName,
            email: adminEmail,
            username: adminUsername
        }));

        const userEmailDisplay = document.getElementById('userEmailDisplay');
        if (userEmailDisplay) userEmailDisplay.textContent = adminName;

        return true;

    } catch (error) {
        console.error('Error updating:', error);
        showAlert('Failed to update profile', 'error');
        return false;
    }
}

// ============ CHANGE PASSWORD (Desktop) ============
async function changePassword() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (!currentPassword && !newPassword && !confirmPassword) return true;

    if (!currentPassword || !newPassword || !confirmPassword) {
        showAlert('Fill all password fields', 'error');
        return false;
    }

    if (newPassword.length < 6) {
        showAlert('Password must be at least 6 characters', 'error');
        return false;
    }

    if (newPassword !== confirmPassword) {
        showAlert('Passwords do not match', 'error');
        return false;
    }

    try {
        const { data: { user } } = await supabase.auth.getUser();

        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: user.email,
            password: currentPassword
        });

        if (signInError) {
            showAlert('Current password is incorrect', 'error');
            return false;
        }

        await supabase.auth.updateUser({ password: newPassword });

        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmPassword').value = '';

        return true;

    } catch (error) {
        console.error('Error changing password:', error);
        showAlert('Failed to change password', 'error');
        return false;
    }
}

// ============ SAVE ALL SETTINGS (Desktop) ============
window.saveAllSettings = async function() {
    showAlert('Saving settings...', 'info');

    const settings = {
        general: {
            systemName: document.getElementById('systemName')?.value || '',
            timezone: document.getElementById('timezone')?.value || '',
            dateFormat: document.getElementById('dateFormat')?.value || ''
        },
        notifications: {
            emailNotifications: document.getElementById('emailNotifications')?.checked || false,
            smsNotifications: document.getElementById('smsNotifications')?.checked || false,
            firstReminder: parseInt(document.getElementById('firstReminder')?.value) || 7,
            secondReminder: parseInt(document.getElementById('secondReminder')?.value) || 3,
            finalReminder: parseInt(document.getElementById('finalReminder')?.value) || 1
        },
        security: {
            sessionTimeout: parseInt(document.getElementById('sessionTimeout')?.value) || 30,
            maxAttempts: parseInt(document.getElementById('maxAttempts')?.value) || 5,
            strongPassword: document.getElementById('strongPassword')?.checked || false
        },
        backup: {
            backupSchedule: document.getElementById('backupSchedule')?.value || 'weekly'
        },
        savedAt: new Date().toISOString()
    };

    localStorage.setItem('docst_settings', JSON.stringify(settings));

    const profileUpdated = await updateAdminProfile();
    if (!profileUpdated) return;

    const passwordUpdated = await changePassword();
    if (passwordUpdated === false) return;

    showAlert('All settings saved successfully!', 'success');
}

// ============ RESET SETTINGS ============
window.resetSettings = function() {
    if (!confirm('Reset all settings to default?')) return;

    const defaults = {
        systemName: 'DOCST - Disciplinary Office Service Tracker',
        timezone: 'Asia/Manila',
        dateFormat: 'MM/DD/YYYY',
        emailNotifications: true,
        smsNotifications: false,
        firstReminder: 7,
        secondReminder: 3,
        finalReminder: 1,
        sessionTimeout: 30,
        maxAttempts: 5,
        strongPassword: true,
        backupSchedule: 'weekly'
    };

    document.getElementById('systemName').value = defaults.systemName;
    document.getElementById('timezone').value = defaults.timezone;
    document.getElementById('dateFormat').value = defaults.dateFormat;
    document.getElementById('emailNotifications').checked = defaults.emailNotifications;
    document.getElementById('smsNotifications').checked = defaults.smsNotifications;
    document.getElementById('firstReminder').value = defaults.firstReminder;
    document.getElementById('secondReminder').value = defaults.secondReminder;
    document.getElementById('finalReminder').value = defaults.finalReminder;
    document.getElementById('sessionTimeout').value = defaults.sessionTimeout;
    document.getElementById('maxAttempts').value = defaults.maxAttempts;
    document.getElementById('strongPassword').checked = defaults.strongPassword;
    document.getElementById('backupSchedule').value = defaults.backupSchedule;

    const emailSwitch = document.getElementById('emailNotificationsSwitch');
    const smsSwitch = document.getElementById('smsNotificationsSwitch');
    if (emailSwitch) emailSwitch.checked = defaults.emailNotifications;
    if (smsSwitch) smsSwitch.checked = defaults.smsNotifications;

    showAlert('Settings reset to default! Click Save to apply.', 'success');
}

// ============ BACKUP ============
window.backupNow = function() {
    const admin = JSON.parse(localStorage.getItem('currentAdmin') || '{}');
    const settings = localStorage.getItem('docst_settings');

    const backup = {
        settings: settings ? JSON.parse(settings) : null,
        admin: admin ? { name: admin.full_name, email: admin.email } : null,
        timestamp: new Date().toISOString(),
        version: '1.0'
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `docst_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showAlert('Backup created!', 'success');
}

window.restoreBackup = function() {
    const file = document.getElementById('restoreFile').files[0];
    if (!file) {
        showAlert('Select a backup file first', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const backup = JSON.parse(e.target.result);
            if (backup.settings) {
                localStorage.setItem('docst_settings', JSON.stringify(backup.settings));
                location.reload();
            } else {
                showAlert('Invalid backup file', 'error');
            }
        } catch {
            showAlert('Error reading backup', 'error');
        }
    };
    reader.readAsText(file);
}

// ============ LOAD SAVED SETTINGS ============
function loadSettings() {
    const saved = localStorage.getItem('docst_settings');
    if (!saved) return;

    try {
        const s = JSON.parse(saved);
        if (s.general) {
            if (document.getElementById('systemName')) document.getElementById('systemName').value = s.general.systemName || '';
            if (document.getElementById('timezone')) document.getElementById('timezone').value = s.general.timezone || 'Asia/Manila';
            if (document.getElementById('dateFormat')) document.getElementById('dateFormat').value = s.general.dateFormat || 'MM/DD/YYYY';
        }
        if (s.notifications) {
            if (document.getElementById('emailNotifications')) document.getElementById('emailNotifications').checked = s.notifications.emailNotifications ?? true;
            if (document.getElementById('smsNotifications')) document.getElementById('smsNotifications').checked = s.notifications.smsNotifications ?? false;
            if (document.getElementById('firstReminder')) document.getElementById('firstReminder').value = s.notifications.firstReminder || 7;
            if (document.getElementById('secondReminder')) document.getElementById('secondReminder').value = s.notifications.secondReminder || 3;
            if (document.getElementById('finalReminder')) document.getElementById('finalReminder').value = s.notifications.finalReminder || 1;
            
            const emailSwitch = document.getElementById('emailNotificationsSwitch');
            const smsSwitch = document.getElementById('smsNotificationsSwitch');
            if (emailSwitch) emailSwitch.checked = s.notifications.emailNotifications ?? true;
            if (smsSwitch) smsSwitch.checked = s.notifications.smsNotifications ?? false;
        }
        if (s.security) {
            if (document.getElementById('sessionTimeout')) document.getElementById('sessionTimeout').value = s.security.sessionTimeout || 30;
            if (document.getElementById('maxAttempts')) document.getElementById('maxAttempts').value = s.security.maxAttempts || 5;
            if (document.getElementById('strongPassword')) document.getElementById('strongPassword').checked = s.security.strongPassword ?? true;
        }
        if (s.backup) {
            if (document.getElementById('backupSchedule')) document.getElementById('backupSchedule').value = s.backup.backupSchedule || 'weekly';
        }
    } catch (e) {
        console.error('Error loading settings:', e);
    }
}

// ============ DARK MODE ============
function initDarkMode() {
    const toggle = document.getElementById('darkModeToggle');
    const saved = localStorage.getItem('docst_dark_mode');

    if (saved === 'enabled') {
        document.body.classList.add('dark-mode');
        if (toggle) toggle.innerHTML = '<i class="fas fa-sun"></i>';
    }

    toggle?.addEventListener('click', () => {
        const isDark = document.body.classList.toggle('dark-mode');
        localStorage.setItem('docst_dark_mode', isDark ? 'enabled' : 'disabled');
        toggle.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        showAlert(isDark ? 'Dark mode enabled' : 'Light mode enabled', 'success');
    });
}

// ============ ALERT ============
function showAlert(message, type) {
    const alertDiv = document.getElementById('alertMessage');
    if (!alertDiv) return;

    alertDiv.textContent = message;
    alertDiv.className = `alert ${type}`;
    alertDiv.style.display = 'block';

    setTimeout(() => {
        alertDiv.style.display = 'none';
    }, 3000);
}

// ============ MOBILE LOGOUT ============
const mobileLogoutBtn = document.getElementById('mobileLogoutBtn');
if (mobileLogoutBtn) {
    mobileLogoutBtn.addEventListener('click', function(e) {
        e.preventDefault();
        if (confirm('Are you sure you want to logout?')) {
            localStorage.clear();
            window.location.href = '/';
        }
    });
}

// ============ DESKTOP LOGOUT ============
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', function(e) {
        e.preventDefault();
        if (confirm('Are you sure you want to logout?')) {
            localStorage.clear();
            window.location.href = '/';
        }
    });
}

// ============ MOBILE ROW CLICK HANDLERS ============
document.addEventListener('DOMContentLoaded', function() {
    const profileRow = document.getElementById('profileSettingsBtn');
    if (profileRow) {
        profileRow.addEventListener('click', () => window.openProfileModal());
    }
    
    const passwordRow = document.getElementById('changePasswordBtn');
    if (passwordRow) {
        passwordRow.addEventListener('click', () => window.openPasswordModal());
    }
    
    const notificationsRow = document.getElementById('emailNotificationsRow');
    if (notificationsRow) {
        notificationsRow.addEventListener('click', () => window.openNotificationsModal());
    }
    
    const rateUsRow = document.getElementById('rateUsBtn');
    if (rateUsRow) {
        rateUsRow.addEventListener('click', () => window.openRateUsModal());
    }
    
    const feedbackRow = document.getElementById('feedbackBtn');
    if (feedbackRow) {
        feedbackRow.addEventListener('click', () => window.openFeedbackModal());
    }
    
    const logoutSettingsBtn = document.getElementById('logoutSettingsBtn');
    if (logoutSettingsBtn) {
        logoutSettingsBtn.addEventListener('click', function() {
            if (confirm('Are you sure you want to logout?')) {
                localStorage.clear();
                window.location.href = '/';
            }
        });
    }
    
    const darkModeSwitch = document.getElementById('darkModeSwitch');
    if (darkModeSwitch) {
        const isDark = localStorage.getItem('docst_dark_mode') === 'enabled';
        darkModeSwitch.checked = isDark;
        darkModeSwitch.addEventListener('change', function() {
            const isDark = this.checked;
            document.body.classList.toggle('dark-mode', isDark);
            localStorage.setItem('docst_dark_mode', isDark ? 'enabled' : 'disabled');
            const darkModeToggle = document.getElementById('darkModeToggle');
            if (darkModeToggle) {
                darkModeToggle.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
            }
        });
    }
});

// ============ INIT ============
function init() {
    console.log('Initializing Settings Page...');
    loadAdminProfile();
    loadSettings();
    initDarkMode();
    console.log('Settings Page Ready');
}

init();