// ============ CENTRALIZED DRAWER COMPONENT ============
// This file handles the drawer functionality for all pages

// Navigation items configuration
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

// Flag to prevent multiple initialization
let isDrawerInitialized = false;

// Function to get current page name from URL
function getCurrentPage() {
    const path = window.location.pathname;
    if (path.includes('stud.html')) return 'Dashboard';
    if (path.includes('penalties')) return 'My Penalties';
    if (path.includes('appeal')) return 'Appeal';
    if (path.includes('history')) return 'History';
    if (path.includes('setting')) return 'Settings';
    return '';
}

// Function to render drawer navigation (called only once)
function renderDrawerNavigation() {
    const drawerNav = document.querySelector('.drawer-nav-main');
    if (!drawerNav) return;
    
    const currentPage = getCurrentPage();
    
    // Clear existing content
    drawerNav.innerHTML = '';
    
    // Add main navigation items
    navItems.forEach(item => {
        const isActive = item.name === currentPage;
        const button = document.createElement('button');
        button.className = `drawer-item ${isActive ? 'active' : ''}`;
        button.innerHTML = `
            ${item.icon}
            <span>${item.name}</span>
        `;
        button.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = item.path;
        });
        drawerNav.appendChild(button);
    });
    
    // Add divider
    const divider = document.createElement('hr');
    divider.className = 'drawer-divider';
    drawerNav.appendChild(divider);
    
    // Add footer items (Settings)
    footerItems.forEach(item => {
        const isActive = item.name === currentPage;
        const button = document.createElement('button');
        button.className = `drawer-item ${isActive ? 'active' : ''}`;
        button.innerHTML = `
            ${item.icon}
            <span>${item.name}</span>
        `;
        button.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = item.path;
        });
        drawerNav.appendChild(button);
    });
}

// Function to update drawer profile (called on each page load)
function updateDrawerProfile(studentName, studentId) {
    const drawerNameEl = document.getElementById('drawerStudentName');
    const drawerIdEl = document.getElementById('drawerStudentId');
    const avatarInitials = document.getElementById('avatarInitials');
    
    if (drawerNameEl) {
        drawerNameEl.textContent = studentName || 'Student';
    }
    
    if (drawerIdEl) {
        drawerIdEl.textContent = studentId ? `ID: ${studentId}` : 'Student';
    }
    
    if (avatarInitials && studentName) {
        const initials = getInitials(studentName);
        avatarInitials.textContent = initials;
    }
}

// Helper to get initials
function getInitials(name) {
    if (!name || name === 'Student') return 'ST';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
        return parts[0].substring(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Drawer functionality - NO ANIMATIONS
function initDrawer() {
    // Only initialize once
    if (isDrawerInitialized) return;
    isDrawerInitialized = true;
    
    const overlay = document.getElementById('overlay');
    const drawer = document.getElementById('drawer');
    const hamburger = document.getElementById('hamburger');
    const drawerClose = document.getElementById('drawerClose');
    
    function openDrawer() {
        if (drawer && overlay) {
            drawer.classList.add('open');
            overlay.classList.add('open');
            document.body.style.overflow = 'hidden';
        }
    }
    
    function closeDrawer() {
        if (drawer && overlay) {
            drawer.classList.remove('open');
            overlay.classList.remove('open');
            document.body.style.overflow = '';
        }
    }
    
    // Only add mobile drawer functionality
    if (window.innerWidth <= 768) {
        if (overlay) {
            overlay.addEventListener('click', closeDrawer);
        }
        
        if (hamburger) {
            hamburger.addEventListener('click', (e) => {
                e.stopPropagation();
                openDrawer();
            });
        }
        
        if (drawerClose) {
            drawerClose.addEventListener('click', closeDrawer);
        }
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && drawer && drawer.classList.contains('open')) {
                closeDrawer();
            }
        });
    }
    
    // On resize, close drawer if switching to desktop
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768 && drawer && drawer.classList.contains('open')) {
            closeDrawer();
        }
    });
}

// Initialize everything (called once per page load)
export function setupDrawer(studentName, studentId) {
    // Update profile info (always update on each page)
    updateDrawerProfile(studentName, studentId);
    
    // Render navigation and initialize drawer only once
    if (!isDrawerInitialized) {
        renderDrawerNavigation();
        initDrawer();
    } else {
        // Just update the active state on navigation items
        const currentPage = getCurrentPage();
        const allItems = document.querySelectorAll('.drawer-item');
        allItems.forEach(item => {
            const span = item.querySelector('span');
            if (span && span.textContent === currentPage) {
                item.classList.add('active');
            } else if (span) {
                item.classList.remove('active');
            }
        });
    }
}

// Logout function
export function setupLogout(logoutBtnId = 'logoutBtn') {
    const logoutBtn = document.getElementById(logoutBtnId);
    if (logoutBtn) {
        // Remove existing listeners to prevent duplicates
        const newLogoutBtn = logoutBtn.cloneNode(true);
        logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);
        
        newLogoutBtn.addEventListener('click', async () => {
            const { createClient } = await import('@supabase/supabase-js');
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
            const supabase = createClient(supabaseUrl, supabaseKey);
            
            await supabase.auth.signOut();
            localStorage.removeItem('currentStudent');
            localStorage.removeItem('currentAdmin');
            window.location.href = '/Assets/Landing/index.html';
        });
    }
}