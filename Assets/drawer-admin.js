// ============ ADMIN DRAWER ============

// Admin navigation items
const adminNavItems = [
    { 
        icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>', 
        label: 'Dashboard', 
        href: '/Assets/Admin dashboard/Admin.html'
    },
    { 
        icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>', 
        label: 'Users', 
        href: '/Assets/Admin dashboard/students/record.html'
    },
    { 
        icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/><circle cx="12" cy="12" r="3"/></svg>', 
        label: 'Penalties', 
        href: '/Assets/Admin dashboard/penalties/student.html'
    },
    { 
        icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>', 
        label: 'Reports', 
        href: '/Assets/Admin dashboard/Reports/reports.html'
    },
    { 
        icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>', 
        label: 'Settings', 
        href: '/Assets/Admin dashboard/settings/setting.html'
    }
];

// Initialize admin drawer
function setupAdminDrawer(adminName, adminId) {
    console.log('🎨 Setting up admin drawer...', adminName, adminId);
    
    const drawerNav = document.getElementById('drawerNavMain');
    if (!drawerNav) {
        console.error('drawerNavMain element not found!');
        return;
    }
    
    // Clear existing nav
    drawerNav.innerHTML = '';
    
    // Add navigation items
    adminNavItems.forEach((item, index) => {
        const isActive = window.location.pathname === item.href;
        const button = document.createElement('button');
        button.className = `drawer-item ${isActive ? 'active' : ''}`;
        button.innerHTML = `${item.icon} <span>${item.label}</span>`;
        button.onclick = () => {
            window.location.href = item.href;
        };
        drawerNav.appendChild(button);
        
        // Add divider after Penalties
        if (item.label === 'Penalties') {
            const divider = document.createElement('hr');
            divider.className = 'drawer-divider';
            drawerNav.appendChild(divider);
        }
    });
    
    // Update admin name and ID in drawer
    const drawerNameEl = document.getElementById('drawerAdminName');
    const drawerIdEl = document.getElementById('drawerAdminId');
    const avatarInitials = document.getElementById('avatarInitials');
    
    if (drawerNameEl) drawerNameEl.textContent = adminName || 'Administrator';
    if (drawerIdEl) drawerIdEl.textContent = adminId || 'Admin';
    
    // Update avatar initials
    if (avatarInitials && adminName) {
        const initials = getAdminInitials(adminName);
        avatarInitials.textContent = initials;
    }
    
    console.log('✅ Admin drawer setup complete');
}

// Get admin initials
function getAdminInitials(fullName) {
    if (!fullName || fullName === 'Administrator') return 'AD';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) {
        return parts[0].substring(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Get current admin from localStorage
function getCurrentAdmin() {
    const stored = localStorage.getItem('currentAdmin');
    if (stored) {
        try {
            return JSON.parse(stored);
        } catch (e) {
            return null;
        }
    }
    return null;
}

// Setup admin logout
function setupAdminLogout(logoutBtnId) {
    const logoutBtn = document.getElementById(logoutBtnId);
    if (logoutBtn) {
        // Remove existing listeners
        const newLogoutBtn = logoutBtn.cloneNode(true);
        logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);
        
        newLogoutBtn.addEventListener('click', async () => {
            if (confirm('Are you sure you want to logout?')) {
                const { createClient } = await import('@supabase/supabase-js');
                const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
                const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
                const supabase = createClient(supabaseUrl, supabaseKey);
                
                await supabase.auth.signOut();
                localStorage.removeItem('currentAdmin');
                localStorage.removeItem('currentStudent');
                window.location.href = '/Assets/Landing/index.html';
            }
        });
    }
}

// Setup drawer open/close for mobile
function setupAdminDrawerControls() {
    const hamburger = document.getElementById('hamburger');
    const drawer = document.getElementById('drawer');
    const overlay = document.getElementById('overlay');
    const drawerClose = document.getElementById('drawerClose');
    
    if (hamburger) {
        hamburger.addEventListener('click', () => {
            drawer?.classList.add('open');
            overlay?.classList.add('open');
            document.body.style.overflow = 'hidden';
        });
    }
    
    if (drawerClose) {
        drawerClose.addEventListener('click', () => {
            drawer?.classList.remove('open');
            overlay?.classList.remove('open');
            document.body.style.overflow = '';
        });
    }
    
    if (overlay) {
        overlay.addEventListener('click', () => {
            drawer?.classList.remove('open');
            overlay?.classList.remove('open');
            document.body.style.overflow = '';
        });
    }
}

// Export functions
export { setupAdminDrawer, setupAdminLogout, setupAdminDrawerControls, getCurrentAdmin };