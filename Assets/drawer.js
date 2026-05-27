// ============ STUDENT DRAWER (SAME DESIGN AS ADMIN) ============

// Apply dark mode INSTANTLY before anything renders (prevents flash)
if (localStorage.getItem('docst_dark_mode') === 'enabled') {
    document.documentElement.classList.add('dark-mode');
    document.body?.classList.add('dark-mode');
}

// Add drawer color styles to match admin drawer
const drawerStyles = document.createElement('style');
drawerStyles.textContent = `
    /* Drawer Background Color - Match Admin Drawer */
    .drawer {
        background: #0f172a !important;
    }
    
    /* Dark mode adjustment */
    .dark-mode .drawer {
        background: #0f172a !important;
    }
    
    /* Drawer items hover and active states - Match Admin */
    .drawer-item:hover {
        background: rgba(255, 255, 255, 0.08) !important;
    }
    
    .drawer-item.active {
        background: rgba(37, 99, 235, 0.2) !important;
        color: #3b82f6 !important;
    }
    
    /* Drawer divider */
    .drawer-divider {
        background: rgba(255, 255, 255, 0.1) !important;
    }
    
    /* Drawer header and footer */
    .drawer-header {
        background: #0f172a !important;
    }
    
    .drawer-footer {
        background: #0f172a !important;
        border-top: 1px solid rgba(255, 255, 255, 0.1) !important;
    }
    
    /* REMOVE ALL ANIMATIONS - INSTANT LOADING */
    .drawer,
    .drawer-overlay,
    .drawer-item,
    .drawer-logout,
    .drawer-close {
        transition: none !important;
    }
    
    /* Remove hover transform animations */
    .drawer-item:hover,
    .drawer-logout:hover {
        transform: none !important;
    }
    
    /* Mobile drawer - no animations */
    @media (max-width: 768px) {
        .drawer {
            transition: none !important;
        }
        .drawer.open {
            transform: translateY(0) !important;
        }
    }
`;
document.head.appendChild(drawerStyles);

const navItems = [
    { 
        name: 'Dashboard', 
        icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
        path: '/Assets/Student_Dashboard/stud.html'
    },
    { 
        name: 'My Penalties', 
        icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/><circle cx="12" cy="12" r="3"/></svg>',
        path: '/Assets/Student_Dashboard/penalties/penalties.html'
    },
    { 
        name: 'Appeal', 
        icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 10h.01M12 10h.01M16 10h.01"/></svg>',
        path: '/Assets/Student_Dashboard/appeal/appeal.html'
    },
    { 
        name: 'History', 
        icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 8v4l3 3M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/></svg>',
        path: '/Assets/Student_Dashboard/history/history.html'
    }
];

const footerItems = [
    { 
        name: 'Settings', 
        icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>',
        path: '/Assets/Student_Dashboard/settings/setting.html'
    }
];

// ============ ACTIVE PAGE DETECTION ============
function getCurrentPage() {
    const path = window.location.pathname;
    if (path.includes('/stud.html'))            return 'Dashboard';
    if (path.includes('/penalties/penalties'))  return 'My Penalties';
    if (path.includes('/appeal/appeal'))        return 'Appeal';
    if (path.includes('/history/history'))      return 'History';
    if (path.includes('/settings/setting'))     return 'Settings';
    return '';
}

// ============ RENDER NAV ============
function renderDrawerNavigation() {
    const drawerNav = document.querySelector('.drawer-nav-main');
    if (!drawerNav) return;

    const currentPage = getCurrentPage();
    drawerNav.innerHTML = '';

    navItems.forEach(item => {
        const button = document.createElement('button');
        button.className = `drawer-item${item.name === currentPage ? ' active' : ''}`;
        button.innerHTML = `${item.icon}<span>${item.name}</span>`;
        button.addEventListener('click', () => {
            window.location.href = item.path;
        });
        drawerNav.appendChild(button);
    });

    const divider = document.createElement('hr');
    divider.className = 'drawer-divider';
    drawerNav.appendChild(divider);

    footerItems.forEach(item => {
        const button = document.createElement('button');
        button.className = `drawer-item${item.name === currentPage ? ' active' : ''}`;
        button.innerHTML = `${item.icon}<span>${item.name}</span>`;
        button.addEventListener('click', () => {
            window.location.href = item.path;
        });
        drawerNav.appendChild(button);
    });
}

// ============ UPDATE PROFILE ============
function updateDrawerProfile(studentName, studentId) {
    const drawerNameEl   = document.getElementById('drawerStudentName');
    const drawerIdEl     = document.getElementById('drawerStudentId');
    const avatarInitials = document.getElementById('avatarInitials');

    if (drawerNameEl)    drawerNameEl.textContent  = studentName || 'Student';
    if (drawerIdEl)      drawerIdEl.textContent     = studentId ? `ID: ${studentId}` : 'Student';
    if (avatarInitials)  avatarInitials.textContent = getInitials(studentName);
}

function getInitials(name) {
    if (!name || name === 'Student') return 'ST';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ============ MOBILE DRAWER CONTROLS ============
function initDrawerControls() {
    const overlay    = document.getElementById('overlay');
    const drawer     = document.getElementById('drawer');
    const hamburger  = document.getElementById('hamburger');
    const drawerClose = document.getElementById('drawerClose');

    function openDrawer() {
        drawer?.classList.add('open');
        overlay?.classList.add('open');
        document.body.style.overflow = 'hidden';
        document.body.classList.add('drawer-open');
    }

    function closeDrawer() {
        drawer?.classList.remove('open');
        overlay?.classList.remove('open');
        document.body.style.overflow = '';
        document.body.classList.remove('drawer-open');
    }

    if (hamburger) hamburger.addEventListener('click', (e) => { e.stopPropagation(); openDrawer(); });
    if (drawerClose) drawerClose.addEventListener('click', closeDrawer);
    if (overlay) overlay.addEventListener('click', closeDrawer);

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') closeDrawer();
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) closeDrawer();
    });
}

// ============ GET CURRENT STUDENT FROM STORAGE ============
function getCurrentStudent() {
    try {
        const stored = localStorage.getItem('currentStudent');
        if (stored) {
            return JSON.parse(stored);
        }
        return null;
    } catch {
        return null;
    }
}

// ============ MAIN EXPORT ============
export function setupDrawer(studentName, studentId) {
    updateDrawerProfile(studentName, studentId);
    renderDrawerNavigation();
    initDrawerControls();
}

// ============ LOGOUT ============
export function setupLogout(logoutBtnId = 'logoutBtn') {
    const logoutBtn = document.getElementById(logoutBtnId);
    if (!logoutBtn) return;

    const newBtn = logoutBtn.cloneNode(true);
    logoutBtn.parentNode.replaceChild(newBtn, logoutBtn);

    newBtn.addEventListener('click', async () => {
        if (!confirm('Are you sure you want to logout?')) return;
        
        try {
            const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.39.0');
            const supabase = createClient(
                import.meta.env.VITE_SUPABASE_URL,
                import.meta.env.VITE_SUPABASE_ANON_KEY
            );

            await supabase.auth.signOut();
            localStorage.removeItem('currentStudent');
            localStorage.removeItem('currentAdmin');
            localStorage.removeItem('hasSeenWelcomeNotification');
            sessionStorage.clear();
            
            window.location.href = '/';
        } catch (error) {
            console.error('Logout error:', error);
            alert('Failed to logout. Please try again.');
            
            const btn = document.getElementById(logoutBtnId);
            if (btn) {
                btn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout';
                btn.disabled = false;
            }
        }
    });
}

// Auto-initialize drawer when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const student = getCurrentStudent();
        const studentName = student?.name || student?.full_name || 'Student';
        const studentId = student?.studentId || student?.id;
        setupDrawer(studentName, studentId);
        setupLogout('logoutBtn');
    });
} else {
    const student = getCurrentStudent();
    const studentName = student?.name || student?.full_name || 'Student';
    const studentId = student?.studentId || student?.id;
    setupDrawer(studentName, studentId);
    setupLogout('logoutBtn');
}

requestAnimationFrame(() => {
    requestAnimationFrame(() => {
        document.documentElement.classList.add('transitions-ready');
    });
});