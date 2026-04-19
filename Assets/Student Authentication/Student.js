 /* ── Panel switching ── */
function showTab(panelId) {
        document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
        document.getElementById(panelId).classList.add('active');
    }
    function showRaw(panelId) {
        document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
        document.getElementById(panelId).classList.add('active');
    }

    /* ── Admin steps ── */
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

    /* ── Password toggle ── */
    function togglePw(id, btn) {
        const input = document.getElementById(id);
        const isText = input.type === 'text';
        input.type = isText ? 'password' : 'text';
        btn.innerHTML = isText ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
    }

    /* ── OTP auto-advance ── */
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

    /* ── OTP countdown ── */
    let timer;
    function startCountdown() {
        clearInterval(timer);
        let secs = 300;
        const el = document.getElementById('countdown');
        if (!el) return;
        timer = setInterval(() => {
            secs--;
            const m = String(Math.floor(secs / 60)).padStart(2, '0');
            const s = String(secs % 60).padStart(2, '0');
            if (el) el.textContent = `${m}:${s}`;
            if (secs <= 0) clearInterval(timer);
        }, 1000);
    }