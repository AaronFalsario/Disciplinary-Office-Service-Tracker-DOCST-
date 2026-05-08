import { createClient } from '@supabase/supabase-js'
import { setupDrawer, setupLogout } from '/Assets/drawer.js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

let currentStudent = null
let currentLanguage = localStorage.getItem('student_language') || 'English'

// ============ AUTH CHECK ============
async function checkAuth() {
    const stored = localStorage.getItem('currentStudent')
    
    if (!stored) {
        window.location.href = '/Assets/Student Authentication/Student.html'
        return false
    }
    
    try {
        currentStudent = JSON.parse(stored)
        
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
            localStorage.removeItem('currentStudent')
            window.location.href = '/Assets/Student Authentication/Student.html'
            return false
        }
        
        return true
    } catch (e) {
        console.error('Auth check failed:', e)
        window.location.href = '/Assets/Student Authentication/Student.html'
        return false
    }
}

// ============ MAKE EMAIL FIELD LOCKED ============
function lockEmailField() {
    const emailInput = document.getElementById('email')
    if (emailInput) {
        emailInput.readOnly = true
        emailInput.disabled = true
        emailInput.style.backgroundColor = 'var(--bg)'
        emailInput.style.cursor = 'not-allowed'
        emailInput.style.opacity = '0.7'
    }
}

// ============ LOAD PROFILE DATA ============
async function loadProfileData() {
    if (!currentStudent) return
    
    try {
        const { data, error } = await supabase
            .from('students')
            .select('*')
            .eq('email', currentStudent.email)
            .maybeSingle()
        
        if (error) {
            console.error('Error:', error)
            document.getElementById('fullName').value = currentStudent.name || ''
            document.getElementById('studentId').value = currentStudent.studentId || ''
            document.getElementById('email').value = currentStudent.email || ''
            lockEmailField()
            return
        }
        
        if (data) {
            document.getElementById('fullName').value = data.name || currentStudent.name || ''
            document.getElementById('studentId').value = data.id_number || currentStudent.studentId || ''
            document.getElementById('email').value = data.email || currentStudent.email || ''
        } else {
            document.getElementById('fullName').value = currentStudent.name || ''
            document.getElementById('studentId').value = currentStudent.studentId || ''
            document.getElementById('email').value = currentStudent.email || ''
        }
        
        // Lock email field after setting value
        lockEmailField()
        
    } catch (error) {
        console.error('Error loading profile:', error)
        document.getElementById('fullName').value = currentStudent.name || ''
        document.getElementById('studentId').value = currentStudent.studentId || ''
        document.getElementById('email').value = currentStudent.email || ''
        lockEmailField()
    }
}

// ============ SAVE PROFILE (NAME ONLY) ============
async function saveProfile() {
    const fullName = document.getElementById('fullName').value.trim()
    
    if (!fullName) {
        showAlert('Please enter your name', 'error')
        return
    }
    
    try {
        // Only update name, not email
        const { error } = await supabase
            .from('students')
            .update({ 
                name: fullName,
                updated_at: new Date().toISOString()
            })
            .eq('email', currentStudent.email)
        
        if (error) {
            showAlert('Error: ' + error.message, 'error')
            return
        }
        
        // Update local storage
        currentStudent.name = fullName
        localStorage.setItem('currentStudent', JSON.stringify(currentStudent))
        
        showAlert('Profile updated successfully!', 'success')
        setupDrawer(currentStudent.name, currentStudent.studentId)
        
    } catch (error) {
        console.error('Error saving profile:', error)
        showAlert('Error saving profile', 'error')
    }
}

// ============ CHANGE PASSWORD ============
async function changePassword() {
    const currentPw = document.getElementById('modalCurrentPassword').value
    const newPw = document.getElementById('modalNewPassword').value
    const confirmPw = document.getElementById('modalConfirmPassword').value
    
    if (!currentPw || !newPw || !confirmPw) {
        showAlert('Please fill in all password fields', 'error')
        return
    }
    
    if (newPw.length < 6) {
        showAlert('New password must be at least 6 characters', 'error')
        return
    }
    
    if (newPw !== confirmPw) {
        showAlert('New passwords do not match', 'error')
        return
    }
    
    try {
        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: currentStudent.email,
            password: currentPw
        })
        
        if (signInError) {
            showAlert('Current password is incorrect', 'error')
            return
        }
        
        const { error: updateError } = await supabase.auth.updateUser({
            password: newPw
        })
        
        if (updateError) throw updateError
        
        showAlert('Password updated successfully!', 'success')
        
        document.getElementById('modalCurrentPassword').value = ''
        document.getElementById('modalNewPassword').value = ''
        document.getElementById('modalConfirmPassword').value = ''
        closeSecurityModal()
        
    } catch (error) {
        console.error('Error changing password:', error)
        showAlert('Error changing password', 'error')
    }
}

// ============ NOTIFICATION SETTINGS ============
function saveNotificationSettings() {
    const settings = {
        email: document.getElementById('modalEmailNotif').checked,
        penalty: document.getElementById('modalPenaltyNotif').checked,
        appeal: document.getElementById('modalAppealNotif').checked,
        deadline: document.getElementById('modalDeadlineNotif').checked
    }
    
    localStorage.setItem('notificationSettings', JSON.stringify(settings))
    showAlert('Notification preferences saved!', 'success')
    closeNotificationModal()
}

function loadNotificationSettings() {
    const saved = localStorage.getItem('notificationSettings')
    if (saved) {
        const settings = JSON.parse(saved)
        if (document.getElementById('modalEmailNotif')) document.getElementById('modalEmailNotif').checked = settings.email !== false
        if (document.getElementById('modalPenaltyNotif')) document.getElementById('modalPenaltyNotif').checked = settings.penalty !== false
        if (document.getElementById('modalAppealNotif')) document.getElementById('modalAppealNotif').checked = settings.appeal !== false
        if (document.getElementById('modalDeadlineNotif')) document.getElementById('modalDeadlineNotif').checked = settings.deadline !== false
    }
}

// ============ LANGUAGE ============
function setLanguage(lang) {
    currentLanguage = lang
    localStorage.setItem('student_language', lang)
    const displayEl = document.getElementById('currentLanguageDisplay')
    if (displayEl) displayEl.textContent = lang
    closeLanguageModal()
    showAlert(`Language changed to ${lang}`, 'success')
}

// ============ UPDATE DARK MODE ICON ============
function updateDarkModeIcon(btn, isDark) {
    if (!btn) return
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
        `
    } else {
        btn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
        `
    }
}

// ============ BROADCAST DARK MODE CHANGE ============
function broadcastDarkModeChange(mode) {
    localStorage.setItem('docst_dark_mode', mode)
    window.dispatchEvent(new CustomEvent('darkModeChanged', { detail: { mode } }))
}

// ============ DARK MODE WITH CROSS-PAGE SYNC ============
function initDarkMode() {
    const savedMode = localStorage.getItem('docst_dark_mode')
    const darkModeCheckbox = document.getElementById('darkModeSetting')
    const topbarDarkBtn = document.getElementById('darkModeToggle')
    
    // Apply saved mode on load
    if (savedMode === 'enabled') {
        document.body.classList.add('dark-mode')
        if (darkModeCheckbox) darkModeCheckbox.checked = true
        if (topbarDarkBtn) updateDarkModeIcon(topbarDarkBtn, true)
    } else {
        document.body.classList.remove('dark-mode')
        if (darkModeCheckbox) darkModeCheckbox.checked = false
        if (topbarDarkBtn) updateDarkModeIcon(topbarDarkBtn, false)
    }
    
    // Dark mode checkbox listener (Settings page)
    if (darkModeCheckbox) {
        darkModeCheckbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                document.body.classList.add('dark-mode')
                localStorage.setItem('docst_dark_mode', 'enabled')
                if (topbarDarkBtn) updateDarkModeIcon(topbarDarkBtn, true)
                broadcastDarkModeChange('enabled')
                showAlert('Dark mode enabled', 'success')
            } else {
                document.body.classList.remove('dark-mode')
                localStorage.setItem('docst_dark_mode', 'disabled')
                if (topbarDarkBtn) updateDarkModeIcon(topbarDarkBtn, false)
                broadcastDarkModeChange('disabled')
                showAlert('Light mode enabled', 'success')
            }
        })
    }
    
    // Topbar dark mode button listener
    if (topbarDarkBtn) {
        topbarDarkBtn.addEventListener('click', () => {
            const isDark = document.body.classList.contains('dark-mode')
            if (isDark) {
                document.body.classList.remove('dark-mode')
                localStorage.setItem('docst_dark_mode', 'disabled')
                if (darkModeCheckbox) darkModeCheckbox.checked = false
                updateDarkModeIcon(topbarDarkBtn, false)
                broadcastDarkModeChange('disabled')
                showAlert('Light mode enabled', 'success')
            } else {
                document.body.classList.add('dark-mode')
                localStorage.setItem('docst_dark_mode', 'enabled')
                if (darkModeCheckbox) darkModeCheckbox.checked = true
                updateDarkModeIcon(topbarDarkBtn, true)
                broadcastDarkModeChange('enabled')
                showAlert('Dark mode enabled', 'success')
            }
        })
    }
    
    // Listen for dark mode changes from other tabs/pages
    window.addEventListener('storage', (e) => {
        if (e.key === 'docst_dark_mode') {
            const newMode = e.newValue
            if (newMode === 'enabled') {
                document.body.classList.add('dark-mode')
                if (darkModeCheckbox) darkModeCheckbox.checked = true
                if (topbarDarkBtn) updateDarkModeIcon(topbarDarkBtn, true)
            } else if (newMode === 'disabled') {
                document.body.classList.remove('dark-mode')
                if (darkModeCheckbox) darkModeCheckbox.checked = false
                if (topbarDarkBtn) updateDarkModeIcon(topbarDarkBtn, false)
            }
        }
    })
    
    // Listen for custom event (same page)
    window.addEventListener('darkModeChanged', (e) => {
        const mode = e.detail.mode
        if (mode === 'enabled') {
            document.body.classList.add('dark-mode')
            if (darkModeCheckbox) darkModeCheckbox.checked = true
            if (topbarDarkBtn) updateDarkModeIcon(topbarDarkBtn, true)
        } else {
            document.body.classList.remove('dark-mode')
            if (darkModeCheckbox) darkModeCheckbox.checked = false
            if (topbarDarkBtn) updateDarkModeIcon(topbarDarkBtn, false)
        }
    })
}

// ============ MODAL FUNCTIONS ============
function openModal(modalId) {
    const modal = document.getElementById(modalId)
    if (modal) {
        modal.classList.add('active')
        document.body.style.overflow = 'hidden'
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId)
    if (modal) {
        modal.classList.remove('active')
        document.body.style.overflow = ''
    }
}

function openLanguageModal() {
    openModal('languageModal')
}

function closeLanguageModal() {
    closeModal('languageModal')
}

function openSecurityModal() {
    document.getElementById('modalCurrentPassword').value = ''
    document.getElementById('modalNewPassword').value = ''
    document.getElementById('modalConfirmPassword').value = ''
    openModal('securityModal')
}

function closeSecurityModal() {
    closeModal('securityModal')
}

function openNotificationSettings() {
    loadNotificationSettings()
    openModal('notificationModal')
}

function closeNotificationModal() {
    closeModal('notificationModal')
}

// ============ FAQ, ABOUT, RATE, PRIVACY ============
function openFAQ() {
    showInfoModal('Frequently Asked Questions', `
        <div style="margin-bottom: 16px;">
            <h4 style="margin-bottom: 8px; color: var(--blue);">📋 How do I check my penalties?</h4>
            <p>Go to Dashboard and click on "My Penalties" to view all your active and completed penalties.</p>
        </div>
        <div style="margin-bottom: 16px;">
            <h4 style="margin-bottom: 8px; color: var(--blue);">📝 How do I submit a report?</h4>
            <p>Click on "New Report" from the dashboard, fill out the form with details and attach supporting images.</p>
        </div>
        <div style="margin-bottom: 16px;">
            <h4 style="margin-bottom: 8px; color: var(--blue);">⚖️ How do I submit an appeal?</h4>
            <p>Contact the Discipline Office directly or use the appeal form in your penalty details page.</p>
        </div>
        <div>
            <h4 style="margin-bottom: 8px; color: var(--blue);">🔔 How do I get notifications?</h4>
            <p>Enable notifications in Settings → Notification to receive updates about your penalties and reports.</p>
        </div>
    `)
}

function openAboutUs() {
    showInfoModal('About DOCST', `
        <div style="text-align: center; margin-bottom: 16px;">
            <img src="/Assets/Images/DOCST LOGO.png" style="width: 80px; height: 80px; border-radius: 20px; margin-bottom: 12px;">
            <h3 style="color: var(--blue);">Disciplinary Office Service Tracker</h3>
            <p style="margin-top: 8px;">Version 1.0.0</p>
        </div>
        <p style="line-height: 1.6;">DOCST is a platform designed to help students track their penalties, community service hours, and compliance status. It provides a transparent and efficient way to manage disciplinary records.</p>
        <div style="margin-top: 16px; padding: 12px; background: var(--bg); border-radius: 12px;">
            <p><strong>🏫 Gordon College</strong><br>City of Olongapo, Zambales</p>
        </div>
    `)
}

function rateUs() {
    window.open('https://github.com/AaronFalsario/campus-care', '_blank')
    showAlert('Thanks for rating us!', 'success')
}

function openPrivacyPolicy() {
    showInfoModal('Privacy Policy', `
        <p style="margin-bottom: 12px;">We value your privacy. Your data is securely stored and never shared with third parties.</p>
        <h4 style="margin: 12px 0 8px; color: var(--blue);">📊 Data Collected:</h4>
        <ul style="margin-left: 20px; margin-bottom: 12px;">
            <li>Name, Student ID, Email</li>
            <li>Penalty records and status</li>
            <li>Report submissions</li>
        </ul>
        <h4 style="margin: 12px 0 8px; color: var(--blue);">🔒 Data Usage:</h4>
        <p>Your data is used only for disciplinary tracking and compliance monitoring within Gordon College.</p>
        <div style="margin-top: 16px; padding: 12px; background: var(--bg); border-radius: 12px;">
            <p><strong>Last Updated:</strong> May 2026</p>
        </div>
    `)
}

// ============ INFO MODAL ============
function showInfoModal(title, content) {
    const existingModal = document.getElementById('dynamicInfoModal')
    if (existingModal) existingModal.remove()
    
    const modal = document.createElement('div')
    modal.id = 'dynamicInfoModal'
    modal.className = 'modal-overlay'
    modal.innerHTML = `
        <div class="modal-container" style="max-width: 450px;">
            <div class="modal-header">
                <h3><i class="fas fa-info-circle" style="color: var(--blue);"></i> ${title}</h3>
                <button class="modal-close" onclick="this.closest('.modal-overlay').classList.remove('active')">&times;</button>
            </div>
            <div class="modal-body" style="max-height: 60vh; overflow-y: auto;">
                ${content}
            </div>
            <div class="modal-footer" style="justify-content: center;">
                <button class="btn-cancel" onclick="this.closest('.modal-overlay').classList.remove('active')" style="padding: 10px 30px;">Close</button>
            </div>
        </div>
    `
    document.body.appendChild(modal)
    setTimeout(() => modal.classList.add('active'), 10)
}

// ============ CONFIRM MODAL ============
function confirmLogout() {
    showConfirmModal('Logout', 'Are you sure you want to logout from your account?', () => {
        supabase.auth.signOut().then(() => {
            localStorage.removeItem('currentStudent')
            localStorage.removeItem('currentAdmin')
            window.location.href = '/Assets/Landing/index.html'
        })
    })
}

function confirmDeleteAccount() {
    showConfirmModal('Delete Account', '⚠️ WARNING: This action is permanent.\n\nAll your data will be deleted.\n\nAre you sure?', () => {
        showConfirmModal('Confirm Deletion', 'Type "DELETE" to confirm:', (inputValue) => {
            if (inputValue === 'DELETE') {
                deleteAccount()
            } else {
                showAlert('Account deletion cancelled - incorrect confirmation text', 'error')
            }
        }, true)
    })
}

function showConfirmModal(title, message, onConfirm, hasInput = false) {
    const existingModal = document.getElementById('dynamicConfirmModal')
    if (existingModal) existingModal.remove()
    
    const modal = document.createElement('div')
    modal.id = 'dynamicConfirmModal'
    modal.className = 'modal-overlay'
    modal.innerHTML = `
        <div class="modal-container" style="max-width: 380px;">
            <div class="modal-header" style="background: ${title === 'Delete Account' ? 'var(--red-light)' : 'var(--blue-light)'}">
                <h3><i class="fas ${title === 'Delete Account' ? 'fa-trash-alt' : 'fa-sign-out-alt'}" style="color: ${title === 'Delete Account' ? 'var(--red)' : 'var(--blue)'}"></i> ${title}</h3>
                <button class="modal-close" onclick="this.closest('.modal-overlay').classList.remove('active')">&times;</button>
            </div>
            <div class="modal-body" style="text-align: center;">
                <p style="white-space: pre-line;">${message}</p>
                ${hasInput ? `<input type="text" id="confirmInput" placeholder="Type DELETE to confirm" style="width: 100%; margin-top: 16px; padding: 12px; border-radius: 12px; border: 1px solid var(--border); background: var(--bg); color: var(--text);">` : ''}
            </div>
            <div class="modal-footer">
                <button class="btn-cancel" onclick="this.closest('.modal-overlay').classList.remove('active')">Cancel</button>
                <button class="btn-confirm" style="background: ${title === 'Delete Account' ? 'var(--red)' : 'var(--blue)'}; color: white; border: none; padding: 10px 20px; border-radius: 40px; cursor: pointer;" id="confirmActionBtn">Confirm</button>
            </div>
        </div>
    `
    document.body.appendChild(modal)
    setTimeout(() => modal.classList.add('active'), 10)
    
    document.getElementById('confirmActionBtn').onclick = () => {
        const input = document.getElementById('confirmInput')
        const value = input ? input.value : null
        modal.classList.remove('active')
        setTimeout(() => {
            if (hasInput) {
                onConfirm(value)
            } else {
                onConfirm()
            }
            modal.remove()
        }, 200)
    }
}

async function deleteAccount() {
    if (!currentStudent) return
    
    showAlert('Deleting account...', 'success')
    
    try {
        await supabase.from('students').delete().eq('email', currentStudent.email)
        await supabase.auth.signOut()
        localStorage.clear()
        
        showAlert('Account deleted. Redirecting...', 'success')
        setTimeout(() => {
            window.location.href = '/Assets/Landing/index.html'
        }, 2000)
        
    } catch (error) {
        console.error('Error:', error)
        await supabase.auth.signOut()
        localStorage.clear()
        window.location.href = '/Assets/Landing/index.html'
    }
}

// ============ SHOW ALERT ============
function showAlert(message, type) {
    const alertEl = document.getElementById('alertMessage')
    if (!alertEl) return
    
    alertEl.textContent = message
    alertEl.className = `alert ${type}`
    alertEl.style.display = 'block'
    
    setTimeout(() => {
        alertEl.style.display = 'none'
    }, 4000)
}

// ============ INITIALIZE ============
document.addEventListener('DOMContentLoaded', async () => {
    const isAuth = await checkAuth()
    if (!isAuth) return
    
    setupDrawer(currentStudent.name, currentStudent.studentId)
    setupLogout('logoutBtn')
    
    await loadProfileData()
    loadNotificationSettings()
    initDarkMode()
    
    const langDisplay = document.getElementById('currentLanguageDisplay')
    if (langDisplay) langDisplay.textContent = currentLanguage
    
    document.getElementById('saveProfileBtn')?.addEventListener('click', saveProfile)
    document.getElementById('changePasswordBtn')?.addEventListener('click', changePassword)
    document.getElementById('saveNotificationBtn')?.addEventListener('click', saveNotificationSettings)
    
    // Close modals when clicking outside
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active')
                document.body.style.overflow = ''
            }
        })
    })
})

// Expose global functions
window.setLanguage = setLanguage
window.closeLanguageModal = closeLanguageModal
window.openLanguageModal = openLanguageModal
window.openSecurityModal = openSecurityModal
window.closeSecurityModal = closeSecurityModal
window.openNotificationSettings = openNotificationSettings
window.closeNotificationModal = closeNotificationModal
window.openFAQ = openFAQ
window.openAboutUs = openAboutUs
window.rateUs = rateUs
window.openPrivacyPolicy = openPrivacyPolicy
window.confirmLogout = confirmLogout
window.confirmDeleteAccount = confirmDeleteAccount
window.changePassword = changePassword
window.saveNotificationSettings = saveNotificationSettings