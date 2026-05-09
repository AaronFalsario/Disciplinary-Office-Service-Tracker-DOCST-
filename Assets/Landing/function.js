// Mobile Hamburger Menu - Add hamburger to HTML first
// Wait for DOM to load
document.addEventListener('DOMContentLoaded', function() {
    
    // Add hamburger button to navigation if not exists
    const nav = document.querySelector('nav');
    const navActions = document.querySelector('.nav-actions');
    
    if (nav && !document.querySelector('.hamburger')) {
        const hamburgerBtn = document.createElement('button');
        hamburgerBtn.className = 'hamburger';
        hamburgerBtn.id = 'hamburger';
        hamburgerBtn.innerHTML = '<span></span><span></span><span></span>';
        
        const navLogo = document.querySelector('.nav-logo');
        if (navLogo) {
            nav.insertBefore(hamburgerBtn, navLogo.nextSibling);
        }
    }
    
    // Hamburger menu functionality
    const hamburger = document.getElementById('hamburger');
    if (hamburger) {
        hamburger.addEventListener('click', function() {
            const navActions = document.querySelector('.nav-actions');
            if (navActions) {
                navActions.classList.toggle('nav-actions-mobile');
            }
        });
    }
    
    // Secret Admin Button - Double click to reveal admin login
    const secretAdminBtn = document.getElementById('secretAdminBtn');
    if (secretAdminBtn) {
        console.log('✅ Secret admin button found');
        
        secretAdminBtn.addEventListener('dblclick', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('🔐 Double click detected! Redirecting to admin login...');
            
            // Create notification
            const notification = document.createElement('div');
            notification.className = 'admin-notification';
            notification.innerHTML = `
                <div style="
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    background: linear-gradient(135deg, #2563EB, #1D4ED8);
                    color: white;
                    padding: 12px 20px;
                    border-radius: 12px;
                    font-size: 13px;
                    font-weight: 500;
                    z-index: 10000;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                    animation: slideIn 0.3s ease;
                ">
                    🔐 Redirecting to Admin Portal...
                </div>
            `;
            document.body.appendChild(notification);
            
            // Redirect after delay
            setTimeout(function() {
                window.location.href = 'Assets/Student Authentication/Admin Authentication/Admin.html';
            }, 1000);
            
            // Remove notification after animation
            setTimeout(function() {
                if (notification.remove) notification.remove();
            }, 1500);
        });
    } else {
        console.error('❌ Secret admin button NOT found - check element with id "secretAdminBtn"');
    }
});

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    /* Hamburger menu styles */
    .hamburger {
        display: none;
        flex-direction: column;
        cursor: pointer;
        background: none;
        border: none;
        padding: 8px;
    }
    
    .hamburger span {
        width: 25px;
        height: 3px;
        background: #333;
        margin: 3px 0;
        border-radius: 3px;
        transition: 0.3s;
    }
    
    @media (max-width: 768px) {
        .hamburger {
            display: flex;
        }
        
        .nav-actions {
            display: none !important;
        }
        
        .nav-actions.nav-actions-mobile {
            display: flex !important;
            position: absolute;
            top: 70px;
            right: 20px;
            background: white;
            flex-direction: column;
            padding: 15px 25px;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            z-index: 1000;
        }
        
        .nav-actions.nav-actions-mobile a {
            margin: 5px 0;
        }
    }
`;
document.head.appendChild(style);