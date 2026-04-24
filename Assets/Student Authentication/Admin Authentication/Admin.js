import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'https://vzrolreickfylygagmlg.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6cm9scmVpY2tmeWx5Z2FnbWxnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwMTMxOTAsImV4cCI6MjA5MjU4OTE5MH0.O63_YaRF0hRtSCMJRRRfhwtpNMgOE8eugnR0jRuEAv8'
const supabase = createClient(supabaseUrl, supabaseKey)


let currentAdmin = null
let countdownInterval = null
let resendCooldown = null
let attempts = 0
const maxAttempts = 3


function qs(id) {
    return document.getElementById(id)
}

function showError(inputElement, message) {
    if (!inputElement) return

    const parent = inputElement.closest('.field') || inputElement.parentElement
    if (!parent) return

    const old = parent.querySelector('.error-message')
    if (old) old.remove()

    const div = document.createElement('div')
    div.className = 'error-message'
    div.innerHTML = `⚠️ ${message}`

    parent.appendChild(div)

    setTimeout(() => {
        if (div.parentElement) div.remove()
    }, 5000)
}

function clearError(inputElement) {
    if (!inputElement) return
    const parent = inputElement.closest('.field') || inputElement.parentElement
    const old = parent?.querySelector('.error-message')
    if (old) old.remove()
}

function showToast(msg) {
    alert(msg)
}

function disable(btn, text) {
    if (!btn) return
    btn.disabled = true
    btn.innerHTML = text
}

function enable(btn, text) {
    if (!btn) return
    btn.disabled = false
    btn.innerHTML = text
}

// step switching
window.goToStep = function(step) {
    qs('step1')?.classList.remove('active')
    qs('step2')?.classList.remove('active')
    qs(`step${step}`)?.classList.add('active')
}

// see password toggle
window.togglePassword = function(inputId, btn) {
    const input = qs(inputId)
    if (!input) return

    const hidden = input.type === 'password'
    input.type = hidden ? 'text' : 'password'

    btn.innerHTML = hidden
        ? '<i class="fas fa-eye-slash"></i>'
        : '<i class="fas fa-eye"></i>'
}

// placeholders sa otp 
function setupOTPInputs() {
    const inputs = document.querySelectorAll('.otp-input')

    inputs.forEach((input, index) => {

        input.addEventListener('input', e => {
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 1)

            if (e.target.value && index < inputs.length - 1) {
                inputs[index + 1].focus()
            }
        })

        input.addEventListener('keydown', e => {
            if (e.key === 'Backspace' && !input.value && index > 0) {
                inputs[index - 1].focus()
            }
        })

    })
}

// duration ng existing OTP
function startCountdown(seconds = 300) {
    clearInterval(countdownInterval)

    const label = qs('countdown')

    countdownInterval = setInterval(() => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60

        if (label) {
            label.textContent =
                `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
        }

        if (seconds <= 0) {
            clearInterval(countdownInterval)
            if (label) label.textContent = 'EXPIRED'
        }

        seconds--
    }, 1000)
}

// timer ng resend otp
function startResendCooldown(seconds = 30) {
    clearInterval(resendCooldown)

    const btn = qs('resendBtn')
    if (!btn) return

    btn.disabled = true

    resendCooldown = setInterval(() => {

        btn.innerHTML = `Resend OTP (${seconds})`

        if (seconds <= 0) {
            clearInterval(resendCooldown)
            btn.disabled = false
            btn.innerHTML = 'Resend OTP'
        }

        seconds--
    }, 1000)
}

// step 1  ng otp verification
async function handleLogin() {

    const usernameInput = qs('admin-username')
    const passwordInput = qs('admin-password')
    const loginBtn = qs('loginBtn')

    const username = usernameInput.value.trim()
    const password = passwordInput.value.trim()

    clearError(usernameInput)
    clearError(passwordInput)

    if (!username) {
        showError(usernameInput, 'Enter Admin ID or Email')
        return
    }

    if (!password) {
        showError(passwordInput, 'Enter Password')
        return
    }

    disable(loginBtn, 'Checking...')

    try {

        const { data: admin, error } = await supabase
            .from('admins')
            .select('*')
            .or(`admin_id.ilike.${username},email.ilike.${username}`)
            .maybeSingle()

        console.log(admin, error)

        if (error || !admin) {
            showError(usernameInput, 'Admin not found')
            enable(loginBtn, 'Continue')
            return
        }

        if (admin.password_hash !== password) {
            showError(passwordInput, 'Wrong password')
            enable(loginBtn, 'Continue')
            return
        }

        currentAdmin = admin

        const { error: otpError } = await supabase.auth.signInWithOtp({
            email: admin.email,
            options: {
                shouldCreateUser: false
            }
        })

        if (otpError) {
            showError(usernameInput, 'Failed to send OTP')
            enable(loginBtn, 'Continue')
            return
        }

        document.querySelectorAll('.otp-input').forEach(i => i.value = '')

        showToast(`OTP sent to ${admin.email}`)

        goToStep(2)
        startCountdown(300)
        startResendCooldown(30)

    } catch (err) {
        console.error(err)
        showError(usernameInput, 'Login failed')
    }

    enable(loginBtn, 'Continue')
}

// 2 step verification ng otp
async function handleVerifyOTP() {

    const btn = qs('verifyBtn')
    const inputs = document.querySelectorAll('.otp-input')

    const otp = Array.from(inputs).map(i => i.value).join('')

    if (otp.length < 6) {
        showError(inputs[0], 'Enter complete OTP')
        return
    }

    disable(btn, 'Verifying...')

    try {

        const { data, error } = await supabase.auth.verifyOtp({
            email: currentAdmin.email,
            token: otp,
            type: 'email'
        })

        if (error) {

            attempts++

            if (attempts >= maxAttempts) {
                showError(inputs[0], 'Too many attempts. Login again.')
                setTimeout(() => location.reload(), 1500)
                return
            }

            showError(inputs[0], `Invalid OTP (${attempts}/3)`)
            enable(btn, 'Verify & Login')
            return
        }

        clearInterval(countdownInterval)

        await supabase
            .from('admins')
            .update({
                last_login: new Date().toISOString()
            })
            .eq('id', currentAdmin.id)

        localStorage.setItem('currentAdmin', JSON.stringify({
            id: currentAdmin.id,
            admin_id: currentAdmin.admin_id,
            full_name: currentAdmin.full_name,
            email: currentAdmin.email,
            role: currentAdmin.role
        }))

        const remember = qs('rememberMe')

        if (remember?.checked) {
            localStorage.setItem('rememberedAdmin', currentAdmin.admin_id)
        } else {
            localStorage.removeItem('rememberedAdmin')
        }

   window.location.href = '../../Admin dashboard/Admin.html'

    } catch (err) {
        console.error(err)
        showError(inputs[0], 'OTP verification failed')
    }

    enable(btn, 'Verify & Login')
}

// re send ng otp kapag nag expire or something like that
async function resendOTP() {

    if (!currentAdmin) return

    const btn = qs('resendBtn')

    try {

        btn.disabled = true

        const { error } = await supabase.auth.signInWithOtp({
            email: currentAdmin.email,
            options: {
                shouldCreateUser: false
            }
        })

        if (error) {
            showToast('Failed to resend OTP')
            btn.disabled = false
            return
        }

        showToast('OTP resent')

        startCountdown(300)
        startResendCooldown(30)

    } catch (err) {
        console.error(err)
        btn.disabled = false
    }
}

// auth sa log in page
const saved = localStorage.getItem('currentAdmin')

if (saved && location.pathname.includes('Admin.html')) {
    location.href = '../../Admin dashboard/Admin.html'
}
// remember me admin page
const remembered = localStorage.getItem('rememberedAdmin')

if (remembered) {
    qs('admin-username').value = remembered
    qs('rememberMe').checked = true
}

// events 
qs('loginBtn')?.addEventListener('click', handleLogin)
qs('verifyBtn')?.addEventListener('click', handleVerifyOTP)
qs('resendBtn')?.addEventListener('click', resendOTP)

qs('admin-password')?.addEventListener('keypress', e => {
    if (e.key === 'Enter') handleLogin()
})

qs('admin-username')?.addEventListener('input', function() {
    clearError(this)
})

qs('admin-password')?.addEventListener('input', function() {
    clearError(this)
})

setupOTPInputs()

// exports 
window.handleLogin = handleLogin
window.handleVerifyOTP = handleVerifyOTP
window.resendOTP = resendOTP