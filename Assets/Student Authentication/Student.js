import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'https://vzrolreickfylygagmlg.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6cm9scmVpY2tmeWx5Z2FnbWxnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwMTMxOTAsImV4cCI6MjA5MjU4OTE5MH0.O63_YaRF0hRtSCMJRRRfhwtpNMgOE8eugnR0jRuEAv8'
const supabase = createClient(supabaseUrl, supabaseKey)

async function handleSignUp(email, password, fullName, studentId) {
    const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
            data: {
                full_name: fullName,
                student_id: studentId,
            },
        },
    })

    if (error) {
        console.error('Error signing up:', error.message)
        return
    }

    console.log('User created successfully:', data.user)
}
//error function
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
    errorDiv.innerHTML = `<span>⚠️</span> ${message}`
    parentField.appendChild(errorDiv)
    
    setTimeout(() => {
        if (errorDiv.parentElement) errorDiv.remove()
        if (wrap) wrap.classList.remove('error')
    }, 3000)
}
//Sucess message function
function showSuccess(inputElement, message) {
    if (!inputElement) return
    const parentField = inputElement.closest('.field')
    if (!parentField) return
    
    const existingSuccess = parentField.querySelector('.success-message')
    if (existingSuccess) existingSuccess.remove()
    
    const successDiv = document.createElement('div')
    successDiv.className = 'success-message'
    successDiv.innerHTML = `<span>✓</span> ${message}`
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

// Panel Switching 
window.showTab = function(panelId) {
    document.querySelectorAll('.panel').forEach(panel => panel.classList.remove('active'))
    const targetPanel = document.getElementById(panelId)
    if (targetPanel) targetPanel.classList.add('active')
}

// Password Toggle
window.togglePw = function(inputId, btn) {
    const input = document.getElementById(inputId)
    if (!input) return
    const isText = input.type === 'text'
    input.type = isText ? 'password' : 'text'
    if (btn) {
        btn.innerHTML = isText ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>'
    }
}

//  Student Signup 
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
        signupBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Creating account...'
    }

    try {
        const { data: existingStudent, error: checkError } = await supabase
            .from('students')
            .select('email')
            .eq('email', email)
            .maybeSingle()

        if (checkError) {
            console.warn('Check error:', checkError)
        }

        if (existingStudent) {
            showError(emailInput, 'Student with this email already exists')
            return
        }
        
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

        // Insert into students table
        const { error: insertError } = await supabase
            .from('students')
            .insert([{
                id: studentId,
                auth_id: authData.user?.id,
                name: name,
                email: email,
                status: 'active',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }])

        if (insertError) {
            console.warn('Student table insert warning:', insertError)
        }

        showSuccess(emailInput, 'Account created successfully! You can now login.')
        
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

// Track email attempts in localStorage
const EMAIL_ATTEMPTS_KEY = 'email_attempts';

function canRequestOTP(email) {
    const attempts = JSON.parse(localStorage.getItem(EMAIL_ATTEMPTS_KEY) || '{}');
    const now = Date.now();
    const userAttempts = attempts[email] || [];
    
    // Filter attempts from last hour
    const recentAttempts = userAttempts.filter(t => now - t < 60 * 60 * 1000);
    
    if (recentAttempts.length >= 5) {
        const oldestAttempt = Math.min(...recentAttempts);
        const waitMinutes = Math.ceil((60 - ((now - oldestAttempt) / 1000 / 60)));
        showAlert(`Rate limit exceeded. Please wait ${waitMinutes} minutes.`, 'error');
        return false;
    }
    return true;
}

function recordOTPRequest(email) {
    const attempts = JSON.parse(localStorage.getItem(EMAIL_ATTEMPTS_KEY) || '{}');
    const now = Date.now();
    attempts[email] = attempts[email] || [];
    attempts[email].push(now);
    localStorage.setItem(EMAIL_ATTEMPTS_KEY, JSON.stringify(attempts));
}

async function handleSignIn(email, password) {
    if (!canRequestOTP(email)) return;
    
    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
    });
    
    if (error) {
        if (error.message.includes('rate limit')) {
            showAlert('Too many attempts. Please try again in 1 hour.', 'error');
            recordOTPRequest(email);
        }
        return;
    }
    
    // Success - store student session
    localStorage.setItem('currentStudent', JSON.stringify({
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name || 'Student'
    }));
    
    window.location.href = '/Assets/Student Dashboard/stud.html';
}

// ========== Student Login ==========
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
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Signing in...'
    }

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        })

        if (error) throw error

        // Fetch student data from students table
        const { data: studentData, error: studentError } = await supabase
            .from('students')
            .select('*')
            .eq('email', email)
            .maybeSingle()

        if (studentError) {
            console.warn('Could not fetch student details:', studentError)
        }

        // Store user session with proper student_id for filtering
        localStorage.setItem('currentStudent', JSON.stringify({
            id: data.user.id,
            email: data.user.email,
            name: studentData?.name || email.split('@')[0],
            studentId: studentData?.student_id_number || studentData?.id,
            student_id_number: studentData?.student_id_number,
            role: 'student',
            auth_id: data.user.id
        }))

        // Handle remember me
        const rememberMe = document.getElementById('rememberMe')
        if (rememberMe && rememberMe.checked) {
            localStorage.setItem('rememberedEmail', email)
        } else {
            localStorage.removeItem('rememberedEmail')
        }

        // Redirect to student dashboard
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

// ========== Get Current Student ==========
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

// ========== Get Student's Own Reports (ONLY THEIR DATA) ==========
window.getStudentReports = async function() {
    const student = window.getCurrentStudent()
    if (!student) return []
    
    // Query reports using student_id_number or email
    const { data, error } = await supabase
        .from('reports')
        .select('*')
        .or(`student_id_number.eq.${student.studentId},student_id_number.eq.${student.student_id_number},student_email.eq.${student.email}`)
        .order('created_at', { ascending: false })
    
    if (error) {
        console.error('Error fetching student reports:', error)
        return []
    }
    
    return data
}

// ========== Get Student's Own Penalties (ONLY THEIR DATA) ==========
window.getStudentPenalties = async function() {
    const student = window.getCurrentStudent()
    if (!student) return []
    
    // Query penalties using student_id_number
    const { data, error } = await supabase
        .from('penalties')
        .select('*')
        .eq('student_id_number', student.studentId || student.student_id_number)
        .order('created_at', { ascending: false })
    
    if (error) {
        console.error('Error fetching student penalties:', error)
        return []
    }
    
    return data
}

// ========== Get Student's Own Stats ==========
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
        inProgressPenalties: penalties.filter(p => p.status === 'in-progress').length,
        totalHours: penalties.reduce((sum, p) => sum + (parseInt(p.hours) || 0), 0)
    }
}

// ========== Submit Report (Student's Own Data) ==========
window.submitStudentReport = async function(reportData) {
    const student = window.getCurrentStudent()
    if (!student) {
        showNotification('Please login to submit a report', 'error')
        return null
    }
    
    const { data, error } = await supabase
        .from('reports')
        .insert([{
            student_id_number: student.studentId || student.student_id_number,
            student_email: student.email,
            student_name: student.name,
            title: reportData.title,
            location: reportData.location,
            category: reportData.category,
            priority: reportData.priority,
            description: reportData.description,
            image_url: reportData.image_url,
            is_anonymous: reportData.is_anonymous || false,
            status: 'pending',
            created_at: new Date().toISOString()
        }])
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

// ========== Student Logout ==========
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

// ========== Check if Logged In ==========
window.isStudentLoggedIn = function() {
    return window.getCurrentStudent() !== null
}

// ========== Require Auth for Protected Pages ==========
window.requireAuth = function() {
    if (!window.isStudentLoggedIn()) {
        window.location.href = '/Assets/Student Authentication/Student.html'
        return false
    }
    return true
}

// ========== Initialize Student Dashboard (Only Student's Data) ==========
window.initStudentDashboard = async function() {
    // Check authentication
    if (!window.requireAuth()) return
    
    const student = window.getCurrentStudent()
    const stats = await window.getStudentStats()
    const reports = await window.getStudentReports()
    const penalties = await window.getStudentPenalties()
    
    // Update welcome message
    const welcomeEl = document.getElementById('studentName')
    if (welcomeEl) {
        welcomeEl.textContent = student?.name || 'Student'
    }
    
    // Update stats if stats container exists
    const statsContainer = document.getElementById('studentStats')
    if (statsContainer) {
        statsContainer.innerHTML = `
            <div class="stat-card">
                <div class="stat-number">${stats.totalReports}</div>
                <div class="stat-label">My Reports</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${stats.pendingReports}</div>
                <div class="stat-label">Pending</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${stats.resolvedReports}</div>
                <div class="stat-label">Resolved</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${stats.totalPenalties}</div>
                <div class="stat-label">Penalties</div>
            </div>
        `
    }
    
    // Update reports table (only student's own reports)
    const reportsTable = document.getElementById('myReportsTable')
    if (reportsTable && reports.length > 0) {
        reportsTable.innerHTML = reports.map(report => `
            <td>
                <td>${new Date(report.created_at).toLocaleDateString()}</td>
                <td>${escapeHtml(report.title)}</td>
                <td>${escapeHtml(report.location)}</td>
                <td><span class="status-badge status-${report.status}">${report.status}</span></td>
            </tr>
        `).join('')
    }
    
    // Update penalties table (only student's own penalties)
    const penaltiesTable = document.getElementById('myPenaltiesTable')
    if (penaltiesTable && penalties.length > 0) {
        penaltiesTable.innerHTML = penalties.map(penalty => `
            <tr>
                <td>${new Date(penalty.created_at).toLocaleDateString()}</td>
                <td>${escapeHtml(penalty.violation)}</td>
                <td>${penalty.hours} hours</td>
                <td>${escapeHtml(penalty.service_type)}</td>
                <td>${new Date(penalty.deadline).toLocaleDateString()}</td>
                <td><span class="status-badge status-${penalty.status}">${penalty.status}</span></td>
            </tr>
        `).join('')
    }
    
    console.log('Dashboard initialized for student:', student?.name)
}

// Helper function for escapeHtml
function escapeHtml(text) {
    if (!text) return ''
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
}

function showNotification(message, type) {
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
        animation: slideIn 0.3s ease;
    `
    document.body.appendChild(notification)
    setTimeout(() => notification.remove(), 3000)
}

// ========== DOM Event Listeners ==========
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded - Connected to Supabase:', supabaseUrl)
    
    // Clear errors when user starts typing
    document.querySelectorAll('.input-wrap input').forEach(input => {
        input.addEventListener('input', function() {
            clearError(this)
        })
    })
    
    // Load remembered email
    const rememberedEmail = localStorage.getItem('rememberedEmail')
    if (rememberedEmail) {
        const emailInput = document.getElementById('student-email')
        if (emailInput) emailInput.value = rememberedEmail
        const rememberCheckbox = document.getElementById('rememberMe')
        if (rememberCheckbox) rememberCheckbox.checked = true
    }
    
    // Enter key support for login
    const studentEmail = document.getElementById('student-email')
    const studentPassword = document.getElementById('student-password')
    
    if (studentEmail) {
        studentEmail.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault()
                if (studentPassword) studentPassword.focus()
            }
        })
    }
    
    if (studentPassword) {
        studentPassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault()
                handleStudentLogin()
            }
        })
    }
    
    // Enter key support for signup
    const signupFields = ['signup-name', 'signup-studentid', 'signup-email', 'signup-password', 'signup-confirm']
    signupFields.forEach((id, index) => {
        const input = document.getElementById(id)
        if (input) {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault()
                    if (index === signupFields.length - 1) {
                        handleStudentSignup()
                    } else {
                        const nextInput = document.getElementById(signupFields[index + 1])
                        if (nextInput) nextInput.focus()
                    }
                }
            })
        }
    })
    
    // Button click handlers
    const loginBtn = document.getElementById('loginBtn')
    const signupBtn = document.getElementById('signupBtn')
    const showSignupLink = document.getElementById('showSignupLink')
    const showLoginLink = document.getElementById('showLoginLink')
    
    if (loginBtn) loginBtn.addEventListener('click', handleStudentLogin)
    if (signupBtn) signupBtn.addEventListener('click', handleStudentSignup)
    if (showSignupLink) showSignupLink.addEventListener('click', () => window.showTab('student-signup'))
    if (showLoginLink) showLoginLink.addEventListener('click', () => window.showTab('student-login'))
    
    // Auto-initialize dashboard if on dashboard page
    if (window.location.pathname.includes('stud.html') || window.location.pathname.includes('Student Dashboard')) {
        window.initStudentDashboard()
    }
})

// ========== Export Functions for Global Use ==========
window.handleStudentLogin = handleStudentLogin
window.handleStudentSignup = handleStudentSignup
window.showTab = window.showTab
window.togglePw = window.togglePw
window.getCurrentStudent = window.getCurrentStudent
window.studentLogout = window.studentLogout
window.isStudentLoggedIn = window.isStudentLoggedIn
window.requireAuth = window.requireAuth
window.getStudentReports = window.getStudentReports
window.getStudentPenalties = window.getStudentPenalties
window.getStudentStats = window.getStudentStats
window.submitStudentReport = window.submitStudentReport
window.initStudentDashboard = window.initStudentDashboard