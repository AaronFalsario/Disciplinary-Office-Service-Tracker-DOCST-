// Mobile Hamburger Menu
const hamburger = document.getElementById('hamburger');
const navActions = document.querySelector('.nav-actions');
    
if (hamburger) {
    hamburger.addEventListener('click', () => {
        if (navActions.classList.contains('nav-actions-mobile')) {
            navActions.classList.remove('nav-actions-mobile');
            navActions.style.display = '';
        } else {
            navActions.classList.add('nav-actions-mobile');
            navActions.style.display = 'flex';
        }
    });
}

// Secret Admin Button - Double click to reveal admin login
const secretAdminBtn = document.getElementById('secretAdminBtn');
if (secretAdminBtn) {
    console.log('✅ Secret admin button found'); 
    secretAdminBtn.addEventListener('dblclick', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('🔐 Double click detected!'); 
        
        const notification = document.createElement('div');
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
        
        setTimeout(() => {
            // FIXED: Remove leading slash - use relative path
            window.location.href = 'Assets/Student Authentication/Admin Authentication/Admin.html';
        }, 1000);
        
        setTimeout(() => notification.remove(), 1500);
    });
} else {
    console.log('❌ Secret admin button NOT found - check ID "secretAdminBtn"');
}

// Add slideIn animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
`;
document.head.appendChild(style);