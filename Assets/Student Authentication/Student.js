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

// ========== Panel Switching ==========
window.showTab = function(panelId) {
    document.querySelectorAll('.panel').forEach(panel => panel.classList.remove('active'))
    const targetPanel = document.getElementById(panelId)
    if (targetPanel) targetPanel.classList.add('active')
}

// ========== Password Toggle ==========
window.togglePw = function(inputId, btn) {
    const input = document.getElementById(inputId)
    if (!input) return
    const isText = input.type === 'text'
    input.type = isText ? 'password' : 'text'
    if (btn) {
        btn.innerHTML = isText ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>'
    }
}

// ========== Student Signup ==========
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
        // Check if student already exists in students table
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

        // Create auth user in Supabase Auth
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
            // Don't throw, auth was created successfully
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

        // Store user session
        localStorage.setItem('currentStudent', JSON.stringify({
            id: data.user.id,
            email: data.user.email,
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

// ========== Student Logout ==========
window.studentLogout = async function() {
    try {
        await supabase.auth.signOut()
        localStorage.removeItem('currentStudent')
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