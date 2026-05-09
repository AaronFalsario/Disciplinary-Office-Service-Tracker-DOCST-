// ============ DOCST PERMANENT BOTTOM NAVIGATION ============

const bottomNavItems = [
    { icon: 'fas fa-chart-line', label: 'Home', href: '/Assets/Admin dashboard/Admin.html' },
    { icon: 'fas fa-users', label: 'Students', href: '/Assets/Admin dashboard/students/record.html' },
    { icon: 'fas fa-gavel', label: 'Penalties', href: '/Assets/Admin dashboard/penalties/student.html' },
    { icon: 'fas fa-chart-bar', label: 'Reports', href: '/Assets/Admin dashboard/report/report.html' },
    { icon: 'fas fa-cog', label: 'Settings', href: '/Assets/Admin dashboard/settings/setting.html' }
];

// ============ CREATE BOTTOM NAVIGATION ============
function createBottomNav() {
    // Check if bottom nav already exists
    if (document.getElementById('permanentBottomNav')) {
        return;
    }
    
    const bottomNav = document.createElement('nav');
    bottomNav.id = 'permanentBottomNav';
    bottomNav.className = 'permanent-bottom-nav';
    
    bottomNavItems.forEach(item => {
        const button = document.createElement('button');
        button.className = 'bottom-nav-btn';
        button.innerHTML = `<i class="${item.icon}"></i><span>${item.label}</span>`;
        
        // Check if this is the active page
        const currentPath = window.location.pathname;
        if (currentPath.includes(item.href.replace('/Assets', ''))) {
            button.classList.add('active');
        }
        
        button.addEventListener('click', () => {
            window.location.href = item.href;
        });
        
        bottomNav.appendChild(button);
    });
    
    document.body.appendChild(bottomNav);
}

// ============ ADD CSS STYLES ============
function addBottomNavStyles() {
    if (document.getElementById('bottomNavStyles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'bottomNavStyles';
    styles.textContent = `
        /* Permanent Bottom Navigation */
        .permanent-bottom-nav {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: var(--surface);
            border-top: 1px solid var(--border);
            display: none;
            justify-content: space-around;
            align-items: center;
            padding: 6px 12px 20px;
            z-index: 100;
            box-shadow: 0 -2px 10px rgba(0,0,0,0.05);
            flex-direction: row !important;
        }
        
        @media (max-width: 768px) {
            .permanent-bottom-nav {
                display: flex !important;
            }
        }
        
        .bottom-nav-btn {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 4px;
            background: none;
            border: none;
            cursor: pointer;
            padding: 8px 12px;
            border-radius: 10px;
            color: var(--text-3);
            font-size: 10px;
            font-weight: 500;
            transition: all 0.2s;
            flex: 1;
            max-width: 70px;
        }
        
        .bottom-nav-btn i {
            font-size: 20px;
        }
        
        .bottom-nav-btn span {
            font-size: 10px;
        }
        
        .bottom-nav-btn.active {
            color: var(--blue);
        }
        
        .bottom-nav-btn:hover {
            background: var(--bg);
            transform: translateY(-2px);
        }
        
        /* Hide bottom nav when drawer is open */
        body.drawer-open .permanent-bottom-nav {
            transform: translateY(100%);
            transition: transform 0.3s ease;
            pointer-events: none;
        }
        
        /* Add padding to main content for bottom nav on mobile */
        @media (max-width: 768px) {
            .dashboard-main {
                padding-bottom: 80px !important;
            }
        }
        
        /* Dark mode */
        body.dark-mode .permanent-bottom-nav {
            background: rgba(30, 41, 59, 0.95);
            border-top-color: #334155;
        }
        
        body.dark-mode .bottom-nav-btn {
            color: #94A3B8;
        }
        
        body.dark-mode .bottom-nav-btn.active {
            color: #3B82F6;
        }
        
        body.dark-mode .bottom-nav-btn:hover {
            background: #0F172A;
        }
    `;
    document.head.appendChild(styles);
}

// ============ UPDATE BOTTOM NAV ACTIVE STATE ============
function updateBottomNavActive() {
    const bottomNav = document.getElementById('permanentBottomNav');
    if (!bottomNav) return;
    
    const currentPath = window.location.pathname;
    const buttons = bottomNav.querySelectorAll('.bottom-nav-btn');
    
    buttons.forEach((btn, index) => {
        btn.classList.remove('active');
        const href = bottomNavItems[index]?.href;
        if (href && currentPath.includes(href.replace('/Assets', ''))) {
            btn.classList.add('active');
        }
    });
}

// ============ INITIALIZE BOTTOM NAV ============
function initBottomNav() {
    addBottomNavStyles();
    createBottomNav();
    updateBottomNavActive();
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBottomNav);
} else {
    initBottomNav();
}

// Export for module usage
export { initBottomNav, updateBottomNavActive, bottomNavItems };