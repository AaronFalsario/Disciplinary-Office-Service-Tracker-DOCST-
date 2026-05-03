// function.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// Initialize Supabase
const supabaseUrl = 'https://vzrolreickfylygagmlg.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6cm9scmVpY2tmeWx5Z2FnbWxnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwMTMxOTAsImV4cCI6MjA5MjU4OTE5MH0.O63_YaRF0hRtSCMJRRRfhwtpNMgOE8eugnR0jRuEAv8'
const supabase = createClient(supabaseUrl, supabaseKey)

// Rate limiter to prevent abuse
const rateLimiter = {
    lastAttempt: 0,
    attempts: 0,
    cooldown: 300000, // 5 minutes
    
    canSend() {
        const now = Date.now()
        
        if (now - this.lastAttempt > this.cooldown) {
            this.attempts = 0
            return true
        }
        
        if (this.attempts < 2) {
            return true
        }
        
        return false
    },
    
    recordAttempt() {
        this.lastAttempt = Date.now()
        this.attempts++
    },
    
    getRemainingTime() {
        const elapsed = Date.now() - this.lastAttempt
        const remaining = Math.ceil((this.cooldown - elapsed) / 1000)
        return remaining > 0 ? remaining : 0
    }
}

// Helper functions
function showToast(message, type = 'success') {
    const toast = document.getElementById('toastNotification')
    if (!toast) {
        alert(message)
        return
    }
    const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle' }
    toast.className = `toast-notification ${type}`
    toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><span>${message}</span>`
    toast.classList.add('show')
    setTimeout(() => toast.classList.remove('show'), 4500)
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

// Send password reset email
document.getElementById('sendResetLinkBtn')?.addEventListener('click', async () => {
    const email = document.getElementById('resetEmail').value.trim().toLowerCase()
    const sendBtn = document.getElementById('sendResetLinkBtn')

    // Validate email
    if (!email) {
        showToast('Please enter your email address', 'error')
        return
    }
    
    if (!email.endsWith('@gordoncollege.edu.ph')) {
        showToast('Only @gordoncollege.edu.ph emails are allowed', 'error')
        return
    }

    // Check rate limit
    if (!rateLimiter.canSend()) {
        const remainingTime = rateLimiter.getRemainingTime()
        const minutes = Math.floor(remainingTime / 60)
        const seconds = remainingTime % 60
        const timeText = minutes > 0 ? `${minutes} minute${minutes > 1 ? 's' : ''}` : `${seconds} seconds`
        showToast(`Please wait ${timeText} before trying again`, 'error')
        return
    }

    disable(sendBtn, '<i class="fas fa-spinner fa-spin"></i> Sending...')

    try {
        // Check if admin exists in your table
        const { data: admin, error: adminError } = await supabase
            .from('admins')
            .select('id, email, full_name')
            .eq('email', email)
            .single()

        if (adminError || !admin) {
            showToast('No admin account found with this email.', 'error')
            enable(sendBtn, 'Send Reset Link')
            return
        }

        // Record attempt
        rateLimiter.recordAttempt()
        
        console.log('Sending password reset to:', email)
        
        // Send password reset email using Supabase Auth
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/Assets/Student Authentication/Admin Authentication/update-password.html',
        })

        if (resetError) {
            console.error('Reset error:', resetError)
            
            // If user doesn't exist in auth, create them first
            if (resetError.message.includes('User not found') || resetError.message.includes('Invalid email')) {
                showToast('Setting up your account. Please wait...', 'info')
                
                // Create the auth user
                const { error: signUpError } = await supabase.auth.signUp({
                    email: email,
                    password: admin.password_hash || 'TempPass123!',
                    options: {
                        data: {
                            full_name: admin.full_name || 'Admin',
                            admin_id: admin.admin_id
                        }
                    }
                })
                
                if (signUpError) {
                    console.error('Signup error:', signUpError)
                    showToast(`Account setup failed. Please contact support.`, 'error')
                    enable(sendBtn, 'Send Reset Link')
                    return
                }
                
                // Wait 2 seconds then try again
                setTimeout(async () => {
                    const { error: retryError } = await supabase.auth.resetPasswordForEmail(email, {
                        redirectTo: window.location.origin + '/Assets/Student Authentication/Admin Authentication/update-password.html',
                    })
                    
                    if (retryError) {
                        showToast(`Failed to send reset link. Please try again.`, 'error')
                        enable(sendBtn, 'Send Reset Link')
                    } else {
                        showToast(`Reset link sent to ${email}! Check your inbox.`, 'success')
                        document.getElementById('resetEmail').value = ''
                        setTimeout(() => enable(sendBtn, 'Send Reset Link'), 3000)
                    }
                }, 2000)
                return
            } else if (resetError.message.includes('rate limit')) {
                showToast('Too many requests. Please wait 10 minutes.', 'error')
                enable(sendBtn, 'Send Reset Link')
                return
            } else {
                showToast(`Failed to send reset link. Please try again.`, 'error')
                enable(sendBtn, 'Send Reset Link')
                return
            }
        }
        
        // Success!
        showToast(`Reset link sent to ${email}! Check your inbox and spam folder.`, 'success')
        
        // Clear the email input
        document.getElementById('resetEmail').value = ''
        
        // Enable button after 3 seconds
        setTimeout(() => {
            enable(sendBtn, 'Send Reset Link')
        }, 3000)

    } catch (err) {
        console.error('Unexpected error:', err)
        showToast(`Something went wrong. Please try again.`, 'error')
        enable(sendBtn, 'Send Reset Link')
    }
})

// Enter key shortcut
document.getElementById('resetEmail')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('sendResetLinkBtn')?.click()
    }
})

console.log('Password reset page loaded - Email only')