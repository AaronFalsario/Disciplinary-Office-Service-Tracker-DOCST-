        import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

        const supabaseUrl = 'https://vzrolreickfylygagmlg.supabase.co'
        const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6cm9scmVpY2tmeWx5Z2FnbWxnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwMTMxOTAsImV4cCI6MjA5MjU4OTE5MH0.O63_YaRF0hRtSCMJRRRfhwtpNMgOE8eugnR0jRuEAv8'
        const supabase = createClient(supabaseUrl, supabaseKey)

        let currentStudent = null
        let myPenalties = []

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

        function getStudentInitials(name) {
            if (!name) return 'ST'
            const parts = name.trim().split(/\s+/)
            if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        }

        function showNotification(message, type = 'success') {
            const notification = document.createElement('div')
            notification.textContent = message
            const bgColor = type === 'success' ? '#10B981' : (type === 'error' ? '#EF4444' : '#F59E0B')
            notification.style.cssText = `
                position: fixed; bottom: 20px; right: 20px; padding: 12px 20px;
                background: ${bgColor}; color: white; border-radius: 10px; font-size: 13px;
                font-weight: 500; z-index: 10000; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                animation: slideIn 0.3s ease;
            `
            document.body.appendChild(notification)
            setTimeout(() => notification.remove(), 3000)
        }

        function loadCurrentStudent() {
            const stored = localStorage.getItem('currentStudent')
            if (!stored) {
                window.location.href = '/Assets/Student Authentication/Student.html'
                return false
            }
            currentStudent = JSON.parse(stored)
            
            document.getElementById('studentName').textContent = currentStudent.name || 'Student'
            document.getElementById('studentId').textContent = `ID: ${currentStudent.studentId || '---'}`
            
            const initials = getStudentInitials(currentStudent.name)
            document.getElementById('avatarInitials').textContent = initials
            
            return true
        }

        async function loadMyPenalties() {
            if (!currentStudent) return []
            
            try {
                const { data, error } = await supabase
                    .from('penalties')
                    .select('*')
                    .eq('student_id', currentStudent.studentId)
                    .order('created_at', { ascending: false })
                
                if (error) throw error
                myPenalties = data || []
                return myPenalties
            } catch (error) {
                console.error('Error loading penalties:', error)
                myPenalties = []
                return []
            }
        }

        function updateStats() {
            const totalViolations = myPenalties.length
            const pending = myPenalties.filter(p => p.status !== 'completed').length
            const completedHours = myPenalties
                .filter(p => p.status === 'completed')
                .reduce((sum, p) => sum + (parseInt(p.hours) || 0), 0)
            const totalHours = myPenalties.reduce((sum, p) => sum + (parseInt(p.hours) || 0), 0)
            const complianceRate = totalHours > 0 ? Math.round((completedHours / totalHours) * 100) : 100
            
            document.getElementById('pendingPenalties').textContent = pending
            document.getElementById('completedHours').textContent = completedHours
            document.getElementById('totalViolations').textContent = totalViolations
            document.getElementById('complianceRate').textContent = `${complianceRate}%`
        }

        function renderPenaltiesTable() {
            const tbody = document.getElementById('penaltiesTableBody')
            if (!tbody) return
            
            if (myPenalties.length === 0) {
                tbody.innerHTML = `
                    <tr><td colspan="5" class="empty-state">
                        <div class="empty-icon">✅</div>
                        <div class="empty-title">No Penalty Records</div>
                        <div class="empty-sub">You have no violations recorded. Great job! 🎉</div>
                    </td></tr>
                `
                return
            }
            
            tbody.innerHTML = myPenalties.map(penalty => {
                let statusClass = 'status-pending'
                let statusText = 'Pending'
                
                if (penalty.status === 'completed') {
                    statusClass = 'status-completed'
                    statusText = 'Completed'
                } else if (penalty.status === 'in-progress') {
                    statusClass = 'status-in-progress'
                    statusText = 'In Progress'
                }
                
                return `
                    <tr>
                        <td><strong>${escapeHtml(penalty.violation)}</strong></td>
                        <td>${escapeHtml(penalty.service_type || 'Community Service')}</td>
                        <td>${penalty.hours} hrs</td>
                        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                        <td>${formatDate(penalty.deadline)}</td>
                    </tr>
                `
            }).join('')
        }

        function initializeDrawer() {
            const overlay = document.getElementById('overlay')
            const drawer = document.getElementById('drawer')
            const hamburger = document.getElementById('hamburger')
            const drawerClose = document.getElementById('drawerClose')
            
            function openDrawer() {
                overlay.classList.add('open')
                drawer.classList.add('open')
                document.body.style.overflow = 'hidden'
            }
            
            function closeDrawer() {
                overlay.classList.remove('open')
                drawer.classList.remove('open')
                document.body.style.overflow = ''
            }
            
            if (window.innerWidth <= 768) {
                if (hamburger) hamburger.addEventListener('click', openDrawer)
                if (drawerClose) drawerClose.addEventListener('click', closeDrawer)
                if (overlay) overlay.addEventListener('click', closeDrawer)
            }
            
            window.addEventListener('resize', () => {
                if (window.innerWidth > 768) {
                    drawer.classList.remove('open')
                    overlay.classList.remove('open')
                }
            })
            
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && window.innerWidth <= 768) closeDrawer()
            })
        }

        function initNotification() {
            const notifyBtn = document.getElementById('notifyBtn')
            if (notifyBtn) {
                notifyBtn.addEventListener('click', () => {
                    alert('🔔 No new notifications at this time.')
                })
            }
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
                        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
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
                                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
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

        async function refreshDashboard() {
            await loadMyPenalties()
            updateStats()
            renderPenaltiesTable()
        }

        async function handleLogout() {
            if (confirm('Are you sure you want to logout?')) {
                await supabase.auth.signOut()
                localStorage.removeItem('currentStudent')
                showNotification('Logged out successfully')
                setTimeout(() => {
                    window.location.href = '/Assets/Student Authentication/Student.html'
                }, 1000)
            }
        }

        async function init() {
            if (!loadCurrentStudent()) return
            
            initializeDrawer()
            initDarkMode()
            initNotification()
            await refreshDashboard()
            
            const logoutBtn = document.getElementById('logoutBtn')
            if (logoutBtn) logoutBtn.addEventListener('click', handleLogout)
        }
        
        init()