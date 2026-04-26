        // Tab Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const tab = item.getAttribute('data-tab');
                
                // Update active state
                document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
                
                // Show corresponding panel
                document.querySelectorAll('.settings-panel').forEach(panel => panel.classList.remove('active'));
                document.getElementById(`panel-${tab}`).classList.add('active');
            });
        });

        // Save all settings
        function saveAllSettings() {
            // Collect all settings
            const settings = {
                general: {
                    systemName: document.getElementById('systemName').value,
                    timezone: document.getElementById('timezone').value,
                    dateFormat: document.getElementById('dateFormat').value,
                    language: document.getElementById('language').value
                },
                admin: {
                    name: document.getElementById('adminName').value,
                    email: document.getElementById('adminEmail').value,
                    username: document.getElementById('adminUsername').value,
                    twoFactorAuth: document.getElementById('twoFactorAuth').checked
                },
                students: {
                    idFormat: document.getElementById('studentIdFormat').value,
                    autoGenerateId: document.getElementById('autoGenerateId').checked,
                    emailVerification: document.getElementById('emailVerification').checked,
                    maxFileSize: document.getElementById('maxFileSize').value
                },
                penalties: {
                    minorHours: document.getElementById('minorHours').value,
                    majorHours: document.getElementById('majorHours').value,
                    graveHours: document.getElementById('graveHours').value,
                    appealPeriod: document.getElementById('appealPeriod').value
                },
                notifications: {
                    emailNotifications: document.getElementById('emailNotifications').checked,
                    smsNotifications: document.getElementById('smsNotifications').checked,
                    firstReminder: document.getElementById('firstReminder').value,
                    secondReminder: document.getElementById('secondReminder').value,
                    finalReminder: document.getElementById('finalReminder').value
                },
                security: {
                    sessionTimeout: document.getElementById('sessionTimeout').value,
                    maxAttempts: document.getElementById('maxAttempts').value,
                    strongPassword: document.getElementById('strongPassword').checked
                },
                backup: {
                    backupSchedule: document.getElementById('backupSchedule').value
                }
            };
            
            // Save to localStorage
            localStorage.setItem('docst_settings', JSON.stringify(settings));
            
            // Show success message
            showAlert('Settings saved successfully!', 'success');
            
            // Log for debugging
            console.log('Settings saved:', settings);
        }

        // Reset to default settings
        function resetSettings() {
            if (confirm('Are you sure you want to reset all settings to default?')) {
                // Reset general
                document.getElementById('systemName').value = 'DOCST - Disciplinary Office Service Tracker';
                document.getElementById('timezone').value = 'Asia/Manila';
                document.getElementById('dateFormat').value = 'MM/DD/YYYY';
                document.getElementById('language').value = 'en';
                
                // Reset admin
                document.getElementById('adminName').value = 'Administrator';
                document.getElementById('adminEmail').value = 'admin@docst.edu.ph';
                document.getElementById('adminUsername').value = 'admin';
                document.getElementById('twoFactorAuth').checked = false;
                
                // Reset students
                document.getElementById('studentIdFormat').value = 'YYYY-XXXXX';
                document.getElementById('autoGenerateId').checked = true;
                document.getElementById('emailVerification').checked = true;
                document.getElementById('maxFileSize').value = 5;
                
                // Reset penalties
                document.getElementById('minorHours').value = 5;
                document.getElementById('majorHours').value = 15;
                document.getElementById('graveHours').value = 30;
                document.getElementById('appealPeriod').value = 7;
                
                // Reset notifications
                document.getElementById('emailNotifications').checked = true;
                document.getElementById('smsNotifications').checked = false;
                document.getElementById('firstReminder').value = 7;
                document.getElementById('secondReminder').value = 3;
                document.getElementById('finalReminder').value = 1;
                
                // Reset security
                document.getElementById('sessionTimeout').value = 30;
                document.getElementById('maxAttempts').value = 5;
                document.getElementById('strongPassword').checked = true;
                
                // Reset backup
                document.getElementById('backupSchedule').value = 'weekly';
                
                showAlert('Settings reset to default!', 'success');
            }
        }

        // Load saved settings
        function loadSettings() {
            const savedSettings = localStorage.getItem('docst_settings');
            if (savedSettings) {
                const settings = JSON.parse(savedSettings);
                if (settings.general) {
                    document.getElementById('systemName').value = settings.general.systemName;
                    document.getElementById('timezone').value = settings.general.timezone;
                    document.getElementById('dateFormat').value = settings.general.dateFormat;
                    document.getElementById('language').value = settings.general.language;
                }
                if (settings.admin) {
                    document.getElementById('adminName').value = settings.admin.name;
                    document.getElementById('adminEmail').value = settings.admin.email;
                    document.getElementById('adminUsername').value = settings.admin.username;
                    document.getElementById('twoFactorAuth').checked = settings.admin.twoFactorAuth;
                }
                if (settings.students) {
                    document.getElementById('studentIdFormat').value = settings.students.idFormat;
                    document.getElementById('autoGenerateId').checked = settings.students.autoGenerateId;
                    document.getElementById('emailVerification').checked = settings.students.emailVerification;
                    document.getElementById('maxFileSize').value = settings.students.maxFileSize;
                }
                if (settings.penalties) {
                    document.getElementById('minorHours').value = settings.penalties.minorHours;
                    document.getElementById('majorHours').value = settings.penalties.majorHours;
                    document.getElementById('graveHours').value = settings.penalties.graveHours;
                    document.getElementById('appealPeriod').value = settings.penalties.appealPeriod;
                }
                
                if (settings.notifications) {
                    document.getElementById('emailNotifications').checked = settings.notifications.emailNotifications;
                    document.getElementById('smsNotifications').checked = settings.notifications.smsNotifications;
                    document.getElementById('firstReminder').value = settings.notifications.firstReminder;
                    document.getElementById('secondReminder').value = settings.notifications.secondReminder;
                    document.getElementById('finalReminder').value = settings.notifications.finalReminder;
                }
                if (settings.security) {
                    document.getElementById('sessionTimeout').value = settings.security.sessionTimeout;
                    document.getElementById('maxAttempts').value = settings.security.maxAttempts;
                    document.getElementById('strongPassword').checked = settings.security.strongPassword;
                }
                if (settings.backup) {
                    document.getElementById('backupSchedule').value = settings.backup.backupSchedule;
                }
                
                showAlert('Settings loaded successfully!', 'success');
            }
        }

        // Violation management
        function addViolation() {
            const newViolation = prompt('Enter violation name:');
            if (newViolation && newViolation.trim()) {
                const violationsList = document.getElementById('violationsList');
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

        // Backup functions
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

        // Helper functions
        function showAlert(message, type) {
            const alertDiv = document.getElementById('alertMessage');
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
document.addEventListener('DOMContentLoaded', function() {
    const navItems = document.querySelectorAll('.nav-item[data-tab]');
    const panels = document.querySelectorAll('.settings-panel');
    function switchTab(tabId) {
        navItems.forEach(item => {
            item.classList.remove('active');
        });

        const activeNav = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
        if (activeNav) {
            activeNav.classList.add('active');
        }

        panels.forEach(panel => {
            panel.classList.remove('active');
        });
        
        const activePanel = document.getElementById(`panel-${tabId}`);
        if (activePanel) {
            activePanel.classList.add('active');
        }
    }
    
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            if (tabId) {
                switchTab(tabId);
            }
        });
    });

    const defaultTab = 'general';
    switchTab(defaultTab);
});

        loadSettings();