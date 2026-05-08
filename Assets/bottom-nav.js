// ============ BOTTOM NAVIGATION COMPONENT ============

// Navigation items configuration
const bottomNavItems = [
    { 
        name: 'Dashboard', 
        icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
        path: '/Assets/Student_Dashboard/stud.html'
    },
    { 
        name: 'Penalties', 
        icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/><circle cx="12" cy="12" r="3"/></svg>',
        path: '/Assets/Student_Dashboard/penalties/penalties.html'
    },
    { 
        name: 'Appeal', 
        icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 10h.01M12 10h.01M16 10h.01"/></svg>',
        path: '/Assets/Student_Dashboard/appeal/appeal.html'
    },
    { 
        name: 'History', 
        icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 8v4l3 3M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/></svg>',
        path: '/Assets/Student_Dashboard/history/history.html'
    },
    { 
        name: 'Settings', 
        icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>',
        path: '/Assets/Student_Dashboard/settings/setting.html'
    }
];

// Get current page name from URL
function getCurrentPageForBottomNav() {
    const path = window.location.pathname;
    if (path.includes('stud.html')) return 'Dashboard';
    if (path.includes('penalties')) return 'Penalties';
    if (path.includes('appeal')) return 'Appeal';
    if (path.includes('history')) return 'History';
    if (path.includes('setting')) return 'Settings';
    return '';
}

// Create bottom navigation element
function createBottomNav() {
    const bottomNav = document.createElement('nav');
    bottomNav.className = 'bottom-nav';
    bottomNav.id = 'bottomNav';
    
    const currentPage = getCurrentPageForBottomNav();
    
    bottomNavItems.forEach(item => {
        const button = document.createElement('button');
        button.className = `bottom-nav-item ${currentPage === item.name ? 'active' : ''}`;
        button.setAttribute('data-page', item.name.toLowerCase());
        button.innerHTML = `
            ${item.icon}
            <span>${item.name}</span>
        `;
        button.addEventListener('click', () => {
            window.location.href = item.path;
        });
        bottomNav.appendChild(button);
    });
    
    return bottomNav;
}

// Initialize bottom navigation
export function initBottomNav() {
    // Only add bottom nav on mobile devices
    if (window.innerWidth <= 768) {
        // Check if bottom nav already exists
        if (!document.getElementById('bottomNav')) {
            const bottomNav = createBottomNav();
            document.body.appendChild(bottomNav);
        }
    }
}

// Update bottom nav active state (call when page changes)
export function updateBottomNavActive() {
    const currentPage = getCurrentPageForBottomNav();
    const bottomNavItems = document.querySelectorAll('.bottom-nav-item');
    bottomNavItems.forEach(item => {
        const itemName = item.querySelector('span')?.textContent;
        if (itemName === currentPage) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

// Handle resize - add/remove bottom nav based on screen size
export function setupBottomNavResize() {
    let bottomNav = document.getElementById('bottomNav');
    
    function handleResize() {
        const isMobile = window.innerWidth <= 768;
        
        if (isMobile && !bottomNav) {
            bottomNav = createBottomNav();
            document.body.appendChild(bottomNav);
        } else if (!isMobile && bottomNav) {
            bottomNav.remove();
            bottomNav = null;
        }
    }
    
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial check
}