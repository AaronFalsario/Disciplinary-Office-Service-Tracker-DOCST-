        const PENALTIES_STORAGE_KEY = 'campus_care_penalties';

        let penalties = [];
        let currentEditPenaltyId = null;
        let selectedPenalties = new Set();

        // Drawer functionality - Always visible on desktop
        function initializeDrawer() {
            const overlay = document.getElementById('overlay');
            const drawer = document.getElementById('drawer');
            const hamburger = document.getElementById('hamburger');
            const drawerClose = document.getElementById('drawerClose');
            const adminPill = document.getElementById('adminPill');
            
            window.openDrawer = function() {
                overlay.classList.add('open');
                drawer.classList.add('open');
                document.body.style.overflow = 'hidden';
            };
            
            window.closeDrawer = function() {
                overlay.classList.remove('open');
                drawer.classList.remove('open');
                document.body.style.overflow = '';
            };
            
            // Only add mobile-specific listeners
            if (window.innerWidth <= 768) {
                if (hamburger) hamburger.addEventListener('click', window.openDrawer);
                if (drawerClose) drawerClose.addEventListener('click', window.closeDrawer);
                if (overlay) overlay.addEventListener('click', window.closeDrawer);
                if (adminPill) adminPill.addEventListener('click', window.openDrawer);
            }
            
            // Handle window resize
            window.addEventListener('resize', () => {
                if (window.innerWidth > 768) {
                    window.closeDrawer();
                    drawer.classList.remove('open');
                } else {
                    drawer.classList.remove('open');
                }
            });
            
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') window.closeDrawer();
            });
        }

        // Initialize
        document.addEventListener('DOMContentLoaded', () => {
            initializeDrawer();
            loadPenalties();
            setupEventListeners();
            renderPenaltiesTable();
            updateStats();
        });

        // Load Penalties from localStorage
        function loadPenalties() {
            const stored = localStorage.getItem(PENALTIES_STORAGE_KEY);
            if (stored) {
                penalties = JSON.parse(stored);
            } else {
                penalties = [];
                savePenalties();
            }
        }

        // Save Penalties to localStorage
        function savePenalties() {
            localStorage.setItem(PENALTIES_STORAGE_KEY, JSON.stringify(penalties));
        }

        // Update Statistics
        function updateStats() {
            const totalPenalties = penalties.length;
            const pendingCases = penalties.filter(p => p.status === 'pending').length;
            const completedHours = penalties
                .filter(p => p.status === 'completed')
                .reduce((sum, p) => sum + parseInt(p.hours || 0), 0);
            
            // Get total students from student management system
            let totalStudents = 0;
            const studentsData = localStorage.getItem('campus_care_students');
            if (studentsData) {
                const students = JSON.parse(studentsData);
                totalStudents = students.length;
            }
            
            document.getElementById('totalStudents').textContent = totalStudents;
            document.getElementById('totalPenalties').textContent = totalPenalties;
            document.getElementById('pendingCases').textContent = pendingCases;
            document.getElementById('completedHours').textContent = completedHours;
        }

        // Render Penalties Table
        function renderPenaltiesTable() {
            const tbody = document.getElementById('penaltiesTableBody');
            if (!tbody) return;
            
            if (penalties.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="8" style="text-align: center; padding: 60px;">
                            <div class="empty-state">
                                <div class="empty-icon">⚠️</div>
                                <div class="empty-title">No Penalty Records</div>
                                <div class="empty-sub">Click "Add Penalty" to create a new penalty record</div>
                            </div>
                        </td>
                    </tr>
                `;
                return;
            }
            
            tbody.innerHTML = penalties.map(penalty => `
                <tr data-penalty-id="${penalty.id}">
                    <td>
                        <input type="checkbox" class="penalty-checkbox" data-id="${penalty.id}" ${selectedPenalties.has(penalty.id) ? 'checked' : ''}>
                    </td>
                    <td><strong>${escapeHtml(penalty.studentId)}</strong></td>
                    <td>${escapeHtml(penalty.violation)}</td>
                    <td>${escapeHtml(penalty.serviceType)}</td>
                    <td>${penalty.hours}</td>
                    <td>
                        <span class="status-badge status-${penalty.status === 'in-progress' ? 'in-progress' : penalty.status}">
                            ${penalty.status === 'in-progress' ? 'In Progress' : penalty.status.charAt(0).toUpperCase() + penalty.status.slice(1)}
                        </span>
                    </td>
                    <td>${formatDate(penalty.deadline)}</td>
                    <td>
                        <button class="table-action-btn view-btn" onclick="viewPenalty('${penalty.id}')" title="View/Edit">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="3"/>
                                <path d="M22 12c-2.667 4.667-6 7-10 7s-7.333-2.333-10-7c2.667-4.667 6-7 10-7s7.333 2.333 10 7z"/>
                            </svg>
                        </button>
                    </td>
                <tr>
            `).join('');
            
            // Re-attach checkbox event listeners
            document.querySelectorAll('.penalty-checkbox').forEach(cb => {
                cb.addEventListener('change', (e) => {
                    const id = parseInt(e.target.getAttribute('data-id'));
                    if (e.target.checked) {
                        selectedPenalties.add(id);
                    } else {
                        selectedPenalties.delete(id);
                    }
                    updateSelectAllCheckbox();
                });
            });
            
            updateSelectAllCheckbox();
        }

        function formatDate(dateString) {
            if (!dateString) return 'N/A';
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
        }

        function updateSelectAllCheckbox() {
            const selectAll = document.getElementById('selectAll');
            if (!selectAll) return;
            
            const allCheckboxes = document.querySelectorAll('.penalty-checkbox');
            if (allCheckboxes.length === 0) {
                selectAll.checked = false;
                selectAll.indeterminate = false;
                return;
            }
            
            const checkedCount = document.querySelectorAll('.penalty-checkbox:checked').length;
            selectAll.checked = checkedCount === allCheckboxes.length;
            selectAll.indeterminate = checkedCount > 0 && checkedCount < allCheckboxes.length;
        }

        // Setup Event Listeners
        function setupEventListeners() {
            // Add Penalty Button
            const addBtn = document.getElementById('addPenaltyBtn');
            if (addBtn) {
                addBtn.addEventListener('click', openAddPenaltyModal);
            }
            
            // Modal Close
            const closeModalBtn = document.getElementById('closeModalBtn');
            if (closeModalBtn) {
                closeModalBtn.addEventListener('click', closePenaltyModal);
            }
            
            // Modal Overlay Click
            const modal = document.getElementById('penaltyModal');
            if (modal) {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) closePenaltyModal();
                });
            }
            
            // Penalty Form Submit
            const penaltyForm = document.getElementById('penaltyForm');
            if (penaltyForm) {
                penaltyForm.addEventListener('submit', savePenalty);
            }
            
            // Select All
            const selectAll = document.getElementById('selectAll');
            if (selectAll) {
                selectAll.addEventListener('change', (e) => {
                    const checkboxes = document.querySelectorAll('.penalty-checkbox');
                    checkboxes.forEach(cb => {
                        cb.checked = e.target.checked;
                        const id = parseInt(cb.getAttribute('data-id'));
                        if (e.target.checked) {
                            selectedPenalties.add(id);
                        } else {
                            selectedPenalties.delete(id);
                        }
                    });
                });
            }
            
            // Edit Button
            const editBtn = document.getElementById('editPenaltyBtn');
            if (editBtn) {
                editBtn.addEventListener('click', () => {
                    if (selectedPenalties.size === 0) {
                        showNotification('Please select a penalty to edit', 'warning');
                    } else if (selectedPenalties.size > 1) {
                        showNotification('Please select only one penalty to edit', 'warning');
                    } else {
                        const id = Array.from(selectedPenalties)[0];
                        editPenaltyById(id);
                    }
                });
            }
            
            // Delete Button
            const deleteBtn = document.getElementById('deletePenaltyBtn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => {
                    if (selectedPenalties.size === 0) {
                        showNotification('Please select at least one penalty to delete', 'warning');
                    } else {
                        deleteSelectedPenalties();
                    }
                });
            }
            
            // Community Service Button
            const serviceBtn = document.getElementById('communityServiceBtn');
            if (serviceBtn) {
                serviceBtn.addEventListener('click', () => {
                    const servicePenalties = penalties.filter(p => 
                        p.serviceType?.toLowerCase().includes('service') || 
                        p.serviceType?.toLowerCase().includes('cleanup') ||
                        p.serviceType?.toLowerCase().includes('garden')
                    );
                    if (servicePenalties.length === 0) {
                        showNotification('No community service penalties found', 'info');
                    } else {
                        showNotification(`Found ${servicePenalties.length} community service penalty records`, 'info');
                    }
                });
            }
            
            // Logout
            const logoutBtn = document.getElementById('logoutBtn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', handleLogout);
            }
            
            // Escape key for modal
            document.addEventListener('keydown', (e) => {
                const modal = document.getElementById('penaltyModal');
                if (e.key === 'Escape' && modal.classList.contains('open')) {
                    closePenaltyModal();
                }
            });
        }

        function openAddPenaltyModal() {
            currentEditPenaltyId = null;
            document.getElementById('modalTitle').textContent = 'Add New Penalty';
            document.getElementById('penaltyForm').reset();
            document.getElementById('penaltyId').value = '';
            document.getElementById('penaltyModal').classList.add('open');
        }

        function editPenaltyById(id) {
            const penalty = penalties.find(p => p.id === id);
            if (!penalty) return;
            
            currentEditPenaltyId = id;
            document.getElementById('modalTitle').textContent = 'Edit Penalty';
            document.getElementById('penaltyId').value = penalty.id;
            document.getElementById('penaltyStudentId').value = penalty.studentId;
            document.getElementById('penaltyViolation').value = penalty.violation;
            document.getElementById('penaltyServiceType').value = penalty.serviceType;
            document.getElementById('penaltyHours').value = penalty.hours;
            document.getElementById('penaltyStatus').value = penalty.status;
            document.getElementById('penaltyDeadline').value = penalty.deadline;
            document.getElementById('penaltyModal').classList.add('open');
        }

        function savePenalty(e) {
            e.preventDefault();
            
            const penaltyData = {
                studentId: document.getElementById('penaltyStudentId').value,
                violation: document.getElementById('penaltyViolation').value,
                serviceType: document.getElementById('penaltyServiceType').value,
                hours: parseInt(document.getElementById('penaltyHours').value),
                status: document.getElementById('penaltyStatus').value,
                deadline: document.getElementById('penaltyDeadline').value
            };
            
            if (currentEditPenaltyId) {
                // Update existing penalty
                const index = penalties.findIndex(p => p.id === currentEditPenaltyId);
                if (index !== -1) {
                    penalties[index] = { ...penalties[index], ...penaltyData };
                    showNotification('Penalty updated successfully!', 'success');
                }
            } else {
                // Add new penalty
                const newPenalty = {
                    id: Date.now(),
                    ...penaltyData,
                    dateCreated: new Date().toISOString()
                };
                penalties.push(newPenalty);
                showNotification('Penalty added successfully!', 'success');
            }
            
            savePenalties();
            renderPenaltiesTable();
            updateStats();
            closePenaltyModal();
        }

        function deleteSelectedPenalties() {
            if (confirm(`Are you sure you want to delete ${selectedPenalties.size} penalty/penalties?`)) {
                penalties = penalties.filter(p => !selectedPenalties.has(p.id));
                selectedPenalties.clear();
                savePenalties();
                renderPenaltiesTable();
                updateStats();
                showNotification('Penalties deleted successfully!', 'success');
            }
        }

        window.viewPenalty = function(id) {
            editPenaltyById(parseInt(id));
        };

        function closePenaltyModal() {
            document.getElementById('penaltyModal').classList.remove('open');
            currentEditPenaltyId = null;
            document.getElementById('penaltyForm').reset();
        }

        function handleLogout() {
            if (confirm('Are you sure you want to logout?')) {
                showNotification('Logged out successfully', 'success');
                setTimeout(() => {
                    window.location.href = '/LANDING PAGE/land.html';
                }, 1000);
            }
        }

        function showNotification(message, type = 'success') {
            const notification = document.createElement('div');
            notification.textContent = message;
            const bgColor = type === 'success' ? 'var(--blue)' : (type === 'warning' ? 'var(--amber-dark)' : 'var(--text-2)');
            notification.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                padding: 12px 20px;
                background: ${bgColor};
                color: white;
                border-radius: 10px;
                font-size: 13px;
                font-weight: 500;
                z-index: 10000;
                animation: slideIn 0.3s ease;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            `;
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }, 3000);
        }

        function escapeHtml(text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }