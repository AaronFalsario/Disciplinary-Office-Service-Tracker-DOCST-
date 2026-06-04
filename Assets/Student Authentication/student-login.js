import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

// DOM Elements
const studentEmail = document.getElementById('student-email')
const studentPassword = document.getElementById('student-password')
const loginBtn = document.getElementById('loginBtn')
const rememberMe = document.getElementById('rememberMe')
const showSignupLink = document.getElementById('showSignupLink')
const showLoginLink = document.getElementById('showLoginLink')
const studentLoginPanel = document.getElementById('student-login')
const studentSignupPanel = document.getElementById('student-signup')

// Check for remembered email
if (localStorage.getItem('rememberedEmail')) {
    studentEmail.value = localStorage.getItem('rememberedEmail')
    rememberMe.checked = true
}

// Check if already logged in
if (localStorage.getItem('currentStudent')) {
    window.location.href = '/Assets/Student_Dashboard/stud.html'
}

// Login function
async function loginStudent(email, password) {
    try {
        loginBtn.disabled = true
        loginBtn.textContent = 'Logging in...'
        
        const { data: studentData, error: studentError } = await supabase
            .from('students')
            .select('*')
            .eq('email', email)
            .single()

        if (studentError || !studentData) {
            throw new Error('Invalid email or password')
        }
        
        if (studentData.password !== password) {
            throw new Error('Invalid email or password')
        }
        
        if (studentData.status === 'inactive') {
            throw new Error('Your account is inactive. Please contact the administrator.')
        }
        
        // Update last login
        await supabase
            .from('students')
            .update({ last_login: new Date().toISOString() })
            .eq('email', email)
        
        // Store student info
        const studentInfo = {
            id: studentData.id,
            email: studentData.email,
            name: studentData.name,
            role: 'student'
        }

        localStorage.setItem('currentStudent', JSON.stringify(studentInfo))
        
        if (rememberMe.checked) {
            localStorage.setItem('rememberedEmail', email)
        } else {
            localStorage.removeItem('rememberedEmail')
        }
        
        window.location.href = '/Assets/Student_Dashboard/stud.html' 
        
    } catch (error) {
        alert(error.message)
        loginBtn.disabled = false
        loginBtn.textContent = 'Login'
    }
}

// Signup function
async function signupStudent(name, email, password, confirmPassword) {
    if (password !== confirmPassword) {
        alert('Passwords do not match!')
        return
    }
    
    if (password.length < 6) {
        alert('Password must be at least 6 characters')
        return
    }
    
    if (!email || !email.includes('@')) {
        alert('Please enter a valid email address')
        return
    }
    
    if (!name || name.length < 2) {
        alert('Please enter your full name')
        return
    }
    
    try {
        const signupBtn = document.getElementById('signupBtn')
        signupBtn.disabled = true
        signupBtn.textContent = 'Creating account...'
        
        const { data: existing } = await supabase
            .from('students')
            .select('email')
            .eq('email', email)
            .single()
        
        if (existing) {
            throw new Error('Email already registered')
        }
        
        const { error: insertError } = await supabase
            .from('students')
            .insert([{
                email: email,
                name: name,
                password: password,
                status: 'active',
                created_at: new Date().toISOString()
            }])
        
        if (insertError) throw insertError
        
        alert('Account created successfully! You can now login.')
        
        studentSignupPanel.classList.remove('active')
        studentLoginPanel.classList.add('active')
        
        document.getElementById('student-email').value = email
        
        document.getElementById('signup-name').value = ''
        document.getElementById('signup-email').value = ''
        document.getElementById('signup-password').value = ''
        document.getElementById('signup-confirm').value = ''
        
    } catch (error) {
        alert(error.message)
    } finally {
        const signupBtn = document.getElementById('signupBtn')
        signupBtn.disabled = false
        signupBtn.textContent = 'Sign Up'
    }
}

// Event Listeners
loginBtn.addEventListener('click', () => {
    const email = studentEmail.value.trim()
    const password = studentPassword.value
    
    if (!email || !password) {
        alert('Please enter both email and password')
        return
    }
    
    loginStudent(email, password)
})

studentPassword.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        loginBtn.click()
    }
})

showSignupLink.addEventListener('click', () => {
    studentLoginPanel.classList.remove('active')
    studentSignupPanel.classList.add('active')
})

showLoginLink.addEventListener('click', () => {
    studentSignupPanel.classList.remove('active')
    studentLoginPanel.classList.add('active')
})

document.getElementById('signupBtn').addEventListener('click', () => {
    const name = document.getElementById('signup-name').value.trim()
    const email = document.getElementById('signup-email').value.trim()
    const password = document.getElementById('signup-password').value
    const confirmPassword = document.getElementById('signup-confirm').value
    
    if (!name || !email || !password || !confirmPassword) {
        alert('Please fill in all fields')
        return
    }
    
    signupStudent(name, email, password, confirmPassword)
})

window.togglePw = function(inputId, button) {
    const input = document.getElementById(inputId)
    const icon = button.querySelector('i')
    
    if (input.type === 'password') {
        input.type = 'text'
        icon.classList.remove('fa-eye')
        icon.classList.add('fa-eye-slash')
    } else {
        input.type = 'password'
        icon.classList.remove('fa-eye-slash')
        icon.classList.add('fa-eye')
    }
}