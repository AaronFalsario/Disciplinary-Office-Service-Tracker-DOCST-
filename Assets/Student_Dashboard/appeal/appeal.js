import { createClient } from '@supabase/supabase-js'
import { setupDrawer, setupLogout } from '/Assets/drawer.js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

let currentStudent = null
let myPenalties = []
let myAppeals = []
let notifications = []
let unreadCount = 0
let studentOffenseCount = 0  // Track total offenses

// Helper functions
function escapeHtml(text) {
    if (!text) return ''
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
}

function formatDate(dateString) {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString()
}

function formatRelativeTime(date) {
    const diff = Date.now() - new Date(date)
    const mins = Math.floor(diff / 60000)
    const hrs = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins} min ago`
    if (hrs < 24) return `${hrs} hr ago`
    if (days < 7) return `${days} day ago`
    return new Date(date).toLocaleDateString()
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toastNotification')
    if (!toast) {
        console.log('Toast:', message)
        return
    }
    toast.textContent = message
    toast.className = `toast-notification show ${type}`
    setTimeout(() => {
        toast.classList.remove('show')
    }, 4000)
}

// Auth check
async function checkAuth() {
    const stored = localStorage.getItem('currentStudent')
    console.log('Checking auth, stored student:', stored)

    if (!stored) {
        console.log('No student session found, redirecting to login')
        window.location.href = '/Assets/Student Authentication/Student.html'
        return false
    }

    try {
        currentStudent = JSON.parse(stored)
        console.log('Student authenticated:', currentStudent.name)
        
        if (!currentStudent.studentId && currentStudent.id) {
            currentStudent.studentId = currentStudent.id
            localStorage.setItem('currentStudent', JSON.stringify(currentStudent))
        }
        
        return true
    } catch (e) {
        console.error('Auth check failed:', e)
        localStorage.removeItem('currentStudent')
        window.location.href = '/Assets/Student Authentication/Student.html'
        return false
    }
}

// ============ GET TOTAL OFFENSE COUNT (ALL PENALTIES, ANY STATUS) ============
async function getStudentOffenseCount() {
    if (!currentStudent) return 0

    const studentId = currentStudent.studentId || currentStudent.id

    try {
        // Get ALL penalties for this student (not just pending)
        let { data, error } = await supabase
            .from('penalties')
            .select('id', { count: 'exact', head: false })
            .eq('student_id', studentId)

        if (error) throw error

        // Try by email if no results
        let count = data?.length || 0
        if (count === 0 && currentStudent.email) {
            const { data: emailData, error: emailError } = await supabase
                .from('penalties')
                .select('id', { count: 'exact', head: false })
                .eq('student_email', currentStudent.email)
            
            if (!emailError && emailData) {
                count = emailData.length
            }
        }
        
        studentOffenseCount = count
        console.log(`Total offense count for ${currentStudent.name}: ${studentOffenseCount}`)
        return studentOffenseCount
        
    } catch (error) {
        console.error('Error getting offense count:', error)
        return 0
    }
}

// ============ CHECK IF STUDENT CAN APPEAL A SPECIFIC PENALTY ============
async function canAppealPenalty(penaltyId) {
    if (!currentStudent) return false

    const studentId = currentStudent.studentId || currentStudent.id

    try {
        // First, get the specific penalty details to check hours
        let { data: penaltyData, error: penaltyError } = await supabase
            .from('penalties')
            .select('*')
            .eq('id', penaltyId)
            .single()

        if (penaltyError) {
            console.error('Error fetching penalty details:', penaltyError)
            return false
        }

        // ============ BLOCK 0-HOUR VIOLATIONS (WARNINGS) ============
        if (penaltyData && (penaltyData.hours === 0 || penaltyData.hours === null || penaltyData.hours === undefined)) {
            console.log(`❌ Penalty ${penaltyId} has ${penaltyData.hours} hours - CANNOT APPEAL (warning only)`)
            return false
        }

        // ============ BLOCK ALREADY COMPLETED PENALTIES ============
        if (penaltyData && penaltyData.status === 'completed') {
            console.log(`❌ Penalty ${penaltyId} is already completed - CANNOT APPEAL`)
            return false
        }

        // Get ALL penalties ordered by creation date
        let { data, error } = await supabase
            .from('penalties')
            .select('id, violation, status, hours, created_at')
            .eq('student_id', studentId)
            .order('created_at', { ascending: true })

        if (error) throw error

        // Try by email if no results
        if ((!data || data.length === 0) && currentStudent.email) {
            const { data: emailData } = await supabase
                .from('penalties')
                .select('id, violation, status, hours, created_at')
                .eq('student_email', currentStudent.email)
                .order('created_at', { ascending: true })
            
            if (emailData) data = emailData
        }

        const allPenalties = data || []
        const totalOffenses = allPenalties.length
        
        console.log(`Total offenses for student: ${totalOffenses}`)
        console.log(`Penalty hours: ${penaltyData?.hours}`)
        
        // If student has NO offenses (shouldn't happen) - can appeal
        if (totalOffenses === 0) {
            console.log('No offenses found - can appeal')
            return true
        }
        
        // If student has ONLY ONE offense TOTAL and it has hours > 0
        if (totalOffenses === 1 && penaltyData && penaltyData.hours > 0) {
            console.log('Student has only 1 offense total with hours - CANNOT APPEAL (first offense)')
            return false  // FIRST OFFENSE - CANNOT APPEAL
        }
        
        // If student has ONLY ONE offense TOTAL (already blocked above for 0 hours)
        if (totalOffenses === 1) {
            console.log('Student has only 1 offense total - CANNOT APPEAL')
            return false
        }
        
        // If student has MULTIPLE offenses (2 or more)
        // Check if this penalty is the oldest (first offense)
        const oldestPenalty = allPenalties[0]
        const isFirstOffense = String(oldestPenalty.id) === String(penaltyId)
        
        if (isFirstOffense && penaltyData && penaltyData.hours > 0) {
            console.log('This is the first offense but student has multiple offenses - CAN APPEAL')
            return true  // First offense but has other offenses - can appeal
        }
        
        // This is a subsequent offense (2nd, 3rd, etc.) - can appeal
        console.log('This is a subsequent offense - CAN APPEAL')
        return true
        
    } catch (error) {
        console.error('Error checking appeal eligibility:', error)
        return false
    }
}

// Load penalties for dropdown - ONLY SHOW APPEALABLE PENALTIES
async function loadPenalties() {
    if (!currentStudent) return []

    const studentId = currentStudent.studentId || currentStudent.id

    console.log('Loading penalties for student:', currentStudent.name)

    try {
        // Get ALL pending penalties with hours > 0
        let { data, error } = await supabase
            .from('penalties')
            .select('*')
            .eq('student_id', studentId)
            .eq('status', 'pending')
            .gt('hours', 0)  // ONLY get penalties with hours > 0
            .order('created_at', { ascending: true })

        if ((!data || data.length === 0) && currentStudent.email) {
            console.log('Trying by email...')
            const { data: emailData, error: emailError } = await supabase
                .from('penalties')
                .select('*')
                .eq('student_email', currentStudent.email)
                .eq('status', 'pending')
                .gt('hours', 0)  // ONLY get penalties with hours > 0
                .order('created_at', { ascending: true })

            if (!emailError && emailData && emailData.length > 0) {
                data = emailData
                error = null
            }
        }

        if (error) throw error

        const allPendingPenalties = data || []
        
        // Get total offense count first
        await getStudentOffenseCount()
        
        // Filter penalties that can be appealed
        const appealablePenalties = []
        
        for (const penalty of allPendingPenalties) {
            const canAppeal = await canAppealPenalty(penalty.id)
            
            if (canAppeal) {
                appealablePenalties.push(penalty)
                console.log(`✅ Penalty ${penalty.id} (${penalty.violation}, ${penalty.hours} hours) - CAN appeal`)
            } else {
                console.log(`❌ Penalty ${penalty.id} (${penalty.violation}, ${penalty.hours} hours) - CANNOT appeal`)
            }
        }
        
        myPenalties = appealablePenalties
        
        console.log(`Total pending penalties with hours: ${allPendingPenalties.length}`)
        console.log(`Appealable penalties: ${myPenalties.length}`)
        
        return myPenalties
    } catch (error) {
        console.error('Error loading penalties:', error)
        return []
    }
}

// Load appeals
async function loadAppeals() {
    if (!currentStudent) return []

    const studentId = currentStudent.studentId || currentStudent.id

    console.log('Loading appeals for student:', currentStudent.name)

    try {
        let { data, error } = await supabase
            .from('appeals')
            .select('*')
            .eq('student_id', studentId)
            .order('created_at', { ascending: false })

        if ((!data || data.length === 0) && currentStudent.email) {
            console.log('Trying appeals by email...')
            const { data: emailData, error: emailError } = await supabase
                .from('appeals')
                .select('*')
                .eq('student_email', currentStudent.email)
                .order('created_at', { ascending: false })

            if (!emailError && emailData && emailData.length > 0) {
                data = emailData
                error = null
            }
        }

        if (error) throw error

        myAppeals = data || []
        console.log('Appeals loaded:', myAppeals.length)
        return myAppeals
    } catch (error) {
        console.error('Error loading appeals:', error)
        return []
    }
}

// Load notifications
async function loadNotifications() {
    if (!currentStudent) return []

    const studentId = currentStudent.studentId || currentStudent.id

    try {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('student_id', studentId)
            .order('created_at', { ascending: false })
            .limit(10)

        if (error) throw error

        notifications = data || []
        unreadCount = notifications.filter(n => !n.is_read).length
        updateNotificationBadge()
        return notifications
    } catch (error) {
        console.error('Error loading notifications:', error)
        return []
    }
}

// Notification functions
function updateNotificationBadge() {
    const notifyBtn = document.getElementById('notifyBtn')
    if (!notifyBtn) return

    const existingBadge = notifyBtn.querySelector('.notification-badge')
    if (existingBadge) existingBadge.remove()

    if (unreadCount > 0) {
        const badge = document.createElement('span')
        badge.className = 'notification-badge'
        badge.textContent = unreadCount > 99 ? '99+' : unreadCount
        notifyBtn.appendChild(badge)
    }
}

async function markAsRead(notificationId) {
    try {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq('id', notificationId)

        if (error) throw error

        const notification = notifications.find(n => n.id === notificationId)
        if (notification && !notification.is_read) {
            notification.is_read = true
            unreadCount--
            updateNotificationBadge()
            renderNotificationList()
        }
    } catch (error) {
        console.error('Error marking as read:', error)
    }
}

async function markAllAsRead() {
    if (unreadCount === 0) return

    const studentId = currentStudent.studentId || currentStudent.id

    try {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq('student_id', studentId)
            .eq('is_read', false)

        if (error) throw error

        notifications.forEach(n => n.is_read = true)
        unreadCount = 0
        updateNotificationBadge()
        renderNotificationList()
    } catch (error) {
        console.error('Error marking all as read:', error)
    }
}

function getNotificationIcon(type) {
    switch (type) {
        case 'penalty': return 'fa-gavel'
        case 'appeal': return 'fa-gavel'
        case 'report': return 'fa-file-alt'
        case 'deadline': return 'fa-hourglass-half'
        case 'success': return 'fa-check-circle'
        case 'warning': return 'fa-exclamation-triangle'
        default: return 'fa-bell'
    }
}

function renderNotificationList() {
    const container = document.getElementById('notificationList')
    if (!container) return

    if (notifications.length === 0) {
        container.innerHTML = `
            <div class="empty-notifications">
                <i class="fas fa-bell-slash"></i>
                <p>No notifications</p>
                <span>You're all caught up!</span>
            </div>
        `
        return
    }

    container.innerHTML = notifications.map(notification => `
        <div class="notification-item ${!notification.is_read ? 'unread' : ''}" data-id="${notification.id}">
            <div class="notification-icon ${notification.type || 'system'}">
                <i class="fas ${getNotificationIcon(notification.type)}"></i>
            </div>
            <div class="notification-content">
                <div class="notification-title">${escapeHtml(notification.title)}</div>
                <div class="notification-message">${escapeHtml(notification.message)}</div>
                <div class="notification-time">${formatRelativeTime(new Date(notification.created_at))}</div>
            </div>
            ${!notification.is_read ? '<div class="notification-unread-dot"></div>' : ''}
        </div>
    `).join('')

    document.querySelectorAll('.notification-item').forEach(item => {
        item.addEventListener('click', async () => {
            const id = parseInt(item.dataset.id)
            const notification = notifications.find(n => n.id === id)
            if (notification && !notification.is_read) {
                await markAsRead(id)
            }

            const dropdown = document.getElementById('notificationDropdown')
            const overlay = document.getElementById('notificationOverlay')
            if (dropdown) dropdown.classList.remove('show')
            if (overlay) overlay.classList.remove('active')
        })
    })
}

function setupNotificationClickOutside() {
    const overlay = document.getElementById('notificationOverlay')
    const dropdown = document.getElementById('notificationDropdown')
    const notifyBtn = document.getElementById('notifyBtn')

    if (!overlay || !dropdown || !notifyBtn) return

    function closeDropdown() {
        dropdown.classList.remove('show')
        overlay.classList.remove('active')
    }

    function openDropdown() {
        dropdown.classList.add('show')
        overlay.classList.add('active')
    }

    notifyBtn.addEventListener('click', async (e) => {
        e.stopPropagation()
        await loadNotifications()
        renderNotificationList()

        if (dropdown.classList.contains('show')) {
            closeDropdown()
        } else {
            openDropdown()
        }
    })

    overlay.addEventListener('click', closeDropdown)

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && dropdown.classList.contains('show')) {
            closeDropdown()
        }
    })
}

function initNotification() {
    setupNotificationClickOutside()

    const markAllBtn = document.getElementById('markAllReadBtn')
    if (markAllBtn) {
        markAllBtn.addEventListener('click', async (e) => {
            e.stopPropagation()
            await markAllAsRead()
        })
    }

    const viewAllLink = document.getElementById('viewAllLink')
    if (viewAllLink) {
        viewAllLink.addEventListener('click', (e) => {
            e.preventDefault()
            e.stopPropagation()
            const dropdown = document.getElementById('notificationDropdown')
            const overlay = document.getElementById('notificationOverlay')
            if (dropdown) dropdown.classList.remove('show')
            if (overlay) overlay.classList.remove('active')
        })
    }
}

// Create admin notification
async function createAdminNotifications(appealData) {
    try {
        const { data: admins, error: adminsError } = await supabase
            .from('admins')
            .select('admin_id')

        if (adminsError) throw adminsError

        if (!admins || admins.length === 0) {
            console.log('No admins found to notify')
            return
        }

        for (const admin of admins) {
            await supabase
                .from('notifications')
                .insert([{
                    admin_id: admin.admin_id,
                    title: 'New Appeal Submitted',
                    message: `${appealData.student_name} has submitted an appeal for ${appealData.violation}`,
                    type: 'appeal',
                    is_read: false,
                    created_at: new Date().toISOString()
                }])
        }

        console.log(`Admin notifications created`)
    } catch (error) {
        console.error('Error creating admin notifications:', error)
    }
}

// Populate penalty dropdown - ONLY SHOW APPEALABLE PENALTIES
function populatePenaltyDropdown() {
    const select = document.getElementById('penaltySelect')
    if (!select) return

    if (myPenalties.length === 0) {
        if (studentOffenseCount === 1) {
            select.innerHTML = '<option value="">No penalties available for appeal</option>'
            select.disabled = true
            
            const infoMsg = document.getElementById('appealRestrictionInfo')
            if (infoMsg) {
                infoMsg.style.display = 'block'
                infoMsg.innerHTML = `
                    <div class="info-message info-warning">
                        <i class="fas fa-exclamation-triangle"></i>
                        <span><strong>First Offense Restriction:</strong> You cannot appeal your first violation. Please complete the assigned community service hours. If you have concerns, please contact the disciplinary office.</span>
                    </div>
                `
            }
        } else if (studentOffenseCount === 0) {
            select.innerHTML = '<option value="">No penalties found</option>'
            select.disabled = true
        } else {
            select.innerHTML = '<option value="">No penalties available for appeal</option>'
            select.disabled = true
            
            const infoMsg = document.getElementById('appealRestrictionInfo')
            if (infoMsg) {
                infoMsg.style.display = 'block'
                infoMsg.innerHTML = `
                    <div class="info-message info-info">
                        <i class="fas fa-info-circle"></i>
                        <span><strong>No Appealable Penalties:</strong> You only have warning violations (0 hours) which cannot be appealed. Appeals are only for penalties with assigned community service hours (1+ hours).</span>
                    </div>
                `
            }
        }
        return
    }

    select.innerHTML = '<option value="">Select a penalty to appeal</option>' +
        myPenalties.map(penalty => `
            <option value="${penalty.id}" data-violation="${escapeHtml(penalty.violation)}" data-hours="${penalty.hours}" data-deadline="${penalty.deadline}">
                ${escapeHtml(penalty.violation)} - ${penalty.hours} hours
            </option>
        `).join('')

    select.disabled = false
    
    const infoMsg = document.getElementById('appealRestrictionInfo')
    if (infoMsg) {
        infoMsg.style.display = 'block'
        infoMsg.innerHTML = `
            <div class="info-message info-success">
                <i class="fas fa-check-circle"></i>
                <span>You have ${myPenalties.length} penalty/penalties eligible for appeal. Note: Warnings (0 hours) and first offenses cannot be appealed.</span>
            </div>
        `
    }
}

// Setup penalty select listener
function setupPenaltySelectListener() {
    const select = document.getElementById('penaltySelect')
    if (!select) return

    select.addEventListener('change', () => {
        const selectedOption = select.options[select.selectedIndex]
        const violationName = document.getElementById('violationName')
        const violationHours = document.getElementById('violationHours')
        const violationDeadline = document.getElementById('violationDeadline')

        if (select.value && selectedOption && selectedOption.dataset) {
            if (violationName) violationName.textContent = selectedOption.dataset.violation || '—'
            if (violationHours) violationHours.textContent = selectedOption.dataset.hours ? `${selectedOption.dataset.hours} hours` : '—'
            if (violationDeadline) violationDeadline.textContent = formatDate(selectedOption.dataset.deadline) || '—'
        } else {
            if (violationName) violationName.textContent = '—'
            if (violationHours) violationHours.textContent = '—'
            if (violationDeadline) violationDeadline.textContent = '—'
        }
    })
}

// Submit appeal with strict first offense check
async function submitAppeal() {
    const penaltySelect = document.getElementById('penaltySelect')
    const appealReason = document.getElementById('appealReason')
    const supportingStatement = document.getElementById('supportingStatement')

    if (!penaltySelect.value) {
        showToast('Please select a penalty to appeal', 'error')
        return
    }

    if (!appealReason.value.trim()) {
        showToast('Please provide a reason for your appeal', 'error')
        return
    }

    const selectedPenalty = myPenalties.find(p => p.id == penaltySelect.value)

    if (!selectedPenalty) {
        showToast('Invalid penalty selected', 'error')
        return
    }

    // CRITICAL: Double-check eligibility before submitting
    const canAppeal = await canAppealPenalty(selectedPenalty.id)
    
    if (!canAppeal) {
        showToast('This penalty cannot be appealed. First offenses and warnings (0 hours) are not eligible for appeal.', 'error')
        // Refresh penalties to update the dropdown
        await loadPenalties()
        populatePenaltyDropdown()
        return
    }

    const submitBtn = document.getElementById('submitAppealBtn')
    const originalText = submitBtn?.innerHTML
    if (submitBtn) {
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...'
        submitBtn.disabled = true
    }

    try {
        const { error } = await supabase
            .from('appeals')
            .insert([{
                student_id: currentStudent.studentId,
                student_name: currentStudent.name,
                student_email: currentStudent.email || '',
                penalty_id: selectedPenalty.id,
                penalty_violation: selectedPenalty.violation,
                penalty_hours: selectedPenalty.hours,
                penalty_deadline: selectedPenalty.deadline,
                appeal_reason: appealReason.value.trim(),
                supporting_statement: supportingStatement.value.trim() || null,
                status: 'pending',
                created_at: new Date().toISOString(),
                submitted_at: new Date().toISOString()
            }])

        if (error) throw error

        await createAdminNotifications({
            student_name: currentStudent.name,
            student_id: currentStudent.studentId,
            violation: selectedPenalty.violation
        })

        await supabase
            .from('notifications')
            .insert([{
                student_id: currentStudent.studentId,
                title: 'Appeal Submitted',
                message: `Your appeal for ${selectedPenalty.violation} has been submitted and is pending review.`,
                type: 'appeal',
                is_read: false,
                created_at: new Date().toISOString()
            }])

        showToast('Appeal submitted successfully!', 'success')

        // Clear form
        penaltySelect.value = ''
        appealReason.value = ''
        supportingStatement.value = ''
        if (document.getElementById('violationName')) document.getElementById('violationName').textContent = '—'
        if (document.getElementById('violationHours')) document.getElementById('violationHours').textContent = '—'
        if (document.getElementById('violationDeadline')) document.getElementById('violationDeadline').textContent = '—'

        // Refresh data
        await loadPenalties()
        await loadAppeals()
        await loadNotifications()

        populatePenaltyDropdown()
        renderAppealsTable()

    } catch (error) {
        console.error('Error submitting appeal:', error)
        showToast('Failed to submit appeal. Please try again.', 'error')
    } finally {
        if (submitBtn) {
            submitBtn.innerHTML = originalText
            submitBtn.disabled = false
        }
    }
}

function renderAppealsTable() {
    const tbody = document.getElementById('appealsTableBody')
    if (!tbody) {
        console.error('Appeals table body not found')
        return
    }

    console.log('Rendering appeals table, appeals found:', myAppeals.length)

    if (myAppeals.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    <div class="empty-icon">📋</div>
                    <div class="empty-title">No Appeals Found</div>
                    <div class="empty-sub">Submit an appeal to see it here</div>
                </div>
            `
        return
    }

    tbody.innerHTML = myAppeals.map(appeal => {
        let statusClass = 'status-pending'
        let statusText = 'Pending'

        if (appeal.status === 'approved') {
            statusClass = 'status-approved'
            statusText = 'Approved'
        } else if (appeal.status === 'rejected') {
            statusClass = 'status-rejected'
            statusText = 'Rejected'
        }

        return `
            <tr>
                <td>${formatDate(appeal.created_at)}</span>
                <td><strong>${escapeHtml(appeal.penalty_violation)}</strong></span>
                <td>${escapeHtml(appeal.appeal_reason?.substring(0, 60))}${appeal.appeal_reason?.length > 60 ? '...' : ''}</span>
                <td><span class="status-badge ${statusClass}">${statusText}</span></span>
                <td>${appeal.reviewed_at ? formatDate(appeal.reviewed_at) : '—'}</span>
                <td>
                    <button class="view-appeal-btn" data-id="${appeal.id}">
                        <i class="fas fa-eye"></i> View
                    </button>
                </span>
            `
    }).join('')

    document.querySelectorAll('.view-appeal-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault()
            const appealId = btn.dataset.id
            const appeal = myAppeals.find(a => a.id == appealId)
            if (appeal) {
                showAppealDetails(appeal)
            }
        })
    })
}

function showAppealDetails(appeal) {
    const modal = document.getElementById('reasonModal')
    if (!modal) {
        alert(`Appeal Details:\n\nViolation: ${appeal.penalty_violation}\nReason: ${appeal.appeal_reason}\nStatus: ${appeal.status}\nSubmitted: ${formatDate(appeal.created_at)}\nReviewed: ${appeal.reviewed_at ? formatDate(appeal.reviewed_at) : 'Not yet reviewed'}\nDecision: ${appeal.decision_reason || 'Pending'}`)
        return
    }

    const modalViolation = document.getElementById('modalViolation')
    const modalSubmitted = document.getElementById('modalSubmitted')
    const modalReviewed = document.getElementById('modalReviewed')
    const modalReviewedBy = document.getElementById('modalReviewedBy')
    const modalDecisionReason = document.getElementById('modalDecisionReason')
    const modalReviewComments = document.getElementById('modalReviewComments')
    const modalAdjustedHours = document.getElementById('modalAdjustedHours')
    const modalNewDeadline = document.getElementById('modalNewDeadline')
    const modalAdminNotes = document.getElementById('modalAdminNotes')
    const modalHeader = document.getElementById('modalHeader')
    const modalIcon = document.getElementById('modalIcon')
    const modalTitle = document.getElementById('modalTitle')

    if (modalViolation) modalViolation.textContent = appeal.penalty_violation || '—'
    if (modalSubmitted) modalSubmitted.textContent = formatDate(appeal.created_at)
    if (modalReviewed) modalReviewed.textContent = appeal.reviewed_at ? formatDate(appeal.reviewed_at) : '—'
    if (modalReviewedBy) modalReviewedBy.textContent = appeal.reviewed_by || '—'
    if (modalDecisionReason) modalDecisionReason.textContent = appeal.decision_reason || 'No reason provided.'
    if (modalReviewComments) modalReviewComments.textContent = appeal.review_comment || 'No additional comments.'
    if (modalAdjustedHours) modalAdjustedHours.textContent = appeal.adjusted_hours ? `${appeal.adjusted_hours} hours` : '—'
    if (modalNewDeadline) modalNewDeadline.textContent = appeal.new_deadline ? formatDate(appeal.new_deadline) : '—'
    if (modalAdminNotes) modalAdminNotes.textContent = appeal.admin_notes || 'No admin notes available.'

    if (modalHeader && modalIcon && modalTitle) {
        if (appeal.status === 'approved') {
            modalHeader.className = 'reason-modal-header approved'
            modalIcon.className = 'fas fa-check-circle'
            modalTitle.textContent = 'Appeal Approved'
        } else if (appeal.status === 'rejected') {
            modalHeader.className = 'reason-modal-header rejected'
            modalIcon.className = 'fas fa-times-circle'
            modalTitle.textContent = 'Appeal Rejected'
        } else {
            modalHeader.className = 'reason-modal-header pending'
            modalIcon.className = 'fas fa-clock'
            modalTitle.textContent = 'Appeal Pending'
        }
    }

    const adjustedRow = document.getElementById('adjustedRow')
    const deadlineRow = document.getElementById('deadlineRow')
    const adminNotesRow = document.getElementById('adminNotesModalRow')

    if (adjustedRow) adjustedRow.style.display = appeal.status === 'approved' ? 'flex' : 'none'
    if (deadlineRow) deadlineRow.style.display = appeal.status === 'approved' ? 'flex' : 'none'
    if (adminNotesRow) adminNotesRow.style.display = appeal.admin_notes ? 'flex' : 'none'

    modal.classList.add('show')
    document.body.style.overflow = 'hidden'
}

window.closeReasonModal = function () {
    const modal = document.getElementById('reasonModal')
    if (modal) modal.classList.remove('show')
    document.body.style.overflow = ''
}

function initReasonModal() {
    const closeBtn = document.getElementById('modalCloseBtn')
    const overlay = document.getElementById('modalOverlayBg')

    if (closeBtn) closeBtn.addEventListener('click', closeReasonModal)
    if (overlay) overlay.addEventListener('click', closeReasonModal)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeReasonModal()
    })
}

function initDarkMode() {
    const savedMode = localStorage.getItem('docst_dark_mode')
    if (savedMode === 'enabled') {
        document.body.classList.add('dark-mode')
    }

    const darkModeBtn = document.getElementById('darkModeToggle')
    if (darkModeBtn) {
        const isDark = document.body.classList.contains('dark-mode')
        darkModeBtn.innerHTML = isDark ? `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="12" x2="23" y2="12"/>
            </svg>
        ` : `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
        `

        darkModeBtn.onclick = () => {
            document.body.classList.toggle('dark-mode')
            const nowDark = document.body.classList.contains('dark-mode')
            localStorage.setItem('docst_dark_mode', nowDark ? 'enabled' : 'disabled')

            if (nowDark) {
                darkModeBtn.innerHTML = `
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                        <circle cx="12" cy="12" r="5"/>
                        <line x1="12" y1="1" x2="12" y2="3"/>
                        <line x1="12" y1="21" x2="12" y2="23"/>
                        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                        <line x1="1" y1="12" x2="3" y2="12"/>
                        <line x1="21" y1="12" x2="23" y2="12"/>
                    </svg>
                `
            } else {
                darkModeBtn.innerHTML = `
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                    </svg>
                `
            }
        }
    }
}

async function init() {
    console.log('Initializing appeal page...')

    const isAuth = await checkAuth()
    if (!isAuth) return

    initDarkMode()
    initNotification()
    initReasonModal()

    // Get offense count first
    await getStudentOffenseCount()
    
    await loadPenalties()
    await loadAppeals()
    await loadNotifications()

    populatePenaltyDropdown()
    setupPenaltySelectListener()
    renderAppealsTable()

    setupDrawer(currentStudent.name, 'Student')
    setupLogout('logoutBtn')

    const submitBtn = document.getElementById('submitAppealBtn')
    const cancelBtn = document.getElementById('cancelBtn')

    if (submitBtn) submitBtn.addEventListener('click', submitAppeal)
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            const select = document.getElementById('penaltySelect')
            const reason = document.getElementById('appealReason')
            const statement = document.getElementById('supportingStatement')
            const violationName = document.getElementById('violationName')
            const violationHours = document.getElementById('violationHours')
            const violationDeadline = document.getElementById('violationDeadline')

            if (select) select.value = ''
            if (reason) reason.value = ''
            if (statement) statement.value = ''
            if (violationName) violationName.textContent = '—'
            if (violationHours) violationHours.textContent = '—'
            if (violationDeadline) violationDeadline.textContent = '—'
        })
    }

    console.log('Appeal page initialized')
}

init()