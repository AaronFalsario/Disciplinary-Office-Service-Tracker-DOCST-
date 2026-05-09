// ============ STUDENT DRAWER ============

// Apply dark mode INSTANTLY before anything renders (prevents flash)
if (localStorage.getItem('docst_dark_mode') === 'enabled') {
    document.documentElement.classList.add('dark-mode');
    document.body?.classList.add('dark-mode');
}

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
function initDrawer() {
    const overlay    = document.getElementById('overlay');
    const drawer     = document.getElementById('drawer');
    const hamburger  = document.getElementById('hamburger');
    const drawerClose = document.getElementById('drawerClose');

    function openDrawer() {
        drawer?.classList.add('open');
        overlay?.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    function closeDrawer() {
        drawer?.classList.remove('open');
        overlay?.classList.remove('open');
        document.body.style.overflow = '';
    }

    hamburger?.addEventListener('click', e => { e.stopPropagation(); openDrawer(); });
    drawerClose?.addEventListener('click', closeDrawer);
    overlay?.addEventListener('click', closeDrawer);

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') closeDrawer();
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) closeDrawer();
    });
}

// ============ MAIN EXPORT ============
export function setupDrawer(studentName, studentId) {
    updateDrawerProfile(studentName, studentId);
    renderDrawerNavigation();
    initDrawer();
}

// ============ LOGOUT ============
export function setupLogout(logoutBtnId = 'logoutBtn') {
    const logoutBtn = document.getElementById(logoutBtnId);
    if (!logoutBtn) return;

    const newBtn = logoutBtn.cloneNode(true);
    logoutBtn.parentNode.replaceChild(newBtn, logoutBtn);

    newBtn.addEventListener('click', async () => {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
            import.meta.env.VITE_SUPABASE_URL,
            import.meta.env.VITE_SUPABASE_ANON_KEY
        );

        await supabase.auth.signOut();
        localStorage.removeItem('currentStudent');
        localStorage.removeItem('currentAdmin');
        window.location.href = '/'; // ✅ correct Vercel root
    });
}

requestAnimationFrame(() => {
    requestAnimationFrame(() => {
        document.documentElement.classList.add('transitions-ready');
    });
});