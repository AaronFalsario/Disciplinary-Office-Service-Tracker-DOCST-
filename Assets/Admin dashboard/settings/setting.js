import { createClient } from '@supabase/supabase-js'
import { setupAdminDrawer, setupAdminLogout, setupAdminDrawerControls, getCurrentAdmin } from '/Assets/drawer-admin.js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

// ============ DRAWER SETUP ============
function initDrawer() {
    const admin = getCurrentAdmin();
    const adminName = admin?.full_name || admin?.name || 'Administrator';
    const adminId = admin?.admin_id || admin?.email || 'Admin';

    setupAdminDrawer(adminName, adminId);
    setupAdminLogout('logoutBtn');
    setupAdminDrawerControls();
}

// ============ DARK MODE ============
function initDarkMode() {
    const darkModeToggle = document.getElementById('darkModeToggle');
    const savedMode = localStorage.getItem('docst_dark_mode');

    if (savedMode === 'enabled') {
        document.body.classList.add('dark-mode');
        updateDarkModeButton(true);
    } else {
        updateDarkModeButton(false);
    }

    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', () => {
            const isDark = document.body.classList.toggle('dark-mode');
            localStorage.setItem('docst_dark_mode', isDark ? 'enabled' : 'disabled');
            updateDarkModeButton(isDark);
            showAlert(isDark ? 'Dark mode enabled' : 'Light mode enabled', 'success');
        });
    }
}

function updateDarkModeButton(isDark) {
    const darkModeToggle = document.getElementById('darkModeToggle');
    if (darkModeToggle) {
        darkModeToggle.innerHTML = isDark
            ? '<i class="fas fa-sun"></i>'
            : '<i class="fas fa-moon"></i>';
    }
}

// ============ LOAD ADMIN PROFILE ============
async function loadAdminProfile() {
    try {
        const admin = getCurrentAdmin();
        if (admin && (admin.full_name || admin.name)) {
            document.getElementById('adminName').value = admin.full_name || admin.name || 'Administrator';
            document.getElementById('adminEmail').value = admin.email || '';
            document.getElementById('adminUsername').value = admin.username || admin.full_name?.split(' ')[0]?.toLowerCase() || 'admin';
            console.log('Admin profile loaded from localStorage:', admin.full_name || admin.name);
            return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (user && user.email) {
            let adminData = null;

            const { data: data1 } = await supabase
                .from('admins')
                .select('full_name, email, username, admin_id')
                .eq('email', user.email)
                .maybeSingle();

            if (data1) {
                adminData = data1;
            } else {
                const { data: data2 } = await supabase
                    .from('admin')
                    .select('full_name, name, email, username, admin_id')
                    .eq('email', user.email)
                    .maybeSingle();

                if (data2) adminData = data2;
            }

            if (adminData) {
                const adminName = adminData.full_name || adminData.name || user.email.split('@')[0];
                document.getElementById('adminName').value = adminName;
                document.getElementById('adminEmail').value = adminData.email || '';
                document.getElementById('adminUsername').value = adminData.username || adminName.split(' ')[0]?.toLowerCase() || 'admin';

                localStorage.setItem('currentAdmin', JSON.stringify({
                    full_name: adminName,
                    email: adminData.email,
                    username: adminData.username,
                    admin_id: adminData.admin_id
                }));

                // Refresh drawer with loaded data
                setupAdminDrawer(adminName, adminData.admin_id || adminData.email || 'Admin');
                console.log('Admin loaded from DB:', adminName);
            }
        }
    } catch (error) {
        console.error('Error loading admin profile:', error);
    }
}

// ============ UPDATE ADMIN PROFILE ============
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
        if (user && user.email) {
            const { error } = await supabase
                .from('admins')
                .update({
                    full_name: adminName,
                    email: adminEmail,
                    username: adminUsername,
                    two_factor_auth: twoFactorAuth,
                    updated_at: new Date().toISOString()
                })
                .eq('email', user.email);

            if (error) throw error;
        }

        const currentAdmin = getCurrentAdmin() || {};
        const updatedAdmin = {
            ...currentAdmin,
            full_name: adminName,
            email: adminEmail,
            username: adminUsername
        };
        localStorage.setItem('currentAdmin', JSON.stringify(updatedAdmin));

        // Refresh drawer with updated name
        setupAdminDrawer(adminName, currentAdmin?.admin_id || currentAdmin?.email || 'Admin');

        return true;

    } catch (error) {
        console.error('Error updating admin:', error);
        showAlert('Failed to update admin profile', 'error');
        return false;
    }
}

// ============ CHANGE PASSWORD ============
async function changePassword() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Skip password change if all fields are empty — it's optional
    if (!currentPassword && !newPassword && !confirmPassword) {
        return null; // null = skipped (not an error)
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
        showAlert('Please fill in all password fields', 'error');
        return false;
    }

    if (newPassword.length < 6) {
        showAlert('New password must be at least 6 characters', 'error');
        return false;
    }

    if (newPassword !== confirmPassword) {
        showAlert('New passwords do not match', 'error');
        return false;
    }

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not found');

        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: user.email,
            password: currentPassword
        });

        if (signInError) {
            showAlert('Current password is incorrect', 'error');
            return false;
        }

        const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
        if (updateError) throw updateError;

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

// ============ SAVE ALL SETTINGS ============
async function saveAllSettings() {
    showAlert('Saving settings...', 'info');

    const generalSettings = {
        systemName: document.getElementById('systemName')?.value || '',
        timezone: document.getElementById('timezone')?.value || '',
        dateFormat: document.getElementById('dateFormat')?.value || '',
        language: document.getElementById('language')?.value || ''
    };

    const notificationSettings = {
        emailNotifications: document.getElementById('emailNotifications')?.checked || false,
        smsNotifications: document.getElementById('smsNotifications')?.checked || false,
        firstReminder: document.getElementById('firstReminder')?.value || 7,
        secondReminder: document.getElementById('secondReminder')?.value || 3,
        finalReminder: document.getElementById('finalReminder')?.value || 1
    };

    const securitySettings = {
        sessionTimeout: document.getElementById('sessionTimeout')?.value || 30,
        maxAttempts: document.getElementById('maxAttempts')?.value || 5,
        strongPassword: document.getElementById('strongPassword')?.checked || false
    };

    const backupSettings = {
        backupSchedule: document.getElementById('backupSchedule')?.value || 'weekly'
    };

    localStorage.setItem('docst_settings', JSON.stringify({
        general: generalSettings,
        notifications: notificationSettings,
        security: securitySettings,
        backup: backupSettings,
        savedAt: new Date().toISOString()
    }));

    // Update profile first
    const profileUpdated = await updateAdminProfile();
    if (profileUpdated === false) return; // Abort on profile error

    // Attempt password change (skipped automatically if fields are empty)
    const passwordResult = await changePassword();
    if (passwordResult === false) return; // Abort on password error

    // Build a contextual success message
    let message = 'Settings saved successfully!';
    if (profileUpdated && passwordResult === true) {
        message = 'Settings and password updated successfully!';
    } else if (passwordResult === true) {
        message = 'Password changed successfully!';
    }

    showAlert(message, 'success');
}

// ============ RESET TO DEFAULT ============
function resetSettings() {
    if (!confirm('Are you sure you want to reset all settings to default?')) return;

    document.getElementById('systemName').value = 'DOCST - Disciplinary Office Service Tracker';
    document.getElementById('timezone').value = 'Asia/Manila';
    document.getElementById('dateFormat').value = 'MM/DD/YYYY';
    document.getElementById('language').value = 'en';
    document.getElementById('twoFactorAuth').checked = false;
    document.getElementById('emailNotifications').checked = true;
    document.getElementById('smsNotifications').checked = false;
    document.getElementById('firstReminder').value = 7;
    document.getElementById('secondReminder').value = 3;
    document.getElementById('finalReminder').value = 1;
    document.getElementById('sessionTimeout').value = 30;
    document.getElementById('maxAttempts').value = 5;
    document.getElementById('strongPassword').checked = true;
    document.getElementById('backupSchedule').value = 'weekly';
    document.getElementById('currentPassword').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';

    showAlert('Settings reset to default! Click Save to apply changes.', 'success');
}

// ============ LOAD SAVED SETTINGS ============
function loadSettings() {
    const savedSettings = localStorage.getItem('docst_settings');
    if (!savedSettings) return;

    try {
        const settings = JSON.parse(savedSettings);

        if (settings.general) {
            if (document.getElementById('systemName')) document.getElementById('systemName').value = settings.general.systemName;
            if (document.getElementById('timezone')) document.getElementById('timezone').value = settings.general.timezone;
            if (document.getElementById('dateFormat')) document.getElementById('dateFormat').value = settings.general.dateFormat;
            if (document.getElementById('language')) document.getElementById('language').value = settings.general.language;
        }

        if (settings.notifications) {
            if (document.getElementById('emailNotifications')) document.getElementById('emailNotifications').checked = settings.notifications.emailNotifications;
            if (document.getElementById('smsNotifications')) document.getElementById('smsNotifications').checked = settings.notifications.smsNotifications;
            if (document.getElementById('firstReminder')) document.getElementById('firstReminder').value = settings.notifications.firstReminder;
            if (document.getElementById('secondReminder')) document.getElementById('secondReminder').value = settings.notifications.secondReminder;
            if (document.getElementById('finalReminder')) document.getElementById('finalReminder').value = settings.notifications.finalReminder;
        }

        if (settings.security) {
            if (document.getElementById('sessionTimeout')) document.getElementById('sessionTimeout').value = settings.security.sessionTimeout;
            if (document.getElementById('maxAttempts')) document.getElementById('maxAttempts').value = settings.security.maxAttempts;
            if (document.getElementById('strongPassword')) document.getElementById('strongPassword').checked = settings.security.strongPassword;
        }

        if (settings.backup) {
            if (document.getElementById('backupSchedule')) document.getElementById('backupSchedule').value = settings.backup.backupSchedule;
        }

        console.log('Settings loaded from localStorage');
    } catch (e) {
        console.error('Failed to parse saved settings:', e);
    }
}

// ============ BACKUP FUNCTIONS ============
function backupNow() {
    const settings = localStorage.getItem('docst_settings');
    const admin = getCurrentAdmin();

    const backupData = {
        settings: settings ? JSON.parse(settings) : null,
        admin: admin ? { full_name: admin.full_name, email: admin.email } : null,
        timestamp: new Date().toISOString(),
        version: '1.0',
        exportedBy: admin?.full_name || 'Administrator'
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `docst_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    showAlert('Backup created successfully!', 'success');
}

function restoreBackup() {
    const fileInput = document.getElementById('restoreFile');
    const file = fileInput.files[0];

    if (!file) {
        showAlert('Please select a backup file first!', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const backup = JSON.parse(e.target.result);
            if (backup.settings) {
                localStorage.setItem('docst_settings', JSON.stringify(backup.settings));
                loadSettings();
                showAlert('Backup restored successfully! Page will reload.', 'success');
                setTimeout(() => window.location.reload(), 1500);
            } else {
                showAlert('Invalid backup file! No settings found.', 'error');
            }
        } catch (error) {
            console.error('Error reading backup:', error);
            showAlert('Error reading backup file! Invalid format.', 'error');
        }
    };
    reader.readAsText(file);
}

// ============ SHOW ALERT ============
function showAlert(message, type) {
    const alertDiv = document.getElementById('alertMessage');
    if (!alertDiv) return;

    alertDiv.textContent = message;
    alertDiv.className = `alert ${type}`;

    alertDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    setTimeout(() => {
        alertDiv.className = 'alert';
    }, 4000);
}

// ============ INITIALIZE ============
function init() {
    console.log('🔧 Initializing Admin Settings Page...');

    initDrawer();       // Sets up drawer using getCurrentAdmin() from localStorage
    loadAdminProfile(); // Populates form fields; refreshes drawer if loaded from DB
    loadSettings();     // Restores general/notification/security/backup settings
    initDarkMode();     // Applies saved dark mode preference

    console.log('✅ Admin Settings Page Initialized');
}

// Expose functions globally for HTML onclick handlers
window.saveAllSettings = saveAllSettings;
window.resetSettings = resetSettings;
window.backupNow = backupNow;
window.restoreBackup = restoreBackup;
window.changePassword = changePassword;

document.addEventListener('DOMContentLoaded', init);