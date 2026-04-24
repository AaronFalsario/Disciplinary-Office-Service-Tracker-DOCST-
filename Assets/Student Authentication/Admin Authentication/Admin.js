import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// Supabase Configuration
const supabaseUrl = 'https://vzrolreickfylygagmlg.supabase.co'
const supabaseKey = 'sb_publishable_l7mKNQVJ6WesiTM4GJCxQg_oXxTN3it'
const supabase = createClient(supabaseUrl, supabaseKey)

// Store current admin and OTP
let currentAdmin = null
let currentOTP = null
let otpExpiry = null
let countdownInterval = null

// Helper: Show error
function showError(inputElement, message) {
    if (!inputElement) return
    const parent = inputElement.closest('.field')
    if (!parent) return
    
    const existing = parent.querySelector('.error-message')
    if (existing) existing.remove()
    
    const errorDiv = document.createElement('div')
    errorDiv.className = 'error-message'
    errorDiv.innerHTML = `⚠️ ${message}`
    parent.appendChild(errorDiv)
    
    setTimeout(() => {
        if (errorDiv.parentElement) errorDiv.remove()
    }, 5000)
}

// Helper: Clear error
function clearError(inputElement) {
    if (!inputElement) return
    const parent = inputElement.closest('.field')
    if (parent) {
        const error = parent.querySelector('.error-message')
        if (error) error.remove()
    }
}

// Panel switching
window.goToStep = function(step) {
    document.getElementById('step1').classList.remove('active')
    document.getElementById('step2').classList.remove('active')
    document.getElementById(`step${step}`).classList.add('active')
}

// Password toggle
window.togglePassword = function(inputId, btn) {
    const input = document.getElementById(inputId)
    if (!input) return
    const isText = input.type === 'text'
    input.type = isText ? 'password' : 'text'
    btn.innerHTML = isText ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>'
}

// Generate 6-digit OTP
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString()
}

// OTP input handling
function setupOTPInputs() {
    const inputs = document.querySelectorAll('.otp-input')
    inputs.forEach((input, idx) => {
        input.addEventListener('input', (e) => {
            if (e.target.value && idx < 5) {
                inputs[idx + 1].focus()
            }
        })
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value && idx > 0) {
                inputs[idx - 1].focus()
            }
        })
    })
}

// Start countdown timer
function startCountdown() {
    if (countdownInterval) clearInterval(countdownInterval)
    let seconds = 300
    const countdownEl = document.getElementById('countdown')
    
    countdownInterval = setInterval(() => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        if (countdownEl) {
            countdownEl.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
        }
        
        if (seconds <= 0) {
            clearInterval(countdownInterval)
            if (countdownEl) {
                countdownEl.textContent = 'EXPIRED'
                countdownEl.style.color = 'var(--red)'
            }
            currentOTP = null
        }
        seconds--
    }, 1000)
}

// STEP 1: Admin Login
async function handleLogin() {
    const usernameInput = document.getElementById('admin-username')
    const passwordInput = document.getElementById('admin-password')
    
    const username = usernameInput.value.trim()
    const password = passwordInput.value
    
    clearError(usernameInput)
    clearError(passwordInput)
    
    if (!username) {
        showError(usernameInput, 'Admin ID or Email is required')
        return
    }
    if (!password) {
        showError(passwordInput, 'Password is required')
        return
    }
    
    const loginBtn = document.getElementById('loginBtn')
    loginBtn.disabled = true
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Verifying...'
    
    try {
        // Query admin from Supabase
        const { data: admin, error } = await supabase
            .from('admins')
            .select('*')
            .or(`admin_id.eq.${username},email.eq.${username}`)
            .single()
        
        if (error || !admin) {
            showError(usernameInput, 'Invalid admin credentials')
            return
        }
        
        // Verify password
        if (admin.password_hash !== password) {
            showError(passwordInput, 'Invalid password')
            return
        }
        
        if (admin.status !== 'active') {
            showError(usernameInput, 'Account is disabled')
            return
        }
        
        currentAdmin = admin
        
        // Generate and store OTP
        currentOTP = generateOTP()
        otpExpiry = Date.now() + 5 * 60 * 1000
        
        // Show OTP in console and alert (demo)
        console.log(`OTP for ${admin.email}: ${currentOTP}`)
        alert(`Demo OTP: ${currentOTP}\n\nIn production, this would be sent to ${admin.email}`)
        
        // Clear OTP inputs
        document.querySelectorAll('.otp-input').forEach(input => input.value = '')
        
        // Start countdown and go to step 2
        startCountdown()
        goToStep(2)
        
    } catch (error) {
        console.error('Login error:', error)
        showError(usernameInput, 'Login failed. Please try again.')
    } finally {
        loginBtn.disabled = false
        loginBtn.innerHTML = 'Continue <i class="fas fa-arrow-right"></i>'
    }
}

// STEP 2: Verify OTP
async function handleVerifyOTP() {
    const otpInputs = document.querySelectorAll('.otp-input')
    const enteredOTP = Array.from(otpInputs).map(input => input.value).join('')
    
    if (enteredOTP.length < 6) {
        showError(otpInputs[0], 'Please enter complete 6-digit OTP')
        return
    }
    
    if (!currentOTP || Date.now() > otpExpiry) {
        showError(otpInputs[0], 'OTP has expired. Please login again.')
        return
    }
    
    if (enteredOTP !== currentOTP) {
        showError(otpInputs[0], 'Invalid OTP. Please try again.')
        return
    }
    
    // Clear OTP and stop countdown
    currentOTP = null
    if (countdownInterval) clearInterval(countdownInterval)
    
    const verifyBtn = document.getElementById('verifyBtn')
    verifyBtn.disabled = true
    verifyBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Verifying...'
    
    try {
        // Update last login
        await supabase
            .from('admins')
            .update({ last_login: new Date().toISOString() })
            .eq('id', currentAdmin.id)
        
        // Store session
        localStorage.setItem('currentAdmin', JSON.stringify({
            id: currentAdmin.id,
            admin_id: currentAdmin.admin_id,
            full_name: currentAdmin.full_name,
            email: currentAdmin.email,
            role: currentAdmin.role
        }))
        
        // Handle remember me
        const rememberMe = document.getElementById('rememberMe')
        if (rememberMe && rememberMe.checked) {
            localStorage.setItem('rememberedAdmin', currentAdmin.admin_id)
        } else {
            localStorage.removeItem('rememberedAdmin')
        }
        
        // Redirect to admin dashboard
        window.location.href = '/Assets/Admin dashboard/AdminDashboard.html'
        
    } catch (error) {
        console.error('Verification error:', error)
        showError(otpInputs[0], 'Login failed. Please try again.')
    } finally {
        verifyBtn.disabled = false
        verifyBtn.innerHTML = 'Verify &amp; Login'
    }
}

// Clear errors on input
document.getElementById('admin-username')?.addEventListener('input', function() { clearError(this) })
document.getElementById('admin-password')?.addEventListener('input', function() { clearError(this) })

// Enter key support
document.getElementById('admin-password')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleLogin()
})

// Button click handlers
document.getElementById('loginBtn')?.addEventListener('click', handleLogin)
document.getElementById('verifyBtn')?.addEventListener('click', handleVerifyOTP)

// Initialize OTP inputs
setupOTPInputs()

// Load remembered admin
const rememberedAdmin = localStorage.getItem('rememberedAdmin')
if (rememberedAdmin) {
    const usernameInput = document.getElementById('admin-username')
    if (usernameInput) usernameInput.value = rememberedAdmin
    const rememberCheckbox = document.getElementById('rememberMe')
    if (rememberCheckbox) rememberCheckbox.checked = true
}

// Check if already logged in
const storedAdmin = localStorage.getItem('currentAdmin')
if (storedAdmin && window.location.pathname.includes('admin-login.html')) {
    window.location.href = '/Assets/Admin dashboard/AdminDashboard.html'
}

// Expose functions globally
window.handleLogin = handleLogin
window.handleVerifyOTP = handleVerifyOTP
window.togglePassword = togglePassword
window.goToStep = goToStep