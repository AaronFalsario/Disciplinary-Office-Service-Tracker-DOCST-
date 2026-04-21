let incidents = [
    { id:1, name:'Sharp knife',          location:'Room 504, 5th floor',      category:'Security',    priority:'High',   status:'Pending',     reporter:'Lebron K. James', notes:'', time:'2h ago' },
    { id:2, name:'Dirty Toilet',         location:'5th floor, near room 517', category:'Janitorial',  priority:'Medium', status:'Resolved',    reporter:'Michael Jordan',  notes:'', time:'5h ago' },
    { id:3, name:'Broken sparking wire', location:'Room 504, 5th floor',      category:'Maintenance', priority:'High',   status:'In Progress', reporter:'Gerald Anderson', notes:'', time:'8h ago' },
];
let nextId   = 4;
let editId   = null;
let deleteId = null;
let curFilter = 'all';

/* ── ICON MAP ── */
const catIcon = {
    Security:    { cls:'ics-red',    svg:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#DC2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>` },
    Janitorial:  { cls:'ics-teal',   svg:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></svg>` },
    Maintenance: { cls:'ics-blue',   svg:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>` },
    Health:      { cls:'ics-teal',   svg:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>` },
    Admin:       { cls:'ics-purple', svg:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>` },
};

const catBadge  = { Security:'b-security', Janitorial:'b-janitorial', Maintenance:'b-maintenance', Health:'b-health', Admin:'b-admin' };
const prioBadge = { High:'b-high', Medium:'b-medium', Low:'b-low' };
const statBadge = { Pending:'b-pending', 'In Progress':'b-inprogress', Resolved:'b-resolved' };

/* ── HELPERS ── */
const badge = (cls, text) => `<span class="badge ${cls}">${text}</span>`;

const iconHtml = cat => {
    const c = catIcon[cat] || catIcon['Admin'];
    return `<div class="inc-icon-sm ${c.cls}" aria-hidden="true">${c.svg}</div>`;
};

const editSvg = () => `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
const delSvg  = () => `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#DC2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`;

const filtered = () => {
    if (curFilter === 'all') return incidents;
    const map = { pending:'Pending', 'in-progress':'In Progress', resolved:'Resolved' };
    return incidents.filter(i => i.status === map[curFilter]);
};

/* ── RENDER ── */
function render() {
    const list  = filtered();
    const tbody = document.getElementById('incidentTableBody');
    const cards = document.getElementById('incidentMobileCards');

    const emptyHTML = `<div class="empty-state"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin:0 auto;display:block;opacity:0.3"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><p>No incidents found.</p></div>`;

    if (!list.length) {
        tbody.innerHTML = `<tr><td colspan="6">${emptyHTML}</td></tr>`;
        cards.innerHTML = emptyHTML;
} else {
    tbody.innerHTML = list.map(inc => `
    <tr>
        <td>
            <div class="inc-cell">
                ${iconHtml(inc.category)}
            <div>
                <div class="inc-name">${inc.name}</div>
                <div class="inc-loc">${inc.location}</div>
            </div>
            </div>
        </td>
        <td>${badge(catBadge[inc.category] || 'b-admin', inc.category)}</td>
        <td>${badge(prioBadge[inc.priority] || 'b-low', inc.priority)}</td>
        <td>${badge(statBadge[inc.status] || 'b-pending', inc.status)}</td>
        <td><span class="reporter-name">${inc.reporter}</span></td>
        <td>
            <div class="action-btns">
                <button class="action-btn" onclick="openEdit(${inc.id})" aria-label="Edit incident">${editSvg()}</button>
                <button class="action-btn del" onclick="openDelete(${inc.id})" aria-label="Delete incident">${delSvg()}</button>
            </div>
        </td>
    </tr>`).join('');

    cards.innerHTML = list.map(inc => `
        <article class="m-card">
        <div class="m-card-top">
            ${iconHtml(inc.category)}
            <div>
        <div class="inc-name">${inc.name}</div>
            <div class="inc-loc">${inc.location}</div>
            </div>
        </div>
        <div class="m-card-body">
            <div><div class="m-field-label">Category</div>${badge(catBadge[inc.category] || 'b-admin', inc.category)}</div>
            <div><div class="m-field-label">Priority</div>${badge(prioBadge[inc.priority] || 'b-low', inc.priority)}</div>
            <div><div class="m-field-label">Status</div>${badge(statBadge[inc.status] || 'b-pending', inc.status)}</div>
            <div><div class="m-field-label">Reporter</div><div class="reporter-mobile">${inc.reporter}</div></div>
        </div>
        <div class="m-card-footer">
            <div class="m-timestamp">${inc.time}</div>
            <div class="action-btns">
                <button class="action-btn" onclick="openEdit(${inc.id})" aria-label="Edit incident">${editSvg()}</button>
                <button class="action-btn del" onclick="openDelete(${inc.id})" aria-label="Delete incident">${delSvg()}</button>
            </div>
        </div>
    </article>`).join('');
}

updateStats();
}

function updateStats() {
    document.getElementById('statTotal').textContent    = incidents.length;
    document.getElementById('statPending').textContent  = incidents.filter(i => i.status === 'Pending').length;
    document.getElementById('statProgress').textContent = incidents.filter(i => i.status === 'In Progress').length;
    document.getElementById('statResolved').textContent = incidents.filter(i => i.status === 'Resolved').length;
}

/* ── DRAWER ── */
const drawer  = document.getElementById('drawer');
const overlay = document.getElementById('overlay');
const openDrawer  = () => { drawer.classList.add('open');  overlay.classList.add('open'); };
const closeDrawer = () => { drawer.classList.remove('open'); overlay.classList.remove('open'); };

document.getElementById('hamburger').addEventListener('click', openDrawer);
document.getElementById('drawerClose').addEventListener('click', closeDrawer);
overlay.addEventListener('click', closeDrawer);

/* ── NAV ── */
document.querySelectorAll('.drawer-item[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.drawer-item').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        const target = document.getElementById('page-' + btn.dataset.page);
        if (target) target.classList.add('active');
        closeDrawer();
    });
});

/* ── LOGOUT ── */
document.getElementById('logoutBtn').addEventListener('click', () => {
    closeDrawer();
    showToast('Logged out successfully.');
});

/* ── ADMIN PILL ── */
document.getElementById('adminPill').addEventListener('click', () => {
    showToast('Logged in as Administrator.');
});

/* ── FILTER TABS ── */
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        curFilter = btn.dataset.filter;
        render();
    });
});

/* ── ADD / EDIT MODAL ── */
function clearForm() {
    ['fName','fLocation','fReporter','fNotes'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('fCategory').value = '';
    document.getElementById('fPriority').value = '';
    document.getElementById('fStatus').value   = 'Pending';
}

function openAdd() {
    editId = null;
    clearForm();
    document.getElementById('modalTitle').textContent = 'Add Incident';
    document.getElementById('modalSave').textContent  = 'Save Incident';
    document.getElementById('incidentModal').classList.add('open');
}

function openEdit(id) {
    const inc = incidents.find(i => i.id === id);
    if (!inc) return;
    editId = id;
    document.getElementById('fName').value     = inc.name;
    document.getElementById('fLocation').value = inc.location;
    document.getElementById('fCategory').value = inc.category;
    document.getElementById('fPriority').value = inc.priority;
    document.getElementById('fStatus').value   = inc.status;
    document.getElementById('fReporter').value = inc.reporter;
    document.getElementById('fNotes').value    = inc.notes;
    document.getElementById('modalTitle').textContent = 'Edit Incident';
    document.getElementById('modalSave').textContent  = 'Update Incident';
    document.getElementById('incidentModal').classList.add('open');
}

function closeModal() { document.getElementById('incidentModal').classList.remove('open'); }

document.getElementById('addIncBtn').addEventListener('click', openAdd);
document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('modalCancel').addEventListener('click', closeModal);
document.getElementById('incidentModal').addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(); });

document.getElementById('modalSave').addEventListener('click', () => {
    const name     = document.getElementById('fName').value.trim();
    const location = document.getElementById('fLocation').value.trim();
    const category = document.getElementById('fCategory').value;
    const priority = document.getElementById('fPriority').value;
    const status   = document.getElementById('fStatus').value;
    const reporter = document.getElementById('fReporter').value.trim();
    const notes    = document.getElementById('fNotes').value.trim();

if (!name || !location || !category || !priority || !reporter) {
    showToast('Please fill in all required fields.');
    return;
}

    if (editId) {
        Object.assign(incidents.find(i => i.id === editId), { name, location, category, priority, status, reporter, notes });
        showToast('Incident updated.');
    } else {
        incidents.unshift({ id: nextId++, name, location, category, priority, status, reporter, notes, time: 'Just now' });
        showToast('Incident added.');
    }
    closeModal();
    render();
});

  /* ── DELETE MODAL ── */
function openDelete(id) {
    deleteId = id;
    document.getElementById('deleteModal').classList.add('open');
}

function closeDeleteModal() {
    document.getElementById('deleteModal').classList.remove('open');
    deleteId = null;
}

    document.getElementById('deleteClose').addEventListener('click', closeDeleteModal);
    document.getElementById('deleteCancelBtn').addEventListener('click', closeDeleteModal);
    document.getElementById('deleteModal').addEventListener('click', e => { if (e.target === e.currentTarget) closeDeleteModal(); });

    document.getElementById('deleteConfirmBtn').addEventListener('click', () => {
        incidents = incidents.filter(i => i.id !== deleteId);
        closeDeleteModal();
        render();
    showToast('Incident deleted.');
});

/* ── TOAST ── */
    let toastTimer;
        function showToast(msg) {
        const t = document.getElementById('toast');
        t.textContent = msg;
        t.classList.add('show');
    clearTimeout(toastTimer);
toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}
render();