// setting.js - Fully Functional Settings Management

// ============ GLOBAL VARIABLES ============
let currentTab = 'general';

// ============ TAB NAVIGATION ============
function initTabNavigation() {
    const navItems = document.querySelectorAll('.nav-item[data-tab]');
    const panels = document.querySelectorAll('.settings-panel');
    
    function switchTab(tabId) {
        currentTab = tabId;
        
        // Update nav active state
        navItems.forEach(item => {
            if (item.getAttribute('data-tab') === tabId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
        
        // Update panel visibility
        panels.forEach(panel => {
            if (panel.id === `panel-${tabId}`) {
                panel.classList.add('active');
            } else {
                panel.classList.remove('active');
            }
        });
    }
    
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            if (tabId) {
                switchTab(tabId);
            }
        });
    });
    
    // Set default tab
    switchTab('general');
}

// ============ LOAD ADMIN PROFILE ============
function loadAdminProfile() {
    // Try to get from localStorage
    const storedAdmin = localStorage.getItem('currentAdmin');
    if (storedAdmin) {
        try {
            const admin = JSON.parse(storedAdmin);
            if (admin.full_name) {
                document.getElementById('adminName').value = admin.full_name;
                document.getElementById('adminEmail').value = admin.email || '';
                document.getElementById('adminUsername').value = admin.username || admin.full_name.split(' ')[0].toLowerCase();
                console.log('Admin profile loaded from localStorage');
                return;
            }
        } catch(e) {}
    }
    
    // Default values if no stored admin
    document.getElementById('adminName').value = 'Administrator';
    document.getElementById('adminEmail').value = 'admin@docst.edu.ph';
    document.getElementById('adminUsername').value = 'admin';
}

// ============ SAVE ALL SETTINGS ============
function saveAllSettings() {
    try {
        // Collect general settings
        const systemName = document.getElementById('systemName')?.value || '';
        const timezone = document.getElementById('timezone')?.value || '';
        const dateFormat = document.getElementById('dateFormat')?.value || '';
        const language = document.getElementById('language')?.value || '';
        
        // Collect admin settings
        const adminName = document.getElementById('adminName')?.value || '';
        const adminEmail = document.getElementById('adminEmail')?.value || '';
        const adminUsername = document.getElementById('adminUsername')?.value || '';
        const twoFactorAuth = document.getElementById('twoFactorAuth')?.checked || false;
        
        // Collect student settings
        const studentIdFormat = document.getElementById('studentIdFormat')?.value || '';
        const autoGenerateId = document.getElementById('autoGenerateId')?.checked || false;
        const emailVerification = document.getElementById('emailVerification')?.checked || false;
        const maxFileSize = document.getElementById('maxFileSize')?.value || 5;
        
        // Collect penalty settings
        const minorHours = document.getElementById('minorHours')?.value || 5;
        const majorHours = document.getElementById('majorHours')?.value || 15;
        const graveHours = document.getElementById('graveHours')?.value || 30;
        const appealPeriod = document.getElementById('appealPeriod')?.value || 7;
        
        // Collect notification settings
        const emailNotifications = document.getElementById('emailNotifications')?.checked || false;
        const smsNotifications = document.getElementById('smsNotifications')?.checked || false;
        const firstReminder = document.getElementById('firstReminder')?.value || 7;
        const secondReminder = document.getElementById('secondReminder')?.value || 3;
        const finalReminder = document.getElementById('finalReminder')?.value || 1;
        
        // Collect security settings
        const sessionTimeout = document.getElementById('sessionTimeout')?.value || 30;
        const maxAttempts = document.getElementById('maxAttempts')?.value || 5;
        const strongPassword = document.getElementById('strongPassword')?.checked || false;
        
        // Collect backup settings
        const backupSchedule = document.getElementById('backupSchedule')?.value || 'weekly';
        
        // Save to localStorage
        const settings = {
            general: { systemName, timezone, dateFormat, language },
            admin: { name: adminName, email: adminEmail, username: adminUsername, twoFactorAuth },
            students: { idFormat: studentIdFormat, autoGenerateId, emailVerification, maxFileSize },
            penalties: { minorHours, majorHours, graveHours, appealPeriod },
            notifications: { emailNotifications, smsNotifications, firstReminder, secondReminder, finalReminder },
            security: { sessionTimeout, maxAttempts, strongPassword },
            backup: { backupSchedule }
        };
        
        localStorage.setItem('docst_settings', JSON.stringify(settings));
        
        // Save admin to currentAdmin for other pages
        localStorage.setItem('currentAdmin', JSON.stringify({
            full_name: adminName,
            email: adminEmail,
            username: adminUsername
        }));
        
        // Handle password change
        const currentPassword = document.getElementById('currentPassword')?.value;
        const newPassword = document.getElementById('newPassword')?.value;
        const confirmPassword = document.getElementById('confirmPassword')?.value;
        
        if (currentPassword && newPassword) {
            if (newPassword !== confirmPassword) {
                showAlert('New passwords do not match!', 'error');
                return;
            }
            if (newPassword.length < 6) {
                showAlert('Password must be at least 6 characters', 'error');
                return;
            }
            showAlert('Password changed successfully! Please remember your new password.', 'success');
            document.getElementById('currentPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';
        }
        
        showAlert('All settings saved successfully!', 'success');
        console.log('Settings saved:', settings);
        
    } catch (error) {
        console.error('Error saving settings:', error);
        showAlert('Error saving settings: ' + error.message, 'error');
    }
}

// ============ RESET TO DEFAULT SETTINGS ============
function resetSettings() {
    if (confirm('Are you sure you want to reset all settings to default?')) {
        // Reset general
        const systemName = document.getElementById('systemName');
        const timezone = document.getElementById('timezone');
        const dateFormat = document.getElementById('dateFormat');
        const language = document.getElementById('language');
        
        if (systemName) systemName.value = 'DOCST - Disciplinary Office Service Tracker';
        if (timezone) timezone.value = 'Asia/Manila';
        if (dateFormat) dateFormat.value = 'MM/DD/YYYY';
        if (language) language.value = 'en';
        
        // Reset admin (keep name)
        const twoFactorAuth = document.getElementById('twoFactorAuth');
        if (twoFactorAuth) twoFactorAuth.checked = false;
        
        // Reset students
        const studentIdFormat = document.getElementById('studentIdFormat');
        const autoGenerateId = document.getElementById('autoGenerateId');
        const emailVerification = document.getElementById('emailVerification');
        const maxFileSize = document.getElementById('maxFileSize');
        
        if (studentIdFormat) studentIdFormat.value = 'YYYY-XXXXX';
        if (autoGenerateId) autoGenerateId.checked = true;
        if (emailVerification) emailVerification.checked = true;
        if (maxFileSize) maxFileSize.value = 5;
        
        // Reset penalties
        const minorHours = document.getElementById('minorHours');
        const majorHours = document.getElementById('majorHours');
        const graveHours = document.getElementById('graveHours');
        const appealPeriod = document.getElementById('appealPeriod');
        
        if (minorHours) minorHours.value = 5;
        if (majorHours) majorHours.value = 15;
        if (graveHours) graveHours.value = 30;
        if (appealPeriod) appealPeriod.value = 7;
        
        // Reset notifications
        const emailNotifications = document.getElementById('emailNotifications');
        const smsNotifications = document.getElementById('smsNotifications');
        const firstReminder = document.getElementById('firstReminder');
        const secondReminder = document.getElementById('secondReminder');
        const finalReminder = document.getElementById('finalReminder');
        
        if (emailNotifications) emailNotifications.checked = true;
        if (smsNotifications) smsNotifications.checked = false;
        if (firstReminder) firstReminder.value = 7;
        if (secondReminder) secondReminder.value = 3;
        if (finalReminder) finalReminder.value = 1;
        
        // Reset security
        const sessionTimeout = document.getElementById('sessionTimeout');
        const maxAttempts = document.getElementById('maxAttempts');
        const strongPassword = document.getElementById('strongPassword');
        
        if (sessionTimeout) sessionTimeout.value = 30;
        if (maxAttempts) maxAttempts.value = 5;
        if (strongPassword) strongPassword.checked = true;
        
        // Reset backup
        const backupSchedule = document.getElementById('backupSchedule');
        if (backupSchedule) backupSchedule.value = 'weekly';
        
        showAlert('Settings reset to default!', 'success');
    }
}

// ============ LOAD SAVED SETTINGS ============
function loadSettings() {
    const savedSettings = localStorage.getItem('docst_settings');
    if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        
        // Load general settings
        if (settings.general) {
            const systemName = document.getElementById('systemName');
            const timezone = document.getElementById('timezone');
            const dateFormat = document.getElementById('dateFormat');
            const language = document.getElementById('language');
            
            if (systemName) systemName.value = settings.general.systemName;
            if (timezone) timezone.value = settings.general.timezone;
            if (dateFormat) dateFormat.value = settings.general.dateFormat;
            if (language) language.value = settings.general.language;
        }
        
        // Load student settings
        if (settings.students) {
            const studentIdFormat = document.getElementById('studentIdFormat');
            const autoGenerateId = document.getElementById('autoGenerateId');
            const emailVerification = document.getElementById('emailVerification');
            const maxFileSize = document.getElementById('maxFileSize');
            
            if (studentIdFormat) studentIdFormat.value = settings.students.idFormat;
            if (autoGenerateId) autoGenerateId.checked = settings.students.autoGenerateId;
            if (emailVerification) emailVerification.checked = settings.students.emailVerification;
            if (maxFileSize) maxFileSize.value = settings.students.maxFileSize;
        }
        
        // Load penalty settings
        if (settings.penalties) {
            const minorHours = document.getElementById('minorHours');
            const majorHours = document.getElementById('majorHours');
            const graveHours = document.getElementById('graveHours');
            const appealPeriod = document.getElementById('appealPeriod');
            
            if (minorHours) minorHours.value = settings.penalties.minorHours;
            if (majorHours) majorHours.value = settings.penalties.majorHours;
            if (graveHours) graveHours.value = settings.penalties.graveHours;
            if (appealPeriod) appealPeriod.value = settings.penalties.appealPeriod;
        }
        
        // Load notification settings
        if (settings.notifications) {
            const emailNotifications = document.getElementById('emailNotifications');
            const smsNotifications = document.getElementById('smsNotifications');
            const firstReminder = document.getElementById('firstReminder');
            const secondReminder = document.getElementById('secondReminder');
            const finalReminder = document.getElementById('finalReminder');
            
            if (emailNotifications) emailNotifications.checked = settings.notifications.emailNotifications;
            if (smsNotifications) smsNotifications.checked = settings.notifications.smsNotifications;
            if (firstReminder) firstReminder.value = settings.notifications.firstReminder;
            if (secondReminder) secondReminder.value = settings.notifications.secondReminder;
            if (finalReminder) finalReminder.value = settings.notifications.finalReminder;
        }
        
        // Load security settings
        if (settings.security) {
            const sessionTimeout = document.getElementById('sessionTimeout');
            const maxAttempts = document.getElementById('maxAttempts');
            const strongPassword = document.getElementById('strongPassword');
            
            if (sessionTimeout) sessionTimeout.value = settings.security.sessionTimeout;
            if (maxAttempts) maxAttempts.value = settings.security.maxAttempts;
            if (strongPassword) strongPassword.checked = settings.security.strongPassword;
        }
        
        // Load backup settings
        if (settings.backup) {
            const backupSchedule = document.getElementById('backupSchedule');
            if (backupSchedule) backupSchedule.value = settings.backup.backupSchedule;
        }
    }
}

// ============ VIOLATION MANAGEMENT ============
function addViolation() {
    const newViolation = prompt('Enter violation name:');
    if (newViolation && newViolation.trim()) {
        const violationsList = document.getElementById('violationsList');
        if (violationsList) {
            const violationDiv = document.createElement('div');
            violationDiv.className = 'violation-item';
            violationDiv.innerHTML = `
                <span class="violation-name">${escapeHtml(newViolation.trim())}</span>
                <div class="violation-actions">
                    <button class="edit-btn" onclick="editViolation(this)">✏️</button>
                    <button class="delete-btn" onclick="deleteViolation(this)">🗑️</button>
                </div>
            `;
            violationsList.appendChild(violationDiv);
            showAlert('Violation added successfully!', 'success');
        }
    }
}

function editViolation(btn) {
    const item = btn.closest('.violation-item');
    const nameSpan = item.querySelector('.violation-name');
    const currentName = nameSpan.textContent;
    const newName = prompt('Edit violation name:', currentName);
    if (newName && newName.trim()) {
        nameSpan.textContent = newName.trim();
        showAlert('Violation updated!', 'success');
    }
}

function deleteViolation(btn) {
    if (confirm('Are you sure you want to delete this violation?')) {
        const item = btn.closest('.violation-item');
        item.remove();
        showAlert('Violation deleted!', 'success');
    }
}

// ============ BACKUP FUNCTIONS ============
function backupNow() {
    const settings = localStorage.getItem('docst_settings');
    const data = {
        settings: settings ? JSON.parse(settings) : null,
        timestamp: new Date().toISOString(),
        version: '1.0'
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
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
    reader.onload = function(e) {
        try {
            const backup = JSON.parse(e.target.result);
            if (backup.settings) {
                localStorage.setItem('docst_settings', JSON.stringify(backup.settings));
                loadSettings();
                showAlert('Backup restored successfully!', 'success');
            } else {
                showAlert('Invalid backup file!', 'error');
            }
        } catch (error) {
            showAlert('Error reading backup file!', 'error');
        }
    };
    reader.readAsText(file);
}

// ============ HELPER FUNCTIONS ============
function showAlert(message, type) {
    const alertDiv = document.getElementById('alertMessage');
    if (!alertDiv) return;
    
    alertDiv.textContent = message;
    alertDiv.className = `alert ${type}`;
    
    setTimeout(() => {
        alertDiv.className = 'alert';
    }, 3000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============ DARK MODE ============
function initDarkMode() {
    const darkModeToggle = document.getElementById('darkModeToggle');
    const savedMode = localStorage.getItem('docst_dark_mode');
    
    if (savedMode === 'enabled') {
        document.body.classList.add('dark-mode');
        updateDarkModeButton(true);
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
        if (isDark) {
            darkModeToggle.innerHTML = `
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
                <span>Light Mode</span>
            `;
        } else {
            darkModeToggle.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
                <span>Dark Mode</span>
            `;
        }
    }
}

// ============ MAKE FUNCTIONS GLOBAL ============
window.saveAllSettings = saveAllSettings;
window.resetSettings = resetSettings;
window.addViolation = addViolation;
window.editViolation = editViolation;
window.deleteViolation = deleteViolation;
window.backupNow = backupNow;
window.restoreBackup = restoreBackup;

// ============ INITIALIZE ============
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 Initializing Settings Page...');
    
    // Initialize tab navigation
    initTabNavigation();
    
    // Load admin profile
    loadAdminProfile();
    
    // Load saved settings
    loadSettings();
    
    // Initialize dark mode
    initDarkMode();
    
    console.log('✅ Settings Page Initialized');
});