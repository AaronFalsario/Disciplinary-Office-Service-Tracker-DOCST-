import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
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

function showToast(msg, type = 'info') {
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

// ============ FORGOT PASSWORD FUNCTION ============
async function handleForgotPassword() {
    const emailInput = qs('forgot-email');
    if (!emailInput) return;
    
    const email = emailInput.value.trim();
    const forgotBtn = qs('forgotPasswordBtn');
    
    // Clear any previous error
    clearError(emailInput);
    
    if (!email) {
        showError(emailInput, 'Please enter your email address');
        return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showError(emailInput, 'Please enter a valid email address');
        return;
    }
    
    // Check if admin exists with this email
    disable(forgotBtn, 'Checking...');
    
    try {
        const { data: admin, error: adminError } = await supabase
            .from('admins')
            .select('email, full_name')
            .eq('email', email)
            .maybeSingle();
        
        if (adminError || !admin) {
            showError(emailInput, 'No admin account found with this email');
            enable(forgotBtn, 'Send Reset Link');
            return;
        }
        
        // Send password reset email via Supabase
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/Assets/Admin dashboard/password/reset-password.html`
        });
        
        if (resetError) {
            console.error('Reset error:', resetError);
            showError(emailInput, 'Failed to send reset email. Please try again.');
            enable(forgotBtn, 'Send Reset Link');
            return;
        }
        
        // Show success message
        showToast(`Password reset link sent to ${email}. Check your inbox!`);
        
        // Clear the email input
        emailInput.value = '';
        
        // Close the forgot password modal/popup
        closeForgotPasswordModal();
        
    } catch (error) {
        console.error('Forgot password error:', error);
        showError(emailInput, 'An error occurred. Please try again.');
        enable(forgotBtn, 'Send Reset Link');
    }
}

// ============ FORGOT PASSWORD MODAL FUNCTIONS ============
function openForgotPasswordModal() {
    // Check if modal exists, if not create it
    let modal = qs('forgotPasswordModal');
    
    if (!modal) {
        // Create modal dynamically
        modal = document.createElement('div');
        modal.id = 'forgotPasswordModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                padding: 30px;
                border-radius: 16px;
                width: 90%;
                max-width: 400px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                z-index: 10001;
            ">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 style="margin: 0; font-size: 20px;">Reset Password</h3>
                    <button id="closeForgotModalBtn" style="
                        background: none;
                        border: none;
                        font-size: 24px;
                        cursor: pointer;
                        color: #666;
                    ">&times;</button>
                </div>
                <p style="margin-bottom: 20px; color: #666;">Enter your email address and we'll send you a link to reset your password.</p>
                <div class="field" style="margin-bottom: 20px;">
                    <label>Email Address</label>
                    <div class="input-wrap">
                        <i class="fas fa-envelope"></i>
                        <input type="email" id="forgot-email" placeholder="admin@gordoncollege.edu.ph">
                    </div>
                </div>
                <button id="forgotPasswordBtn" class="btn-submit" style="width: 100%; margin-bottom: 10px;">Send Reset Link</button>
                <button id="cancelForgotBtn" style="
                    width: 100%;
                    padding: 12px;
                    border: 1px solid #ddd;
                    background: white;
                    border-radius: 8px;
                    cursor: pointer;
                ">Cancel</button>
            </div>
            <div class="modal-overlay" style="
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.5);
                z-index: 10000;
            "></div>
        `;
        document.body.appendChild(modal);
        
        // Add event listeners
        const closeBtn = qs('closeForgotModalBtn');
        const cancelBtn = qs('cancelForgotBtn');
        const overlay = modal.querySelector('.modal-overlay');
        const forgotBtn = qs('forgotPasswordBtn');
        
        if (closeBtn) closeBtn.onclick = closeForgotPasswordModal;
        if (cancelBtn) cancelBtn.onclick = closeForgotPasswordModal;
        if (overlay) overlay.onclick = closeForgotPasswordModal;
        if (forgotBtn) forgotBtn.onclick = handleForgotPassword;
        
        // Enter key press on email input
        const emailInput = qs('forgot-email');
        if (emailInput) {
            emailInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    handleForgotPassword();
                }
            });
        }
    }
    
    modal.style.display = 'block';
}

function closeForgotPasswordModal() {
    const modal = qs('forgotPasswordModal');
    if (modal) {
        modal.remove();
    }
}

// ============ CHECK FOR EXISTING SESSION ============
async function checkExistingSession() {
    console.log('Checking for existing admin session...');
    
    // Check if there's a stored admin in localStorage
    const storedAdmin = localStorage.getItem('currentAdmin');
    if (!storedAdmin) {
        console.log('No stored admin session found');
        return false;
    }
    
    try {
        // Check session expiry (24 hours)
        const sessionExpiry = localStorage.getItem('adminSessionExpiry');
        if (sessionExpiry && new Date(sessionExpiry) < new Date()) {
            console.log('Session expired');
            localStorage.removeItem('currentAdmin');
            localStorage.removeItem('adminSessionExpiry');
            return false;
        }
        
        // Verify the session with Supabase
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
            console.log('No valid Supabase session, clearing local storage');
            localStorage.removeItem('currentAdmin');
            localStorage.removeItem('adminSessionExpiry');
            return false;
        }
        
        // Verify the admin still exists in your database
        const admin = JSON.parse(storedAdmin);
        const { data: adminData, error: adminError } = await supabase
            .from('admins')
            .select('id, status, role, full_name')
            .eq('id', admin.id)
            .single();
        
        if (adminError || !adminData || adminData.status !== 'active') {
            console.log('Admin account invalid or inactive');
            localStorage.removeItem('currentAdmin');
            localStorage.removeItem('adminSessionExpiry');
            return false;
        }
        
        console.log('✅ Valid session found for admin:', adminData.full_name || admin.email);
        return true;
        
    } catch (error) {
        console.error('Session check error:', error);
        localStorage.removeItem('currentAdmin');
        localStorage.removeItem('adminSessionExpiry');
        return false;
    }
}

// ============ REDIRECT TO DASHBOARD IF ALREADY LOGGED IN ============
async function redirectIfAlreadyLoggedIn() {
    const hasValidSession = await checkExistingSession();
    if (hasValidSession) {
        console.log('Already logged in - redirecting to dashboard...');
        window.location.href = '/Assets/Admin dashboard/Admin.html';
        return true;
    }
    return false;
}

// Helper function to ensure auth user exists
async function ensureAuthUserExists(admin) {
    try {
        // Try to sign in to check if user exists
        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: admin.email,
            password: admin.password_hash
        })
        
        // If user doesn't exist, create them
        if (signInError && signInError.message.includes('Invalid login credentials')) {
            console.log('Creating auth user for:', admin.email)
            
            const { error: signUpError } = await supabase.auth.signUp({
                email: admin.email,
                password: admin.password_hash,
                options: {
                    data: {
                        full_name: admin.full_name,
                        admin_id: admin.admin_id
                    }
                }
            })
            
            if (signUpError) {
                console.error('Signup error:', signUpError)
                return false
            }
            
            // Wait a moment for user to be created
            await new Promise(resolve => setTimeout(resolve, 2000))
            console.log('Auth user created for:', admin.email)
            return true
        }
        
        return true
    } catch (err) {
        console.error('Error ensuring auth user:', err)
        return false
    }
}

// step 1 ng otp verification
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

        console.log('Admin found:', admin)

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

        // Ensure auth user exists before sending OTP
        showToast('Setting up secure access...')
        const authReady = await ensureAuthUserExists(admin)
        
        if (!authReady) {
            showError(usernameInput, 'Failed to setup secure access. Please try again.')
            enable(loginBtn, 'Continue')
            return
        }

        // Send OTP
        const { error: otpError } = await supabase.auth.signInWithOtp({
            email: admin.email,
            options: {
                shouldCreateUser: false
            }
        })

        if (otpError) {
            console.error('OTP Error:', otpError)
            
            // If still failing, try one more time with explicit user creation
            if (otpError.message.includes('User not found') || otpError.message.includes('Invalid email')) {
                showToast('Finalizing account setup...')
                
                const { error: signUpError } = await supabase.auth.signUp({
                    email: admin.email,
                    password: admin.password_hash,
                    options: {
                        data: {
                            full_name: admin.full_name,
                            admin_id: admin.admin_id
                        }
                    }
                })
                
                if (signUpError) {
                    showError(usernameInput, 'Failed to send OTP. Please contact support.')
                    enable(loginBtn, 'Continue')
                    return
                }
                
                // Wait and try one more time
                await new Promise(resolve => setTimeout(resolve, 3000))
                
                const { error: retryError } = await supabase.auth.signInWithOtp({
                    email: admin.email,
                    options: {
                        shouldCreateUser: false
                    }
                })
                
                if (retryError) {
                    showError(usernameInput, 'Failed to send OTP. Please try again.')
                    enable(loginBtn, 'Continue')
                    return
                }
            } else {
                showError(usernameInput, `Failed to send OTP: ${otpError.message}`)
                enable(loginBtn, 'Continue')
                return
            }
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

            showError(inputs[0], `Invalid OTP (${attempts}/${maxAttempts})`)
            enable(btn, 'Verify & Login')
            return
        }

        clearInterval(countdownInterval)

        // Update last login timestamp
        await supabase
            .from('admins')
            .update({
                last_login: new Date().toISOString()
            })
            .eq('id', currentAdmin.id)

        // Store admin session with expiry (24 hours)
        const sessionExpiry = new Date();
        sessionExpiry.setHours(sessionExpiry.getHours() + 24);
        
        localStorage.setItem('currentAdmin', JSON.stringify({
            id: currentAdmin.id,
            admin_id: currentAdmin.admin_id,
            full_name: currentAdmin.full_name,
            email: currentAdmin.email,
            role: currentAdmin.role,
            status: currentAdmin.status,
            login_time: new Date().toISOString()
        }))
        
        localStorage.setItem('adminSessionExpiry', sessionExpiry.toISOString());

        const remember = qs('rememberMe')

        if (remember?.checked) {
            localStorage.setItem('rememberedAdmin', currentAdmin.admin_id)
        } else {
            localStorage.removeItem('rememberedAdmin')
        }

        showToast('Login successful! Redirecting...')
        
        setTimeout(() => {
            window.location.href = '/Assets/Admin dashboard/Admin.html'
        }, 1000)

    } catch (err) {
        console.error(err)
        showError(inputs[0], 'OTP verification failed')
        enable(btn, 'Verify & Login')
    }
}

// resend otp
async function resendOTP() {

    if (!currentAdmin) return

    const btn = qs('resendBtn')

    try {

        btn.disabled = true

        // Ensure auth user still exists
        await ensureAuthUserExists(currentAdmin)

        const { error } = await supabase.auth.signInWithOtp({
            email: currentAdmin.email,
            options: {
                shouldCreateUser: false
            }
        })

        if (error) {
            console.error('Resend error:', error)
            showToast('Failed to resend OTP. Please try again.')
            btn.disabled = false
            return
        }

        showToast('OTP resent successfully!')
        startCountdown(300)
        startResendCooldown(30)

    } catch (err) {
        console.error(err)
        btn.disabled = false
        showToast('Failed to resend OTP')
    }
}

// Auto-create auth users for all existing admins on page load (optional)
async function syncExistingAdmins() {
    console.log('Checking for admins that need auth accounts...')
    
    const { data: admins, error } = await supabase
        .from('admins')
        .select('*')
    
    if (error) {
        console.error('Error fetching admins:', error)
        return
    }
    
    for (const admin of admins) {
        await ensureAuthUserExists(admin)
    }
    
    console.log('Auth sync complete')
}

// ============ INITIALIZE LOGIN PAGE ============
(async function initLoginPage() {
    // Check if admin is already logged in
    const isAlreadyLoggedIn = await redirectIfAlreadyLoggedIn();
    if (isAlreadyLoggedIn) return; // Stop here, already redirecting
    
    // If not logged in, proceed with normal login page setup
    
    // Load remembered admin ID for "Remember Me"
    const remembered = localStorage.getItem('rememberedAdmin');
    if (remembered) {
        const usernameInput = qs('admin-username');
        if (usernameInput) {
            usernameInput.value = remembered;
        }
        const rememberCheckbox = qs('rememberMe');
        if (rememberCheckbox) {
            rememberCheckbox.checked = true;
        }
    }
    
    console.log('Login page ready - waiting for credentials');
})();

// events 
qs('loginBtn')?.addEventListener('click', handleLogin)
qs('verifyBtn')?.addEventListener('click', handleVerifyOTP)
qs('resendBtn')?.addEventListener('click', resendOTP)

// Add forgot password event listener
const forgotLink = qs('forgot-link');
if (forgotLink) {
    forgotLink.addEventListener('click', (e) => {
        e.preventDefault();
        openForgotPasswordModal();
    });
}

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
window.openForgotPasswordModal = openForgotPasswordModal
window.handleForgotPassword = handleForgotPassword

console.log('Login page loaded - Auto-auth creation enabled')