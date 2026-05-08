import { createClient } from '@supabase/supabase-js'

// Supabase configuration
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

// Login function
async function loginStudent(email, password) {
    try {
        // Show loading state
        loginBtn.disabled = true
        loginBtn.textContent = 'Logging in...'
        
        // Sign in with Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        })
        
        if (authError) throw authError
        
        // Fetch student data from 'students' table
        const { data: studentData, error: studentError } = await supabase
            .from('students')
            .select('*')
            .eq('email', email)
            .single()

        if (studentError) throw studentError
        
        console.log('=== STUDENT DATA FROM DB ===')
        console.log('Full studentData:', studentData)
        console.log('id_number value:', studentData.id_number)
        console.log('All keys:', Object.keys(studentData))

        // Store student info for dashboard
        const studentInfo = {
            userId: authData.user.id,
            email: studentData.email,
            name: studentData.name,
            studentId: studentData.id_number || null,  // Will be null if no id_number
            role: 'student',
            course: studentData.course,
            yearLevel: studentData.year_level,
            status: studentData.status
        }

        console.log('Student info being stored:', studentInfo)
        console.log('Student ID being saved:', studentInfo.studentId)

        // Save to localStorage (ONLY ONCE)
        localStorage.setItem('currentStudent', JSON.stringify(studentInfo))
        
        // Handle remember me
        if (rememberMe.checked) {
            localStorage.setItem('rememberedEmail', email)
        } else {
            localStorage.removeItem('rememberedEmail')
        }
        
        // Redirect to student dashboard
        window.location.href = '/Assets/Student_Dashboard/stud.html' 
        
    } catch (error) {
        console.error('Login error:', error)
        alert('Login failed: ' + (error.message || 'Invalid credentials'))
        loginBtn.disabled = false
        loginBtn.textContent = 'Login'
    }
}

// Signup function
async function signupStudent(name, studentId, email, password, confirmPassword) {
    // Validation
    if (password !== confirmPassword) {
        alert('Passwords do not match!')
        return
    }
    
    if (password.length < 6) {
        alert('Password must be at least 6 characters')
        return
    }
    
    if (!email.endsWith('@gordoncollege.edu.ph')) {
        alert('Please use your @gordoncollege.edu.ph email address')
        return
    }
    
    try {
        const signupBtn = document.getElementById('signupBtn')
        signupBtn.disabled = true
        signupBtn.textContent = 'Creating account...'
        
        // Create user in Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    full_name: name,
                    student_id: studentId
                }
            }
        })
        
        if (authError) throw authError
        
        // Insert student record
        const { error: insertError } = await supabase
            .from('students')
            .insert([
                {
                    email: email,
                    name: name,
                    id_number: studentId,
                    user_id: authData.user.id
                }
            ])
        
        if (insertError) throw insertError
        
        alert('Account created successfully! Please login with your credentials.')
        
        // Switch to login panel
        studentSignupPanel.classList.remove('active')
        studentLoginPanel.classList.add('active')
        
        // Clear signup form
        document.getElementById('signup-name').value = ''
        document.getElementById('signup-studentid').value = ''
        document.getElementById('signup-email').value = ''
        document.getElementById('signup-password').value = ''
        document.getElementById('signup-confirm').value = ''
        
    } catch (error) {
        console.error('Signup error:', error)
        alert('Signup failed: ' + error.message)
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

// Enter key press
studentPassword.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        loginBtn.click()
    }
})

// Switch between login and signup
showSignupLink.addEventListener('click', () => {
    studentLoginPanel.classList.remove('active')
    studentSignupPanel.classList.add('active')
})

showLoginLink.addEventListener('click', () => {
    studentSignupPanel.classList.remove('active')
    studentLoginPanel.classList.add('active')
})

// Signup button
document.getElementById('signupBtn').addEventListener('click', () => {
    const name = document.getElementById('signup-name').value.trim()
    const studentId = document.getElementById('signup-studentid').value.trim()
    const email = document.getElementById('signup-email').value.trim()
    const password = document.getElementById('signup-password').value
    const confirmPassword = document.getElementById('signup-confirm').value
    
    if (!name || !studentId || !email || !password || !confirmPassword) {
        alert('Please fill in all fields')
        return
    }
    
    signupStudent(name, studentId, email, password, confirmPassword)
})

// Password toggle function (make it global)
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