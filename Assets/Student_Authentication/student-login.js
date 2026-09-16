import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

const studentLoginId = document.getElementById('student-login-id')
const studentPassword = document.getElementById('student-password')
const loginBtn = document.getElementById('loginBtn')
const rememberMe = document.getElementById('rememberMe')
const showSignupLink = document.getElementById('showSignupLink')
const showLoginLink = document.getElementById('showLoginLink')
const studentLoginPanel = document.getElementById('student-login')
const studentSignupPanel = document.getElementById('student-signup')

if (localStorage.getItem('rememberedStudentId')) {
    studentLoginId.value = localStorage.getItem('rememberedStudentId')
    rememberMe.checked = true
}

if (localStorage.getItem('currentStudent')) {
    window.location.href = '/Assets/Student_Dashboard/studentDashboard.html'
}

async function loginStudent(studentId, password) {
    try {
        loginBtn.disabled = true
        loginBtn.textContent = 'Logging in...'

        console.log('Searching for student ID:', studentId)

        const { data: studentData, error: studentError } = await supabase
            .from('students')
            .select('*')
            .eq('student_id_number', studentId)
            .maybeSingle()

        if (studentError) {
            console.error('Supabase error:', studentError)
            throw new Error('Database error: ' + studentError.message)
        }

        if (!studentData) {
            console.log('No student found with ID:', studentId)
            throw new Error('Invalid Student ID or password')
        }

        console.log('Student found:', studentData)
        console.log('Student ID from DB:', studentData.student_id_number)

        if (studentData.password !== password) {
            throw new Error('Invalid Student ID or password')
        }

        if (studentData.status === 'inactive' || studentData.status === 'suspended') {
            throw new Error('Your account is inactive. Please contact the administrator.')
        }

        await supabase
            .from('students')
            .update({ last_login: new Date().toISOString() })
            .eq('student_id_number', studentId)

        const studentInfo = {
            id: studentData.id,
            student_id_number: studentData.student_id_number,
            email: studentData.email,
            name: studentData.name,
            course: studentData.course || '',
            year_level: studentData.year_level || '',
            status: studentData.status || 'active',
            role: 'student'
        }

        console.log('Storing student info:', studentInfo)

        localStorage.setItem('currentStudent', JSON.stringify(studentInfo))

        if (rememberMe.checked) {
            localStorage.setItem('rememberedStudentId', studentId)
        } else {
            localStorage.removeItem('rememberedStudentId')
        }

        window.location.href = '/Assets/Student_Dashboard/studentDashboard.html'

    } catch (error) {
        console.error('Login error:', error)
        alert(error.message)
        loginBtn.disabled = false
        loginBtn.textContent = 'Login'
    }
}

async function signupStudent(name, email, password, confirmPassword, studentId) {
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

    if (!studentId) {
        alert('Please enter your Student ID')
        return
    }

    if (!/^\d{8}$/.test(studentId)) {
        alert('Student ID must be exactly 8 digits (e.g., 26123456)')
        return
    }

    try {
        const signupBtn = document.getElementById('signupBtn')
        signupBtn.disabled = true
        signupBtn.textContent = 'Creating account...'

        const { data: existingId } = await supabase
            .from('students')
            .select('student_id_number')
            .eq('student_id_number', studentId)
            .maybeSingle()

        if (existingId) {
            throw new Error('Student ID already registered')
        }

        const { data: existingEmail } = await supabase
            .from('students')
            .select('email')
            .eq('email', email)
            .maybeSingle()

        if (existingEmail) {
            throw new Error('Email already registered')
        }

        const { error: insertError } = await supabase
            .from('students')
            .insert([{
                student_id_number: studentId,
                name: name,
                email: email,
                password: password,
                status: 'active',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }])

        if (insertError) {
            console.error('Insert error:', insertError)
            throw new Error('Failed to create account. Please try again.')
        }

        alert('Account created successfully! You can now login with your Student ID.')

        studentSignupPanel.classList.remove('active')
        studentLoginPanel.classList.add('active')
        document.getElementById('student-login-id').value = studentId

        document.getElementById('signup-student-id').value = ''
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

loginBtn.addEventListener('click', () => {
    const studentId = studentLoginId.value.trim()
    const password = studentPassword.value

    console.log('Login button clicked. ID:', studentId)

    if (!studentId || !password) {
        alert('Please enter both Student ID and password')
        return
    }

    if (!/^\d{8}$/.test(studentId)) {
        alert('Student ID must be exactly 8 digits (e.g., 26123456)')
        return
    }

    loginStudent(studentId, password)
})

studentPassword.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        loginBtn.click()
    }
})

studentLoginId.addEventListener('keypress', (e) => {
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
    const studentId = document.getElementById('signup-student-id').value.trim()
    const name = document.getElementById('signup-name').value.trim()
    const email = document.getElementById('signup-email').value.trim()
    const password = document.getElementById('signup-password').value
    const confirmPassword = document.getElementById('signup-confirm').value

    if (!studentId || !name || !email || !password || !confirmPassword) {
        alert('Please fill in all fields')
        return
    }

    signupStudent(name, email, password, confirmPassword, studentId)
})

window.togglePw = function (inputId, button) {
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