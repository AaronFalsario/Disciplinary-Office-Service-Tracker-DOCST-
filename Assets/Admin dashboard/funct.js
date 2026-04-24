// Drawer functionality - Always visible on desktop, toggle on mobile
const overlay = document.getElementById('overlay');
const drawer = document.getElementById('drawer');
const hamburger = document.getElementById('hamburger');
const drawerClose = document.getElementById('drawerClose');
const adminPill = document.getElementById('adminPill');

    function openDrawer() {
        overlay.classList.add('open');
        drawer.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

        function closeDrawer() {
            overlay.classList.remove('open');
            drawer.classList.remove('open');
            document.body.style.overflow = '';
        }

        if (window.innerWidth <= 768) {
            hamburger?.addEventListener('click', openDrawer);
            drawerClose?.addEventListener('click', closeDrawer);
            overlay?.addEventListener('click', closeDrawer);
            adminPill?.addEventListener('click', openDrawer);
        } else {
            drawer.classList.remove('open');
            overlay.classList.remove('open');
        }
        // Handle window resize
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                closeDrawer();
                drawer.classList.remove('open');
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeDrawer();
        });

        // Set current date
        const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        document.getElementById('currentDate').textContent = new Date().toLocaleDateString('en-US', dateOptions);

        // Load admin name from localStorage
        const currentAdmin = localStorage.getItem('currentAdmin');
        if (currentAdmin) {
            try {
                const admin = JSON.parse(currentAdmin);
                if (admin.name) {
                    document.getElementById('adminName').textContent = admin.name;
                }
            } catch(e) {}
        }

        // Load data from localStorage
        function loadDashboardData() {
            // Load students
            let students = [];
            const studentsData = localStorage.getItem('campus_care_students');
            if (studentsData) {
                students = JSON.parse(studentsData);
            }
            
            // Load penalties
            let penalties = [];
            const penaltiesData = localStorage.getItem('campus_care_penalties');
            if (penaltiesData) {
                penalties = JSON.parse(penaltiesData);
            }
            
            // Update stats
            const totalStudents = students.length;
            const activePenalties = penalties.filter(p => p.status !== 'completed').length;
            const completedHours = penalties
                .filter(p => p.status === 'completed')
                .reduce((sum, p) => sum + (parseInt(p.hours) || 0), 0);
            const complianceRate = totalStudents > 0 ? Math.min(Math.round((completedHours / (totalStudents * 10)) * 100), 100) : 0;
            
            document.getElementById('totalStudents').textContent = totalStudents;
            document.getElementById('activePenalties').textContent = activePenalties;
            document.getElementById('completedHours').textContent = completedHours;
            document.getElementById('complianceRate').textContent = complianceRate;
            
            // Update recent penalties table
            const recentPenalties = [...penalties].sort((a, b) => b.id - a.id).slice(0, 5);
            const tbody = document.getElementById('recentPenaltiesBody');
            
            if (recentPenalties.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" class="empty-state"><div class="empty-icon">⚠️</div><div>No penalty records found</div></td></tr>`;
            } else {
                tbody.innerHTML = recentPenalties.map(p => `
                    <tr>
                        <td><strong>${escapeHtml(p.studentId)}</strong></td>
                        <td>${escapeHtml(p.violation)}</td>
                        <td>${p.hours} hrs</td>
                        <td><span class="status-badge status-${p.status === 'in-progress' ? 'progress' : p.status}">${p.status === 'in-progress' ? 'In Progress' : p.status.charAt(0).toUpperCase() + p.status.slice(1)}</span></td>
                        <td>${formatDate(p.deadline)}</td>
                    </tr>
                `).join('');
            }
            
            // Update top violations
            const violationCount = {};
            penalties.forEach(p => {
                const violation = p.violation;
                violationCount[violation] = (violationCount[violation] || 0) + 1;
            });
            
            const topViolations = Object.entries(violationCount)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5);
            
            const violationsContainer = document.getElementById('violationsContainer');
            if (topViolations.length === 0) {
                violationsContainer.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><div>No violations recorded yet</div></div>`;
            } else {
                violationsContainer.innerHTML = topViolations.map(([name, count]) => `
                    <div class="violation-item">
                        <span class="violation-name">${escapeHtml(name)}</span>
                        <span class="violation-count">${count} cases</span>
                    </div>
                `).join('');
            }
            
            // Update chart
            updateChart(penalties);
            
            // Update activity feed
            updateActivityFeed(students, penalties);
        }
        
        function formatDate(dateString) {
            if (!dateString) return 'N/A';
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        }
        
        function escapeHtml(text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
        
        let penaltyChart;
        
        function updateChart(penalties) {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const last6Months = [];
            const currentDate = new Date();
            
            for (let i = 5; i >= 0; i--) {
                const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
                last6Months.push(months[d.getMonth()] + ' ' + d.getFullYear());
            }
            
            const monthlyCounts = last6Months.map(() => 0);
            
            penalties.forEach(penalty => {
                if (penalty.dateCreated) {
                    const date = new Date(penalty.dateCreated);
                    const monthYear = months[date.getMonth()] + ' ' + date.getFullYear();
                    const index = last6Months.indexOf(monthYear);
                    if (index !== -1) {
                        monthlyCounts[index]++;
                    }
                }
            });
            
            const ctx = document.getElementById('penaltyChart').getContext('2d');
            
            if (penaltyChart) {
                penaltyChart.destroy();
            }
            
            penaltyChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: last6Months,
                    datasets: [{
                        label: 'Penalties Issued',
                        data: monthlyCounts,
                        borderColor: '#2563EB',
                        backgroundColor: 'rgba(37, 99, 235, 0.05)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#2563EB',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: '#E2E8F0'
                            },
                            ticks: {
                                stepSize: 1
                            }
                        },
                        x: {
                            grid: {
                                display: false
                            }
                        }
                    }
                }
            });
        }
        
        function updateActivityFeed(students, penalties) {
            const activities = [];
            
            // Add student activities
            students.forEach(student => {
                if (student.dateAdded) {
                    activities.push({
                        type: 'student',
                        text: `New student registered: ${student.name}`,
                        time: new Date(student.dateAdded),
                        icon: '👨‍🎓'
                    });
                }
            });
            
            // Add penalty activities
            penalties.forEach(penalty => {
                if (penalty.dateCreated) {
                    activities.push({
                        type: 'penalty',
                        text: `Penalty issued to ${penalty.studentId} for ${penalty.violation}`,
                        time: new Date(penalty.dateCreated),
                        icon: '⚠️'
                    });
                }
            });
            
            // Sort by time (most recent first)
            activities.sort((a, b) => b.time - a.time);
            const recentActivities = activities.slice(0, 5);
            
            const activityContainer = document.getElementById('activityContainer');
            if (recentActivities.length === 0) {
                activityContainer.innerHTML = `<div class="empty-state"><div class="empty-icon">📭</div><div>No recent activity</div></div>`;
            } else {
                activityContainer.innerHTML = recentActivities.map(activity => `
                    <div class="activity-item">
                        <div class="activity-icon">${activity.icon}</div>
                        <div class="activity-content">
                            <div class="activity-text">${escapeHtml(activity.text)}</div>
                            <div class="activity-time">${formatRelativeTime(activity.time)}</div>
                        </div>
                    </div>
                `).join('');
            }
        }
        
        function formatRelativeTime(date) {
            const now = new Date();
            const diffMs = now - date;
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);
            
            if (diffMins < 1) return 'Just now';
            if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
            if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
            return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        }
        
        // Logout
        document.getElementById('logoutBtn')?.addEventListener('click', () => {
            if (confirm('Are you sure you want to logout?')) {
                localStorage.removeItem('currentAdmin');
                window.location.href = '/LANDING PAGE/land.html';
            }
        });
        
        // Notification button
        document.getElementById('notifyBtn')?.addEventListener('click', () => {
            alert('🔔 No new notifications at this time.');
        });
        loadDashboardData()
        setInterval(loadDashboardData, 30000);