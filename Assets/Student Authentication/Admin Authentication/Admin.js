function showRaw(panelId) {
        document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
        document.getElementById(panelId).classList.add('active');
    }

    function goAdminStep2() {
        const id = document.getElementById('admin-id').value.trim();
        const pw = document.getElementById('admin-pw').value.trim();
        if (!id || !pw) { alert('Please enter your admin ID and password.'); return; }
        showRaw('admin-step2');
        startCountdown();
    }

    function goAdminStep3() {
        const inputs = document.querySelectorAll('.otp-input');
        const code = [...inputs].map(i => i.value).join('');
        if (code.length < 6) { alert('Please enter the complete 6-digit OTP.'); return; }
        showRaw('admin-step3');
    }

    function completeLogin() {
        const answer = document.getElementById('sec-answer').value.trim();
        if (!answer) { alert('Please answer the security question.'); return; }
        // redirect to admin dashboard
        window.location.href = '/Assets/Admin dashboard/AdminDashboard.html';
    }

    function togglePw(id, btn) {
        const input = document.getElementById(id);
        const isText = input.type === 'text';
        input.type = isText ? 'password' : 'text';
        btn.innerHTML = isText ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
    }

    function otpNext(el, idx) {
        el.value = el.value.replace(/\D/g, '');
        if (el.value && idx < 5) {
            document.querySelectorAll('.otp-input')[idx + 1].focus();
        }
    }

    document.addEventListener('keydown', e => {
        if (e.key === 'Backspace' && e.target.classList.contains('otp-input')) {
            const inputs = [...document.querySelectorAll('.otp-input')];
            const idx = inputs.indexOf(e.target);
            if (!e.target.value && idx > 0) inputs[idx - 1].focus();
        }
    });

    let timer;
    function startCountdown() {
        clearInterval(timer);
        let secs = 300;
        const el = document.getElementById('countdown');
        timer = setInterval(() => {
            secs--;
            const m = String(Math.floor(secs / 60)).padStart(2, '0');
            const s = String(secs % 60).padStart(2, '0');
            if (el) el.textContent = `${m}:${s}`;
            if (secs <= 0) { clearInterval(timer); if (el) el.style.color = 'var(--red)'; }
        }, 1000);
    }

    const completeBtn = document.getElementById('complete-btn');
    completeBtn.addEventListener('mouseover', () => completeBtn.style.background = '#15803D');
    completeBtn.addEventListener('mouseout',  () => completeBtn.style.background = '#16A34A');