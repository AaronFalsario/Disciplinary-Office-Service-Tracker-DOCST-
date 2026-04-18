const hamburger = document.getElementById('hamburger');
    hamburger.addEventListener('click', () => {
        const actions = document.querySelector('.nav-actions');
        if (actions.style.display === 'flex') {
            actions.style.display = '';
        } else {
            actions.style.display = 'flex';
            actions.style.flexDirection = 'column';
            actions.style.position = 'absolute';
            actions.style.top = '60px';
            actions.style.right = '18px';
            actions.style.background = '#fff';
            actions.style.border = '1px solid #E2E8F0';
            actions.style.borderRadius = '10px';
            actions.style.padding = '12px';
            actions.style.gap = '8px';
            actions.style.zIndex = '200';
            actions.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)';
        }
});