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

// ============ ENHANCED TOAST SYSTEM ============
let toastContainer = null;

function getToastContainer() {
    if (!toastContainer) {
        toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container';
            document.body.appendChild(toastContainer);
        }
    }
    return toastContainer;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function removeToast(toast) {
    toast.classList.add('toast-removing');
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 250);
}

function showToast(message, type = 'info', title = null, duration = 4000) {
    const container = getToastContainer();
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconHtml = '';
    let defaultTitle = '';
    
    switch(type) {
        case 'success':
            iconHtml = '<i class="fas fa-check-circle"></i>';
            defaultTitle = 'Success';
            break;
        case 'error':
            iconHtml = '<i class="fas fa-times-circle"></i>';
            defaultTitle = 'Error';
            break;
        case 'warning':
            iconHtml = '<i class="fas fa-exclamation-triangle"></i>';
            defaultTitle = 'Warning';
            break;
        case 'info':
        default:
            iconHtml = '<i class="fas fa-info-circle"></i>';
            defaultTitle = 'Information';
            break;
    }
    
    const finalTitle = title || defaultTitle;
    
    toast.innerHTML = `
        <div class="toast-icon">${iconHtml}</div>
        <div class="toast-content">
            <div class="toast-title">${escapeHtml(finalTitle)}</div>
            <div class="toast-message">${escapeHtml(message)}</div>
        </div>
        <button class="toast-close"><i class="fas fa-times"></i></button>
    `;
    
    container.appendChild(toast);
    
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeToast(toast);
    });
    
    toast.addEventListener('click', (e) => {
        if (e.target !== closeBtn && !closeBtn.contains(e.target)) {
            removeToast(toast);
        }
    });
    
    if (duration > 0) {
        setTimeout(() => {
            if (toast.parentElement) {
                removeToast(toast);
            }
        }, duration);
    }
    
    return toast;
}

function showSuccessToast(message, title = 'Success', duration = 4000) {
    return showToast(message, 'success', title, duration);
}

function showErrorToast(message, title = 'Error', duration = 5000) {
    return showToast(message, 'error', title, duration);
}

function showWarningToast(message, title = 'Warning', duration = 4000) {
    return showToast(message, 'warning', title, duration);
}

function showInfoToast(message, title = 'Information', duration = 3000) {
    return showToast(message, 'info', title, duration);
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
    
    clearError(emailInput);
    
    if (!email) {
        showErrorToast('Please enter your email address', 'Email Required');
        return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showErrorToast('Please enter a valid email address', 'Invalid Email');
        return;
    }
    
    disable(forgotBtn, 'Checking...');
    
    try {
        const { data: admin, error: adminError } = await supabase
            .from('admins')
            .select('email, full_name')
            .eq('email', email)
            .maybeSingle();
        
        if (adminError || !admin) {
            showErrorToast('No admin account found with this email', 'Account Not Found');
            enable(forgotBtn, 'Send Reset Link');
            return;
        }
        
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/Assets/Admin dashboard/password/reset-password.html`
        });
        
        if (resetError) {
            console.error('Reset error:', resetError);
            showErrorToast('Failed to send reset email. Please try again.', 'Reset Failed');
            enable(forgotBtn, 'Send Reset Link');
            return;
        }
        
        showSuccessToast(`Password reset link sent to ${email}. Check your inbox!`, 'Email Sent', 5000);
        emailInput.value = '';
        closeForgotPasswordModal();
        
    } catch (error) {
        console.error('Forgot password error:', error);
        showErrorToast('An error occurred. Please try again.', 'Error');
        enable(forgotBtn, 'Send Reset Link');
    }
}

// ============ FORGOT PASSWORD MODAL FUNCTIONS ============
function openForgotPasswordModal() {
    let modal = qs('forgotPasswordModal');
    
    if (!modal) {
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
        
        const closeBtn = qs('closeForgotModalBtn');
        const cancelBtn = qs('cancelForgotBtn');
        const overlay = modal.querySelector('.modal-overlay');
        const forgotBtn = qs('forgotPasswordBtn');
        
        if (closeBtn) closeBtn.onclick = closeForgotPasswordModal;
        if (cancelBtn) cancelBtn.onclick = closeForgotPasswordModal;
        if (overlay) overlay.onclick = closeForgotPasswordModal;
        if (forgotBtn) forgotBtn.onclick = handleForgotPassword;
        
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
    
    const storedAdmin = localStorage.getItem('currentAdmin');
    if (!storedAdmin) {
        console.log('No stored admin session found');
        return false;
    }
    
    try {
        const sessionExpiry = localStorage.getItem('adminSessionExpiry');
        if (sessionExpiry && new Date(sessionExpiry) < new Date()) {
            console.log('Session expired');
            localStorage.removeItem('currentAdmin');
            localStorage.removeItem('adminSessionExpiry');
            return false;
        }
        
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
        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: admin.email,
            password: admin.password_hash
        })
        
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

// ============ UPDATED LOGIN FUNCTION - NO OTP ============
async function handleLogin() {

    const usernameInput = qs('admin-username')
    const passwordInput = qs('admin-password')
    const loginBtn = qs('loginBtn')

    const username = usernameInput.value.trim()
    const password = passwordInput.value.trim()

    clearError(usernameInput)
    clearError(passwordInput)

    if (!username) {
        showErrorToast('Enter Admin ID or Email', 'Missing Field');
        return
    }

    if (!password) {
        showErrorToast('Enter Password', 'Missing Field');
        return
    }

    disable(loginBtn, 'Checking...')

    try {
        // Direct login without OTP
        const { data: admin, error } = await supabase
            .from('admins')
            .select('*')
            .or(`admin_id.ilike.${username},email.ilike.${username}`)
            .maybeSingle()

        console.log('Admin found:', admin)

        if (error || !admin) {
            showErrorToast('Admin not found. Please check your credentials.', 'Login Failed');
            enable(loginBtn, 'Login')
            return
        }

        // Check password
        if (admin.password_hash !== password) {
            showErrorToast('Wrong password. Please try again.', 'Authentication Failed');
            enable(loginBtn, 'Login')
            return
        }

        // Update last login
        await supabase
            .from('admins')
            .update({
                last_login: new Date().toISOString()
            })
            .eq('id', admin.id)

        // Store session
        const sessionExpiry = new Date();
        sessionExpiry.setHours(sessionExpiry.getHours() + 24);
        
        localStorage.setItem('currentAdmin', JSON.stringify({
            id: admin.id,
            admin_id: admin.admin_id,
            full_name: admin.full_name,
            email: admin.email,
            role: admin.role,
            status: admin.status,
            login_time: new Date().toISOString()
        }))
        
        localStorage.setItem('adminSessionExpiry', sessionExpiry.toISOString());

        const remember = qs('rememberMe')
        if (remember?.checked) {
            localStorage.setItem('rememberedAdmin', admin.admin_id)
        } else {
            localStorage.removeItem('rememberedAdmin')
        }

        showSuccessToast(`Welcome back, ${admin.full_name || admin.admin_id}! Redirecting to dashboard...`, 'Login Successful', 2000);
        
        setTimeout(() => {
            window.location.href = '/Assets/Admin dashboard/Admin.html'
        }, 1000)

    } catch (err) {
        console.error(err)
        showErrorToast('Login failed. Please try again.', 'Error');
        enable(loginBtn, 'Login')
    }
}

// ============ COMMENTED OUT OTP FUNCTIONS ============
/*
// 2 step verification ng otp
async function handleVerifyOTP() {
    // OTP verification is now disabled for direct login
    console.log('OTP verification disabled - direct login only');
}

// resend otp
async function resendOTP() {
    console.log('OTP resend disabled - direct login only');
}

// Auto-create auth users for all existing admins on page load (optional)
async function syncExistingAdmins() {
    console.log('Auth sync disabled - direct login only');
}
*/

// ============ INITIALIZE LOGIN PAGE ============
(async function initLoginPage() {
    const isAlreadyLoggedIn = await redirectIfAlreadyLoggedIn();
    if (isAlreadyLoggedIn) return;
    
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
    
    console.log('Login page ready - OTP disabled, direct login only');
})();

// events 
qs('loginBtn')?.addEventListener('click', handleLogin)
// qs('verifyBtn')?.addEventListener('click', handleVerifyOTP) // DISABLED
// qs('resendBtn')?.addEventListener('click', resendOTP) // DISABLED

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
// window.handleVerifyOTP = handleVerifyOTP // DISABLED
// window.resendOTP = resendOTP // DISABLED
window.openForgotPasswordModal = openForgotPasswordModal
window.handleForgotPassword = handleForgotPassword

console.log('Login page loaded - OTP DISABLED for direct admin access')