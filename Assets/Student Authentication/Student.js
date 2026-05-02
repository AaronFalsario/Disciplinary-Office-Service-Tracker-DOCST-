import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'https://vzrolreickfylygagmlg.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6cm9scmVpY2tmeWx5Z2FnbWxnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwMTMxOTAsImV4cCI6MjA5MjU4OTE5MH0.O63_YaRF0hRtSCMJRRRfhwtpNMgOE8eugnR0jRuEAv8'
const supabase = createClient(supabaseUrl, supabaseKey)

// ============ ADMIN FUNCTIONS ============

window.getCurrentAdmin = function() {
    const stored = localStorage.getItem('currentAdmin')
    if (stored) {
        try {
            return JSON.parse(stored)
        } catch (e) {
            return null
        }
    }
    return null
}

async function handleAdminLogin(email, password) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        })
        if (error) throw error

        const { data: adminData } = await supabase
            .from('admins')
            .select('*')
            .eq('email', email)
            .maybeSingle()

        localStorage.setItem('currentAdmin', JSON.stringify({
            id: data.user.id,
            email: data.user.email,
            name: adminData?.name || email.split('@')[0],
            role: 'admin'
        }))

        window.location.href = '/Assets/Admin dashboard/admin.html'
        return { success: true }
    } catch (error) {
        console.error('Admin login error:', error)
        return { success: false, message: error.message }
    }
}

window.adminLogout = async function() {
    try {
        await supabase.auth.signOut()
        localStorage.removeItem('currentAdmin')
        localStorage.removeItem('currentStudent')
        window.location.href = '/index.html'
    } catch (error) {
        console.error('Logout error:', error)
    }
}

// ============ STUDENT SIGNUP - COMPLETELY REWRITTEN ============

async function handleStudentSignup() {
    console.log('Signup function called')
    
    const nameInput = document.getElementById('signup-name')
    const studentIdInput = document.getElementById('signup-studentid')
    const emailInput = document.getElementById('signup-email')
    const passwordInput = document.getElementById('signup-password')
    const confirmInput = document.getElementById('signup-confirm')
    
    const name = nameInput?.value.trim()
    const studentId = studentIdInput?.value.trim()
    const email = emailInput?.value.trim()
    const password = passwordInput?.value
    const confirmPassword = confirmInput?.value

    // Validation
    if (!name) { 
        showError(nameInput, 'Full name is required'); 
        return 
    }
    if (!studentId) { 
        showError(studentIdInput, 'Student ID is required'); 
        return 
    }
    if (!email) { 
        showError(emailInput, 'Email is required'); 
        return 
    }
    if (!email.endsWith('@gordoncollege.edu.ph')) {
        showError(emailInput, 'Must use @gordoncollege.edu.ph email')
        return
    }
    if (!password) { 
        showError(passwordInput, 'Password is required'); 
        return 
    }
    if (password.length < 6) {
        showError(passwordInput, 'Password must be at least 6 characters')
        return
    }
    if (password !== confirmPassword) {
        showError(confirmInput, 'Passwords do not match')
        return
    }

    const signupBtn = document.getElementById('signupBtn')
    if (signupBtn) {
        signupBtn.disabled = true
        signupBtn.innerHTML = 'Creating account...'
    }

    try {
        // Check if student ID already exists (using 'id' column)
        const { data: existingId } = await supabase
            .from('students')
            .select('id')
            .eq('id', studentId)
            .maybeSingle()

        if (existingId) {
            showError(studentIdInput, 'Student ID already registered')
            return
        }

        // Check if email already exists
        const { data: existingEmail } = await supabase
            .from('students')
            .select('email')
            .eq('email', email)
            .maybeSingle()

        if (existingEmail) {
            showError(emailInput, 'Email already registered')
            return
        }
        
        // Create auth user
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    full_name: name,
                    student_id: studentId,
                    role: 'student'
                }
            }
        })

        if (authError) throw authError

        // Insert into students table - USING YOUR ACTUAL COLUMNS
        const { error: insertError } = await supabase
            .from('students')
            .insert({
                id: studentId,
                auth_id: authData.user?.id,
                name: name,
                email: email,
                status: 'active',
                created_at: new Date().toISOString()
            })

        if (insertError) {
            console.error('Insert error:', insertError)
            showError(emailInput, 'Registration failed: ' + insertError.message)
            return
        }

        showSuccess(emailInput, 'Account created successfully! You can now login.')
        
        // Clear form
        if (nameInput) nameInput.value = ''
        if (studentIdInput) studentIdInput.value = ''
        if (emailInput) emailInput.value = ''
        if (passwordInput) passwordInput.value = ''
        if (confirmInput) confirmInput.value = ''
        
        setTimeout(() => {
            window.showTab('student-login')
            const studentEmail = document.getElementById('student-email')
            if (studentEmail) studentEmail.value = email
        }, 2000)

    } catch (error) {
        console.error('Signup error:', error)
        showError(emailInput, error.message || 'Signup failed. Please try again.')
    } finally {
        if (signupBtn) {
            signupBtn.disabled = false
            signupBtn.innerHTML = 'Sign Up'
        }
    }
}

// ============ STUDENT LOGIN ============

async function handleStudentLogin() {
    console.log('Login function called')
    
    const emailInput = document.getElementById('student-email')
    const passwordInput = document.getElementById('student-password')
    
    const email = emailInput?.value.trim()
    const password = passwordInput?.value

    if (!email) { 
        showError(emailInput, 'Email is required'); 
        return 
    }
    if (!password) { 
        showError(passwordInput, 'Password is required'); 
        return 
    }

    const loginBtn = document.getElementById('loginBtn')
    if (loginBtn) {
        loginBtn.disabled = true
        loginBtn.innerHTML = 'Signing in...'
    }

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        })

        if (error) throw error

        // Fetch student data
        const { data: studentData } = await supabase
            .from('students')
            .select('*')
            .eq('email', email)
            .maybeSingle()

        // Store session with correct data
        localStorage.setItem('currentStudent', JSON.stringify({
            id: studentData?.id || email.split('@')[0],
            email: email,
            name: studentData?.name || email.split('@')[0],
            studentId: studentData?.id,
            role: 'student'
        }))

        // Handle remember me
        const rememberMe = document.getElementById('rememberMe')
        if (rememberMe && rememberMe.checked) {
            localStorage.setItem('rememberedEmail', email)
        } else {
            localStorage.removeItem('rememberedEmail')
        }

        window.location.href = '/Assets/Student Dashboard/stud.html'

    } catch (error) {
        console.error('Login error:', error)
        showError(passwordInput, error.message || 'Invalid email or password')
    } finally {
        if (loginBtn) {
            loginBtn.disabled = false
            loginBtn.innerHTML = 'Login'
        }
    }
}

// ============ PENALTY FUNCTIONS ============

window.getAllPenalties = async function() {
    const { data, error } = await supabase
        .from('penalties')
        .select('*')
        .order('created_at', { ascending: false })
    
    if (error) {
        console.error('Error fetching penalties:', error)
        return []
    }
    return data
}

window.getStudentPenalties = async function() {
    const student = window.getCurrentStudent()
    if (!student) return []
    
    const { data, error } = await supabase
        .from('penalties')
        .select('*')
        .eq('student_id', student.studentId)
        .order('created_at', { ascending: false })
    
    if (error) {
        console.error('Error fetching student penalties:', error)
        return []
    }
    return data
}

window.addPenalty = async function(penaltyData) {
    const admin = window.getCurrentAdmin()
    if (!admin) {
        showNotification('Admin access required', 'error')
        return null
    }
    
    const { data, error } = await supabase
        .from('penalties')
        .insert({
            student_id: penaltyData.student_id,
            violation: penaltyData.violation,
            hours: penaltyData.hours,
            service_type: penaltyData.service_type,
            deadline: penaltyData.deadline,
            status: 'pending',
            assigned_by: admin.email,
            created_at: new Date().toISOString()
        })
        .select()
        .single()
    
    if (error) {
        console.error('Error adding penalty:', error)
        showNotification('Failed to add penalty', 'error')
        return null
    }
    
    showNotification('Penalty added successfully!', 'success')
    return data
}

window.updatePenaltyStatus = async function(penaltyId, status) {
    const { data, error } = await supabase
        .from('penalties')
        .update({ 
            status: status,
            updated_at: new Date().toISOString()
        })
        .eq('id', penaltyId)
        .select()
        .single()
    
    if (error) {
        console.error('Error updating penalty:', error)
        return null
    }
    return data
}

// ============ REPORT FUNCTIONS ============

window.getStudentReports = async function() {
    const student = window.getCurrentStudent()
    if (!student) return []
    
    const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('student_id', student.studentId)
        .order('created_at', { ascending: false })
    
    if (error) {
        console.error('Error fetching student reports:', error)
        return []
    }
    return data
}

window.getAllReports = async function() {
    const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false })
    
    if (error) {
        console.error('Error fetching reports:', error)
        return []
    }
    return data
}

window.submitStudentReport = async function(reportData) {
    const student = window.getCurrentStudent()
    if (!student) {
        showNotification('Please login to submit a report', 'error')
        return null
    }
    
    const { data, error } = await supabase
        .from('reports')
        .insert({
            student_id: student.studentId,
            student_email: student.email,
            student_name: student.name,
            title: reportData.title,
            location: reportData.location,
            category: reportData.category,
            priority: reportData.priority || 'medium',
            description: reportData.description,
            image_url: reportData.image_url || null,
            is_anonymous: reportData.is_anonymous || false,
            status: 'pending',
            created_at: new Date().toISOString()
        })
        .select()
        .single()
    
    if (error) {
        console.error('Error submitting report:', error)
        showNotification('Failed to submit report', 'error')
        return null
    }
    
    showNotification('Report submitted successfully!', 'success')
    return data
}

// ============ HELPER FUNCTIONS ============

window.getCurrentStudent = function() {
    const stored = localStorage.getItem('currentStudent')
    if (stored) {
        try {
            return JSON.parse(stored)
        } catch (e) {
            return null
        }
    }
    return null
}

window.isStudentLoggedIn = function() {
    return window.getCurrentStudent() !== null
}

window.isAdminLoggedIn = function() {
    return window.getCurrentAdmin() !== null
}

window.requireAuth = function() {
    if (!window.isStudentLoggedIn() && !window.isAdminLoggedIn()) {
        window.location.href = '/index.html'
        return false
    }
    return true
}

window.studentLogout = async function() {
    try {
        await supabase.auth.signOut()
        localStorage.removeItem('currentStudent')
        localStorage.removeItem('rememberedEmail')
        window.location.href = '/index.html'
    } catch (error) {
        console.error('Logout error:', error)
    }
}

window.getStudentStats = async function() {
    const reports = await window.getStudentReports()
    const penalties = await window.getStudentPenalties()
    
    return {
        totalReports: reports.length,
        pendingReports: reports.filter(r => r.status === 'pending').length,
        resolvedReports: reports.filter(r => r.status === 'resolved').length,
        totalPenalties: penalties.length,
        pendingPenalties: penalties.filter(p => p.status === 'pending').length,
        completedPenalties: penalties.filter(p => p.status === 'completed').length,
        totalHours: penalties.reduce((sum, p) => sum + (parseInt(p.hours) || 0), 0)
    }
}

// ============ UI HELPER FUNCTIONS ============

function showError(inputElement, message) {
    if (!inputElement) return
    const parentField = inputElement.closest('.field')
    if (!parentField) return
    
    const existingError = parentField.querySelector('.error-message')
    if (existingError) existingError.remove()
    
    const wrap = inputElement.closest('.input-wrap')
    if (wrap) wrap.classList.add('error')
    
    const errorDiv = document.createElement('div')
    errorDiv.className = 'error-message'
    errorDiv.innerHTML = `⚠️ ${message}`
    parentField.appendChild(errorDiv)
    
    setTimeout(() => {
        if (errorDiv.parentElement) errorDiv.remove()
        if (wrap) wrap.classList.remove('error')
    }, 3000)
}

function showSuccess(inputElement, message) {
    if (!inputElement) return
    const parentField = inputElement.closest('.field')
    if (!parentField) return
    
    const existingSuccess = parentField.querySelector('.success-message')
    if (existingSuccess) existingSuccess.remove()
    
    const successDiv = document.createElement('div')
    successDiv.className = 'success-message'
    successDiv.innerHTML = `✓ ${message}`
    parentField.appendChild(successDiv)
    
    setTimeout(() => {
        if (successDiv.parentElement) successDiv.remove()
    }, 3000)
}

function clearError(inputElement) {
    if (!inputElement) return
    const parentField = inputElement.closest('.field')
    if (parentField) {
        const error = parentField.querySelector('.error-message, .success-message')
        if (error) error.remove()
    }
    const wrap = inputElement.closest('.input-wrap')
    if (wrap) wrap.classList.remove('error')
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div')
    notification.textContent = message
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 12px 20px;
        background: ${type === 'success' ? '#10B981' : '#EF4444'};
        color: white;
        border-radius: 10px;
        font-size: 14px;
        z-index: 10000;
    `
    document.body.appendChild(notification)
    setTimeout(() => notification.remove(), 3000)
}

window.showTab = function(panelId) {
    document.querySelectorAll('.panel').forEach(panel => panel.classList.remove('active'))
    const targetPanel = document.getElementById(panelId)
    if (targetPanel) targetPanel.classList.add('active')
}

window.togglePw = function(inputId, btn) {
    const input = document.getElementById(inputId)
    if (!input) return
    const isText = input.type === 'text'
    input.type = isText ? 'password' : 'text'
    if (btn) {
        btn.innerHTML = isText ? '👁️' : '👁️‍🗨️'
    }
}

// ============ DASHBOARD INITIALIZATION ============

window.initStudentDashboard = async function() {
    const student = window.getCurrentStudent()
    if (!student) return
    
    const stats = await window.getStudentStats()
    
    // Update welcome message with NAME, not ID
    const welcomeEl = document.querySelector('.greeting, .welcome-message, #studentName')
    if (welcomeEl) {
        welcomeEl.textContent = `Good afternoon, ${student.name}`
    }
    
    console.log('Dashboard initialized for student:', student.name)
}

window.initAdminDashboard = async function() {
    const admin = window.getCurrentAdmin()
    if (!admin) return
    
    const welcomeEl = document.getElementById('adminName')
    if (welcomeEl) {
        welcomeEl.textContent = admin?.name || 'Administrator'
    }
    
    console.log('Admin dashboard initialized:', admin?.name)
}

// ============ DOM EVENT LISTENERS ============

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded - Connected to Supabase')
    
    // Button click handlers
    const loginBtn = document.getElementById('loginBtn')
    const signupBtn = document.getElementById('signupBtn')
    const showSignupLink = document.getElementById('showSignupLink')
    const showLoginLink = document.getElementById('showLoginLink')
    
    if (loginBtn) loginBtn.addEventListener('click', handleStudentLogin)
    if (signupBtn) signupBtn.addEventListener('click', handleStudentSignup)
    if (showSignupLink) showSignupLink.addEventListener('click', () => window.showTab('student-signup'))
    if (showLoginLink) showLoginLink.addEventListener('click', () => window.showTab('student-login'))
    
    // Auto-initialize dashboard
    if (window.location.pathname.includes('stud.html')) {
        window.initStudentDashboard()
    }
    if (window.location.pathname.includes('admin.html')) {
        window.initAdminDashboard()
    }
})

// ============ EXPORTS ============
window.handleStudentLogin = handleStudentLogin
window.handleStudentSignup = handleStudentSignup
window.handleAdminLogin = handleAdminLogin
window.adminLogout = adminLogout
window.studentLogout = studentLogout
window.getCurrentStudent = getCurrentStudent
window.getCurrentAdmin = getCurrentAdmin
window.getStudentPenalties = getStudentPenalties
window.getStudentStats = getStudentStats
window.submitStudentReport = submitStudentReport
window.getAllPenalties = getAllPenalties
window.addPenalty = addPenalty
window.initStudentDashboard = initStudentDashboard
window.initAdminDashboard = initAdminDashboard