const chartScript = document.createElement('script');
chartScript.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js';
chartScript.onload = () => {
    console.log('Chart.js loaded successfully');
    if (typeof updateChart === 'function') {
        setTimeout(() => updateChart(), 100);
    }
};
document.head.appendChild(chartScript);

import { createClient } from '@supabase/supabase-js'
import { setupAdminDrawer, setupAdminLogout, setupAdminDrawerControls, getCurrentAdmin } from '/Assets/drawer-admin.js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

// ============ ADD LOGOUT TOAST STYLES ============
const logoutToastStyles = document.createElement('style');
logoutToastStyles.textContent = `
    /* Logout Toast Container */
    .logout-toast-container {
        position: fixed;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 10000;
        pointer-events: none;
    }
    
    /* Logout Toast */
    .logout-toast {
        min-width: 320px;
        max-width: 400px;
        background: white;
        border-radius: 16px;
        padding: 16px 20px;
        margin-bottom: 15px;
        display: flex;
        align-items: center;
        gap: 15px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        transform: translateY(30px);
        opacity: 0;
        transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        pointer-events: auto;
        position: relative;
        overflow: hidden;
    }
    
    .logout-toast-show {
        transform: translateY(0);
        opacity: 1;
    }
    
    .logout-toast-hide {
        transform: translateY(-30px);
        opacity: 0;
    }
    
    /* Dark mode support */
    .dark-mode .logout-toast {
        background: #1e1e2e;
        color: #e0e0e0;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
    }
    
    /* Toast types */
    .logout-toast-warning {
        border-left: 4px solid #f59e0b;
    }
    
    .logout-toast-success {
        border-left: 4px solid #10b981;
    }
    
    .logout-toast-error {
        border-left: 4px solid #ef4444;
    }
    
    /* Toast icon */
    .logout-toast-icon {
        font-size: 28px;
        flex-shrink: 0;
    }
    
    .logout-toast-warning .logout-toast-icon {
        color: #f59e0b;
    }
    
    .logout-toast-success .logout-toast-icon {
        color: #10b981;
    }
    
    .logout-toast-error .logout-toast-icon {
        color: #ef4444;
    }
    
    /* Toast content */
    .logout-toast-content {
        flex: 1;
    }
    
    .logout-toast-title {
        font-weight: 600;
        font-size: 16px;
        margin-bottom: 4px;
    }
    
    .logout-toast-message {
        font-size: 14px;
        opacity: 0.9;
    }
    
    /* Progress bar */
    .logout-toast-progress {
        position: absolute;
        bottom: 0;
        left: 0;
        height: 3px;
        background: linear-gradient(90deg, #f59e0b, #fbbf24);
        animation: progressShrink 3s linear forwards;
    }
    
    .logout-toast-success .logout-toast-progress {
        background: linear-gradient(90deg, #10b981, #34d399);
    }
    
    .logout-toast-error .logout-toast-progress {
        background: linear-gradient(90deg, #ef4444, #f87171);
    }
    
    @keyframes progressShrink {
        from {
            width: 100%;
        }
        to {
            width: 0%;
        }
    }
    
    /* Logout Modal */
    .logout-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10001;
        animation: fadeIn 0.2s ease;
    }
    
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    
    .logout-modal-content {
        background: white;
        border-radius: 20px;
        width: 90%;
        max-width: 400px;
        overflow: hidden;
        animation: slideUp 0.3s ease;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }
    
    @keyframes slideUp {
        from {
            transform: translateY(50px);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }
    
    .dark-mode .logout-modal-content {
        background: #1e1e2e;
        color: #e0e0e0;
    }
    
    .logout-modal-header {
        padding: 20px;
        background: linear-gradient(135deg, #dc2626, #b91c1c);
        color: white;
        text-align: center;
    }
    
    .logout-modal-header i {
        font-size: 48px;
        margin-bottom: 10px;
    }
    
    .logout-modal-header h3 {
        margin: 0;
        font-size: 24px;
    }
    
    .logout-modal-body {
        padding: 20px;
        text-align: center;
    }
    
    .logout-modal-body p {
        margin: 10px 0;
        font-size: 16px;
    }
    
    .logout-modal-warning {
        color: #dc2626;
        font-size: 14px;
        margin-top: 15px;
    }
    
    .dark-mode .logout-modal-warning {
        color: #f87171;
    }
    
    .logout-modal-footer {
        padding: 20px;
        display: flex;
        gap: 10px;
        justify-content: center;
    }
    
    .logout-modal-footer button {
        padding: 10px 20px;
        border: none;
        border-radius: 10px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
    }
    
    .logout-modal-cancel {
        background: #e5e7eb;
        color: #374151;
    }
    
    .logout-modal-cancel:hover {
        background: #d1d5db;
        transform: translateY(-1px);
    }
    
    .logout-modal-confirm {
        background: linear-gradient(135deg, #dc2626, #b91c1c);
        color: white;
    }
    
    .logout-modal-confirm:hover {
        transform: translateY(-1px);
        box-shadow: 0 5px 15px rgba(220, 38, 38, 0.3);
    }
    
    .dark-mode .logout-modal-cancel {
        background: #374151;
        color: #e5e7eb;
    }
    
    .dark-mode .logout-modal-cancel:hover {
        background: #4b5563;
    }
    
    /* Button loading state */
    #logoutBtn:disabled {
        opacity: 0.7;
        cursor: not-allowed;
    }
    
    #logoutBtn .fa-spinner {
        animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
        from {
            transform: rotate(0deg);
        }
        to {
            transform: rotate(360deg);
        }
    }
`;
document.head.appendChild(logoutToastStyles);

// ============ TOAST NOTIFICATION SYSTEM (FIXED FOR DARK MODE) ============
let toastContainer = null;

// ADD THIS MISSING STYLE FOR REGULAR TOASTS (FIXED DARK MODE)
const toastStyles = document.createElement('style');
toastStyles.textContent = `
    .toast-container {
        position: fixed;
        top: 80px;
        right: 24px;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        gap: 12px;
        max-width: 380px;
        pointer-events: none;
    }
    
    @media (max-width: 768px) {
        .toast-container {
            top: 70px;
            right: 16px;
            left: 16px;
            max-width: none;
        }
    }
    
    .toast {
        background: white;
        border-radius: 16px;
        padding: 14px 18px;
        display: flex;
        align-items: center;
        gap: 12px;
        box-shadow: 0 12px 28px rgba(0, 0, 0, 0.15);
        pointer-events: auto;
        cursor: pointer;
        animation: toastSlideIn 0.3s ease forwards;
        border-left: 4px solid;
        transition: background 0.2s ease;
    }
    
    .toast-success {
        border-left-color: #10b981;
        background: #f0fdf4;
    }
    .toast-success .toast-icon { background: #10b981; color: white; }
    
    .toast-error {
        border-left-color: #ef4444;
        background: #fef2f2;
    }
    .toast-error .toast-icon { background: #ef4444; color: white; }
    
    .toast-warning {
        border-left-color: #f59e0b;
        background: #fffbeb;
    }
    .toast-warning .toast-icon { background: #f59e0b; color: white; }
    
    .toast-info {
        border-left-color: #3b82f6;
        background: #eff6ff;
    }
    .toast-info .toast-icon { background: #3b82f6; color: white; }
    
    .toast-icon {
        width: 28px;
        height: 28px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        flex-shrink: 0;
    }
    
    .toast-content {
        flex: 1;
    }
    
    .toast-title {
        font-weight: 700;
        font-size: 13px;
        margin-bottom: 2px;
        color: #1f2937;
    }
    
    .toast-message {
        font-size: 12px;
        color: #6b7280;
        line-height: 1.4;
    }
    
    .toast-close {
        background: none;
        border: none;
        font-size: 12px;
        color: #9ca3af;
        cursor: pointer;
        padding: 4px;
        flex-shrink: 0;
        border-radius: 6px;
        transition: all 0.2s;
    }
    
    .toast-close:hover {
        background: rgba(0, 0, 0, 0.05);
        color: #6b7280;
    }
    
    @keyframes toastSlideIn {
        from { opacity: 0; transform: translateX(100%); }
        to { opacity: 1; transform: translateX(0); }
    }
    
    @keyframes toastSlideOut {
        from { opacity: 1; transform: translateX(0); }
        to { opacity: 0; transform: translateX(100%); }
    }
    
    .toast-removing {
        animation: toastSlideOut 0.25s ease forwards;
    }
    
    /* ========== FIXED DARK MODE TOAST SUPPORT ========== */
    body.dark-mode .toast {
        background: #1e293b;
        box-shadow: 0 12px 28px rgba(0, 0, 0, 0.4);
    }
    
    body.dark-mode .toast-title {
        color: #f1f5f9;
    }
    
    body.dark-mode .toast-message {
        color: #94a3b8;
    }
    
    body.dark-mode .toast-success {
        background: #064e3b;
        border-left-color: #34d399;
    }
    body.dark-mode .toast-success .toast-icon {
        background: #10b981;
    }
    
    body.dark-mode .toast-error {
        background: #7f1d1d;
        border-left-color: #f87171;
    }
    body.dark-mode .toast-error .toast-icon {
        background: #ef4444;
    }
    
    body.dark-mode .toast-warning {
        background: #78350f;
        border-left-color: #fbbf24;
    }
    body.dark-mode .toast-warning .toast-icon {
        background: #f59e0b;
    }
    
    body.dark-mode .toast-info {
        background: #1e3a5f;
        border-left-color: #60a5fa;
    }
    body.dark-mode .toast-info .toast-icon {
        background: #3b82f6;
    }
    
    body.dark-mode .toast-close {
        color: #64748b;
    }
    
    body.dark-mode .toast-close:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #94a3b8;
    }
`;
document.head.appendChild(toastStyles);

// ============ SVG ICON GENERATORS ============
function getCalendarSvg(size = 16) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="display: inline-block; vertical-align: middle; margin-right: 6px;">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
        <circle cx="12" cy="15" r="1"/>
        <circle cx="16" cy="15" r="1"/>
        <circle cx="8" cy="15" r="1"/>
        <circle cx="12" cy="19" r="1"/>
        <circle cx="16" cy="19" r="1"/>
        <circle cx="8" cy="19" r="1"/>
    </svg>`;
}

function getCalendarActivitySvg() {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
        <circle cx="12" cy="15" r="1"/>
        <circle cx="16" cy="15" r="1"/>
        <circle cx="8" cy="15" r="1"/>
        <circle cx="12" cy="19" r="1"/>
        <circle cx="16" cy="19" r="1"/>
        <circle cx="8" cy="19" r="1"/>
    </svg>`;
}

function getWaveSvg() {
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="display: inline-block; vertical-align: middle; margin-left: 4px;">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
        <circle cx="12" cy="12" r="3"/>
    </svg>`;
}

function getStudentIconSvg() {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>`;
}

function getPenaltyIconSvg() {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
        <circle cx="12" cy="12" r="3"/>
    </svg>`;
}

function getWarningIconSvg() {
    return `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>`;
}

function getEmptyInboxSvg() {
    return `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <line x1="3" y1="9" x2="21" y2="9"/>
        <line x1="3" y1="15" x2="21" y2="15"/>
    </svg>`;
}

function getDocumentIconSvg() {
    return `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>`;
}

function getBellSvg() {
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>`;
}

function getCheckSvg() {
    return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="20 6 9 17 4 12"/>
    </svg>`;
}

function getCloseSvg() {
    return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>`;
}

// ============ NOTIFICATION MODAL STYLES ============
const notificationModalStyles = document.createElement('style');
notificationModalStyles.textContent = `
    /* Notification Modal Styles */
    .notification-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 20000;
        animation: fadeIn 0.2s ease;
    }
    
    .notification-modal-content {
        background: white;
        border-radius: 24px;
        width: 90%;
        max-width: 500px;
        max-height: 90vh;
        overflow-y: auto;
        animation: slideUp 0.3s ease;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }
    
    .dark-mode .notification-modal-content {
        background: #1e1e2e;
        color: #e0e0e0;
    }
    
    .notification-modal-header {
        padding: 24px;
        background: linear-gradient(135deg, #2563eb, #1d4ed8);
        color: white;
        border-radius: 24px 24px 0 0;
    }
    
    .notification-modal-header h3 {
        margin: 0;
        font-size: 20px;
        display: flex;
        align-items: center;
        gap: 10px;
    }
    
    .notification-modal-body {
        padding: 24px;
    }
    
    .form-group {
        margin-bottom: 20px;
    }
    
    .form-group label {
        display: block;
        margin-bottom: 8px;
        font-weight: 600;
        color: #374151;
    }
    
    .dark-mode .form-group label {
        color: #e5e7eb;
    }
    
    .form-group input,
    .form-group select,
    .form-group textarea {
        width: 100%;
        padding: 12px;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        font-size: 14px;
        font-family: inherit;
        transition: all 0.2s;
        background: white;
    }
    
    .dark-mode .form-group input,
    .dark-mode .form-group select,
    .dark-mode .form-group textarea {
        background: #2d2d3a;
        border-color: #3d3d4a;
        color: #e0e0e0;
    }
    
    .form-group input:focus,
    .form-group select:focus,
    .form-group textarea:focus {
        outline: none;
        border-color: #2563eb;
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    }
    
    .form-group textarea {
        resize: vertical;
        min-height: 100px;
    }
    
    .notification-modal-footer {
        padding: 20px 24px;
        display: flex;
        gap: 12px;
        justify-content: flex-end;
        border-top: 1px solid #e5e7eb;
    }
    
    .dark-mode .notification-modal-footer {
        border-top-color: #3d3d4a;
    }
    
    .notification-modal-footer button {
        padding: 10px 20px;
        border: none;
        border-radius: 12px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
    }
    
    .modal-cancel {
        background: #e5e7eb;
        color: #374151;
    }
    
    .modal-cancel:hover {
        background: #d1d5db;
        transform: translateY(-1px);
    }
    
    .modal-send {
        background: linear-gradient(135deg, #2563eb, #1d4ed8);
        color: white;
    }
    
    .modal-send:hover {
        transform: translateY(-1px);
        box-shadow: 0 5px 15px rgba(37, 99, 235, 0.3);
    }
    
    .modal-send:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
    }
    
    .dark-mode .modal-cancel {
        background: #374151;
        color: #e5e7eb;
    }
    
    .dark-mode .modal-cancel:hover {
        background: #4b5563;
    }
    
    .recipient-badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        background: #f3f4f6;
        border-radius: 8px;
        font-size: 13px;
    }
    
    .dark-mode .recipient-badge {
        background: #2d2d3a;
    }
    
    .student-result-item:hover {
        background: #e5e7eb !important;
    }
    
    .dark-mode .student-result-item {
        background: #2d2d3a !important;
    }
    
    .dark-mode .student-result-item:hover {
        background: #3d3d4a !important;
    }
`;
document.head.appendChild(notificationModalStyles);

function getToastContainer() {
    if (!toastContainer) {
        toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container';
            document.body.appendChild(toastContainer);
        }
    }
    return toastContainer;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function removeToast(toast) {
    toast.classList.add('toast-removing');
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 250);
}

function showToast(message, type = 'info', title = null, duration = 4000) {
    const container = getToastContainer();
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconHtml = '';
    let defaultTitle = '';
    
    switch(type) {
        case 'success':
            iconHtml = '<i class="fas fa-check-circle"></i>';
            defaultTitle = 'Success';
            break;
        case 'error':
            iconHtml = '<i class="fas fa-times-circle"></i>';
            defaultTitle = 'Error';
            break;
        case 'warning':
            iconHtml = '<i class="fas fa-exclamation-triangle"></i>';
            defaultTitle = 'Warning';
            break;
        case 'info':
        default:
            iconHtml = '<i class="fas fa-info-circle"></i>';
            defaultTitle = 'Information';
            break;
    }
    
    const finalTitle = title || defaultTitle;
    
    toast.innerHTML = `
        <div class="toast-icon">${iconHtml}</div>
        <div class="toast-content">
            <div class="toast-title">${escapeHtml(finalTitle)}</div>
            <div class="toast-message">${escapeHtml(message)}</div>
        </div>
        <button class="toast-close">${getCloseSvg()}</button>
    `;
    
    container.appendChild(toast);
    
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeToast(toast);
    });
    
    toast.addEventListener('click', (e) => {
        if (e.target !== closeBtn && !closeBtn.contains(e.target)) {
            removeToast(toast);
        }
    });
    
    if (duration > 0) {
        setTimeout(() => {
            if (toast.parentElement) {
                removeToast(toast);
            }
        }, duration);
    }
    
    return toast;
}

function showSuccessToast(message, title = 'Success', duration = 4000) {
    return showToast(message, 'success', title, duration);
}

function showErrorToast(message, title = 'Error', duration = 5000) {
    return showToast(message, 'error', title, duration);
}

function showWarningToast(message, title = 'Warning', duration = 4000) {
    return showToast(message, 'warning', title, duration);
}

function showInfoToast(message, title = 'Information', duration = 3000) {
    return showToast(message, 'info', title, duration);
}

// ============ LOGOUT TOAST FUNCTIONS ============
let logoutToastContainer = null;

function getLogoutToastContainer() {
    if (!logoutToastContainer) {
        logoutToastContainer = document.querySelector('.logout-toast-container');
        if (!logoutToastContainer) {
            logoutToastContainer = document.createElement('div');
            logoutToastContainer.className = 'logout-toast-container';
            document.body.appendChild(logoutToastContainer);
        }
    }
    return logoutToastContainer;
}

function showLogoutToast(message, type = 'info', title = null) {
    const container = getLogoutToastContainer();
    
    const toast = document.createElement('div');
    toast.className = `logout-toast logout-toast-${type}`;
    
    let iconHtml = '';
    let defaultTitle = '';
    
    switch(type) {
        case 'success':
            iconHtml = '<i class="fas fa-check-circle"></i>';
            defaultTitle = 'Logged Out';
            break;
        case 'warning':
            iconHtml = '<i class="fas fa-sign-out-alt"></i>';
            defaultTitle = 'Goodbye';
            break;
        case 'error':
            iconHtml = '<i class="fas fa-times-circle"></i>';
            defaultTitle = 'Error';
            break;
        default:
            iconHtml = '<i class="fas fa-info-circle"></i>';
            defaultTitle = 'Information';
    }
    
    const finalTitle = title || defaultTitle;
    
    toast.innerHTML = `
        <div class="logout-toast-icon">${iconHtml}</div>
        <div class="logout-toast-content">
            <div class="logout-toast-title">${escapeHtml(finalTitle)}</div>
            <div class="logout-toast-message">${escapeHtml(message)}</div>
        </div>
        <div class="logout-toast-progress"></div>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('logout-toast-show');
    }, 10);
    
    setTimeout(() => {
        toast.classList.remove('logout-toast-show');
        toast.classList.add('logout-toast-hide');
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 300);
    }, 3000);
    
    return toast;
}

// ============ NOTIFICATION SYSTEM ============
let unreadNotifications = [];
let notificationInterval = null;

async function fetchNotifications() {
    try {
        const admin = getCurrentAdmin();
        if (!admin) return [];
        
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .or(`admin_id.eq.${admin.admin_id},admin_id.is.null`)
            .eq('is_read', false)
            .order('created_at', { ascending: false })
            .limit(10);
        
        if (error) throw error;
        
        unreadNotifications = data || [];
        updateNotificationBadge();
        return unreadNotifications;
    } catch (error) {
        console.error('Error fetching notifications:', error);
        return [];
    }
}

function updateNotificationBadge() {
    const badge = document.getElementById('notificationBadge');
    const count = unreadNotifications.length;
    
    if (badge) {
        if (count > 0) {
            badge.textContent = count > 99 ? '99+' : count;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }
}

function showNotificationToast(notification) {
    const type = notification.type || 'info';
    const title = notification.title || 'New Notification';
    const message = notification.message || '';
    
    showToast(message, type, title, 5000);
}

async function checkNewNotifications() {
    const previousCount = unreadNotifications.length;
    await fetchNotifications();
    
    if (unreadNotifications.length > previousCount) {
        const newNotifications = unreadNotifications.slice(0, unreadNotifications.length - previousCount);
        newNotifications.forEach(notif => {
            showNotificationToast(notif);
        });
    }
}

function startNotificationPolling() {
    if (notificationInterval) clearInterval(notificationInterval);
    
    fetchNotifications();
    
    notificationInterval = setInterval(() => {
        checkNewNotifications();
    }, 30000);
}

function stopNotificationPolling() {
    if (notificationInterval) {
        clearInterval(notificationInterval);
        notificationInterval = null;
    }
}

async function markNotificationAsRead(notificationId) {
    try {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq('id', notificationId);
        
        if (error) throw error;
        
        unreadNotifications = unreadNotifications.filter(n => n.id !== notificationId);
        updateNotificationBadge();
        
        showSuccessToast('Notification marked as read', 'Updated');
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
}

async function markAllNotificationsAsRead() {
    if (unreadNotifications.length === 0) return;
    
    try {
        const admin = getCurrentAdmin();
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true, read_at: new Date().toISOString() })
            .or(`admin_id.eq.${admin.admin_id},admin_id.is.null`)
            .eq('is_read', false);
        
        if (error) throw error;
        
        unreadNotifications = [];
        updateNotificationBadge();
        showSuccessToast('All notifications marked as read', 'Cleared');
    } catch (error) {
        console.error('Error marking all as read:', error);
        showErrorToast('Failed to clear notifications', 'Error');
    }
}

function showNotificationPanel() {
    let panel = document.getElementById('notificationPanel');
    
    if (!panel) {
        panel = document.createElement('div');
        panel.id = 'notificationPanel';
        panel.className = 'notification-panel';
        panel.innerHTML = `
            <div class="notification-header">
                <h3>${getBellSvg()} Notifications</h3>
                <button id="clearAllNotifications" class="clear-all-btn">Clear All</button>
                <button id="closeNotificationPanel" class="close-panel-btn">&times;</button>
            </div>
            <div class="notification-list" id="notificationList">
                <div class="loading-notifications">Loading...</div>
            </div>
        `;
        document.body.appendChild(panel);
        
        document.getElementById('closeNotificationPanel')?.addEventListener('click', () => {
            panel.classList.remove('show');
        });
        
        document.getElementById('clearAllNotifications')?.addEventListener('click', () => {
            markAllNotificationsAsRead();
            renderNotificationList();
        });
        
        document.addEventListener('click', (e) => {
            if (panel.classList.contains('show') && 
                !panel.contains(e.target) && 
                !e.target.closest('#notifyBtn')) {
                panel.classList.remove('show');
            }
        });
    }
    
    renderNotificationList();
    panel.classList.add('show');
}

async function renderNotificationList() {
    const listContainer = document.getElementById('notificationList');
    if (!listContainer) return;
    
    await fetchNotifications();
    
    if (unreadNotifications.length === 0) {
        listContainer.innerHTML = `
            <div class="empty-notifications">
                ${getEmptyInboxSvg()}
                <p>No new notifications</p>
            </div>
        `;
        return;
    }
    
    listContainer.innerHTML = unreadNotifications.map(notif => `
        <div class="notification-item ${notif.type}" data-id="${notif.id}">
            <div class="notification-icon">
                <i class="fas ${getNotificationIcon(notif.type)}"></i>
            </div>
            <div class="notification-details">
                <div class="notification-title">${escapeHtml(notif.title || 'Notification')}</div>
                <div class="notification-message">${escapeHtml(notif.message)}</div>
                <div class="notification-time">${formatRelativeTime(new Date(notif.created_at))}</div>
            </div>
            <button class="mark-read-btn" data-id="${notif.id}">
                ${getCheckSvg()}
            </button>
        </div>
    `).join('');
    
    document.querySelectorAll('.mark-read-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const id = btn.dataset.id;
            await markNotificationAsRead(id);
            renderNotificationList();
        });
    });
    
    document.querySelectorAll('.notification-item').forEach(item => {
        item.addEventListener('click', async (e) => {
            if (!e.target.closest('.mark-read-btn')) {
                const id = item.dataset.id;
                await markNotificationAsRead(id);
                renderNotificationList();
            }
        });
    });
}

function getNotificationIcon(type) {
    switch(type) {
        case 'success': return 'fa-check-circle';
        case 'error': return 'fa-exclamation-circle';
        case 'warning': return 'fa-exclamation-triangle';
        default: return 'fa-info-circle';
    }
}

async function createSampleNotification() {
    const admin = getCurrentAdmin();
    if (!admin) return;
    
    const { error } = await supabase
        .from('notifications')
        .insert({
            admin_id: admin.admin_id,
            title: 'Welcome to Dashboard',
            message: 'Your admin dashboard is ready. Start managing student records!',
            type: 'success',
            is_read: false,
            created_at: new Date().toISOString()
        });
    
    if (error) {
        console.error('Error creating sample notification:', error);
    } else {
        showSuccessToast('Welcome to your admin dashboard!', 'Welcome', 5000);
        fetchNotifications();
    }
}

// Function to show the send notification modal
function showSendNotificationModal() {
    // Remove existing modal if any
    const existingModal = document.querySelector('.notification-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'notification-modal';
    modal.innerHTML = `
        <div class="notification-modal-content">
            <div class="notification-modal-header">
                <h3>
                    ${getBellSvg()}
                    Send Notification
                </h3>
            </div>
            <div class="notification-modal-body">
                <div class="form-group">
                    <label>Recipient Type</label>
                    <select id="notificationRecipientType">
                        <option value="all">All Students</option>
                        <option value="students_with_penalties">Students with Penalties</option>
                        <option value="specific_student">Specific Student</option>
                    </select>
                </div>
                
                <div class="form-group" id="studentSearchGroup" style="display: none;">
                    <label>Search Student</label>
                    <input type="text" id="studentSearch" placeholder="Enter student ID or name...">
                    <div id="studentSearchResults" style="margin-top: 8px;"></div>
                </div>
                
                <div class="form-group">
                    <label>Notification Type</label>
                    <select id="notificationType">
                        <option value="info">Information</option>
                        <option value="warning">Warning</option>
                        <option value="success">Success</option>
                        <option value="error">Alert</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Title</label>
                    <input type="text" id="notificationTitle" placeholder="e.g., Important Announcement">
                </div>
                
                <div class="form-group">
                    <label>Message</label>
                    <textarea id="notificationMessage" placeholder="Type your notification message here..."></textarea>
                </div>
                
                <div class="form-group" id="recipientPreview" style="display: none;">
                    <label>Will be sent to:</label>
                    <div class="recipient-badge">
                        ${getStudentIconSvg()}
                        <span id="recipientCount">0</span>
                        <span>recipient(s)</span>
                    </div>
                </div>
            </div>
            <div class="notification-modal-footer">
                <button class="modal-cancel">Cancel</button>
                <button class="modal-send">Send Notification</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Get elements
    const recipientType = modal.querySelector('#notificationRecipientType');
    const studentSearchGroup = modal.querySelector('#studentSearchGroup');
    const studentSearch = modal.querySelector('#studentSearch');
    const studentSearchResults = modal.querySelector('#studentSearchResults');
    const notificationType = modal.querySelector('#notificationType');
    const titleInput = modal.querySelector('#notificationTitle');
    const messageInput = modal.querySelector('#notificationMessage');
    const recipientPreview = modal.querySelector('#recipientPreview');
    const recipientCountSpan = modal.querySelector('#recipientCount');
    const cancelBtn = modal.querySelector('.modal-cancel');
    const sendBtn = modal.querySelector('.modal-send');
    
    let selectedStudent = null;
    let currentRecipientCount = 0;
    
    // Define updateRecipientPreview first
    const updateRecipientPreview = async (type, student) => {
        let count = 0;
        
        if (type === 'all') {
            count = students.length;
        } else if (type === 'students_with_penalties') {
            const uniqueStudents = new Set(penalties.map(p => p.student_id));
            count = uniqueStudents.size;
        } else if (type === 'specific_student' && student) {
            count = 1;
        }
        
        currentRecipientCount = count;
        recipientCountSpan.textContent = count;
        
        if (count > 0) {
            recipientPreview.style.display = 'block';
        } else {
            recipientPreview.style.display = 'none';
        }
    };
    
    // Show/hide student search based on recipient type
    recipientType.addEventListener('change', async (e) => {
        if (e.target.value === 'specific_student') {
            studentSearchGroup.style.display = 'block';
            await updateRecipientPreview(recipientType.value, selectedStudent);
        } else {
            studentSearchGroup.style.display = 'none';
            selectedStudent = null;
            await updateRecipientPreview(recipientType.value, null);
        }
    });
    
    // Student search functionality
    let searchTimeout;
    studentSearch.addEventListener('input', async (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();
        
        if (query.length < 2) {
            studentSearchResults.innerHTML = '';
            return;
        }
        
        searchTimeout = setTimeout(async () => {
            try {
                const { data, error } = await supabase
                    .from('students')
                    .select('student_id, name, email')
                    .or(`student_id.ilike.%${query}%,name.ilike.%${query}%`)
                    .limit(5);
                
                if (error) throw error;
                
                if (data && data.length > 0) {
                    studentSearchResults.innerHTML = data.map(student => `
                        <div class="student-result-item" style="
                            padding: 10px;
                            margin-bottom: 5px;
                            background: #f3f4f6;
                            border-radius: 8px;
                            cursor: pointer;
                            transition: all 0.2s;
                        ">
                            <strong>${escapeHtml(student.name)}</strong><br>
                            <small>ID: ${escapeHtml(student.student_id)}</small>
                        </div>
                    `).join('');
                    
                    // Add click handlers
                    document.querySelectorAll('.student-result-item').forEach((item, index) => {
                        item.addEventListener('click', () => {
                            selectedStudent = data[index];
                            studentSearch.value = `${selectedStudent.name} (${selectedStudent.student_id})`;
                            studentSearchResults.innerHTML = '';
                            updateRecipientPreview('specific_student', selectedStudent);
                        });
                    });
                } else {
                    studentSearchResults.innerHTML = '<div style="padding: 10px; color: #999;">No students found</div>';
                }
            } catch (error) {
                console.error('Error searching students:', error);
                studentSearchResults.innerHTML = '<div style="padding: 10px; color: red;">Error searching students</div>';
            }
        }, 300);
    });
    
    // Send notification function
    async function sendNotification() {
        const title = titleInput.value.trim();
        const message = messageInput.value.trim();
        const type = notificationType.value;
        const recipient = recipientType.value;
        
        // Validation
        if (!title) {
            showErrorToast('Please enter a notification title', 'Missing Information');
            titleInput.focus();
            return;
        }
        
        if (!message) {
            showErrorToast('Please enter a notification message', 'Missing Information');
            messageInput.focus();
            return;
        }
        
        if (recipient === 'specific_student' && !selectedStudent) {
            showErrorToast('Please select a student', 'Missing Information');
            return;
        }
        
        if (currentRecipientCount === 0) {
            showErrorToast('No recipients found for this selection', 'Cannot Send');
            return;
        }
        
        // Disable send button
        sendBtn.disabled = true;
        sendBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> Sending...';
        
        try {
            const admin = getCurrentAdmin();
            let notificationsToInsert = [];
            
            if (recipient === 'specific_student' && selectedStudent) {
                // Send to specific student
                notificationsToInsert.push({
                    admin_id: admin.admin_id,
                    student_id: selectedStudent.student_id,
                    title: title,
                    message: message,
                    type: type,
                    is_read: false,
                    created_at: new Date().toISOString()
                });
            } else {
                // Send to multiple students
                let targetStudents = [];
                
                if (recipient === 'all') {
                    targetStudents = students;
                } else if (recipient === 'students_with_penalties') {
                    const studentIds = [...new Set(penalties.map(p => p.student_id))];
                    targetStudents = students.filter(s => studentIds.includes(s.student_id));
                }
                
                notificationsToInsert = targetStudents.map(student => ({
                    admin_id: admin.admin_id,
                    student_id: student.student_id,
                    title: title,
                    message: message,
                    type: type,
                    is_read: false,
                    created_at: new Date().toISOString()
                }));
            }
            
            console.log(`Sending ${notificationsToInsert.length} notifications...`);
            
            // Insert notifications in batches
            const batchSize = 100;
            let successCount = 0;
            
            for (let i = 0; i < notificationsToInsert.length; i += batchSize) {
                const batch = notificationsToInsert.slice(i, i + batchSize);
                const { error } = await supabase
                    .from('notifications')
                    .insert(batch);
                
                if (error) throw error;
                successCount += batch.length;
            }
            
            // Close modal and show success
            modal.remove();
            showSuccessToast(
                `Notification sent successfully to ${successCount} student(s)!`,
                'Notification Sent',
                4000
            );
            
            // Refresh notifications for admin
            if (typeof fetchNotifications === 'function') {
                await fetchNotifications();
            }
            
        } catch (error) {
            console.error('Error sending notification:', error);
            showErrorToast('Failed to send notification. Please try again.', 'Error');
            sendBtn.disabled = false;
            sendBtn.innerHTML = 'Send Notification';
        }
    }
    
    // Initialize preview
    updateRecipientPreview(recipientType.value, null);
    
    // Event listeners
    cancelBtn.addEventListener('click', () => modal.remove());
    sendBtn.addEventListener('click', sendNotification);
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// ============ ADMIN AUTH CHECK ============
async function checkAdminAuth() {
    try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
            console.log('No session found - unauthorized access');
            showErrorToast('No active session. Please login again.', 'Unauthorized');
            redirectToUnauthorized();
            return false;
        }
        
        const userEmail = session.user.email;
        console.log('Checking admin access for:', userEmail);
        
        const { data: adminData, error: adminError } = await supabase
            .from('admins')
            .select('id, admin_id, full_name, email, role, status')
            .eq('email', userEmail)
            .maybeSingle();
        
        if (adminError || !adminData) {
            console.log('User is not an admin - access denied');
            showErrorToast('Access denied. Admin privileges required.', 'Access Denied');
            redirectToUnauthorized();
            return false;
        }
        
        if (adminData.status !== 'active') {
            console.log('Admin account is inactive');
            showErrorToast('Your account is inactive. Please contact support.', 'Account Inactive');
            redirectToUnauthorized();
            return false;
        }
        
        console.log('Admin authorized:', adminData.full_name);
        
        const currentSessionId = session.access_token;
        const lastSessionId = sessionStorage.getItem('lastSessionId');
        const isNewSession = (lastSessionId !== currentSessionId);
        
        if (isNewSession) {
            showSuccessToast(`Welcome back, ${adminData.full_name}!`, 'Login Successful', 3000);
            sessionStorage.setItem('lastSessionId', currentSessionId);
        }
        
        localStorage.setItem('currentAdmin', JSON.stringify({
            id: adminData.id,
            admin_id: adminData.admin_id,
            email: adminData.email,
            name: adminData.full_name,
            full_name: adminData.full_name,
            role: adminData.role,
            status: adminData.status
        }));
        
        setupAdminDrawer(adminData.full_name, adminData.admin_id);
        setupAdminLogout('logoutBtn');
        setupAdminDrawerControls();
        
        return true;
        
    } catch (error) {
        console.error('Auth check error:', error);
        showErrorToast('Authentication error. Please try again.', 'Error');
        redirectToUnauthorized();
        return false;
    }
}

function redirectToUnauthorized() {
    showUnauthorizedNotification();
    localStorage.removeItem('currentAdmin');
    sessionStorage.removeItem('lastSessionId');
    
    setTimeout(() => {
        window.location.href = '/index.html';
    }, 2000);
}

function showUnauthorizedNotification() {
    const notification = document.createElement('div');
    notification.innerHTML = `
        <div style="
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #DC2626;
            color: white;
            padding: 16px 24px;
            border-radius: 12px;
            font-size: 14px;
            font-weight: 500;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            text-align: center;
            min-width: 300px;
        ">
            <div style="margin-bottom: 8px;">
                ${getWarningIconSvg()}
                Unauthorized Access
            </div>
            <div style="font-size: 12px; opacity: 0.9;">Redirecting to landing page...</div>
        </div>
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 2000);
}

// ============ SET CURRENT DATE WITH CALENDAR ICON ============
const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
const currentDateEl = document.getElementById('currentDate');
if (currentDateEl) {
    const dateString = new Date().toLocaleDateString('en-US', dateOptions);
    currentDateEl.innerHTML = `${getCalendarSvg(14)} ${dateString}`;
}

// ============ GREETING BASED ON TIME ============
function updateGreeting() {
    const hour = new Date().getHours();
    let greeting = 'Good morning';
    if (hour >= 12 && hour < 18) greeting = 'Good afternoon';
    if (hour >= 18) greeting = 'Good evening';
    
    const welcomeTitle = document.getElementById('welcomeTitle');
    if (welcomeTitle) {
        const admin = getCurrentAdmin();
        const adminName = admin?.full_name || admin?.name || 'Administrator';
        welcomeTitle.innerHTML = `${greeting}, ${adminName} ${getWaveSvg()}`;
    }
}

// ============ LOAD ADMIN NAME ============
async function loadAdminName() {
    try {
        console.log('Loading admin name...');
        
        const storedAdmin = localStorage.getItem('currentAdmin');
        if (storedAdmin) {
            try {
                const admin = JSON.parse(storedAdmin);
                const adminName = admin.full_name || admin.name;
                if (adminName) {
                    updateGreeting();
                    console.log('Admin name loaded from localStorage:', adminName);
                    return;
                }
            } catch(e) {}
        }
        
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
            console.log('No user logged in');
            return;
        }
        
        console.log('User found:', user.email);
        
        const { data: adminData, error: adminError } = await supabase
            .from('admins')
            .select('full_name, email, role, status, admin_id')
            .eq('email', user.email)
            .maybeSingle();
        
        if (adminError || !adminData) {
            console.log('No admin record found');
            return;
        }
        
        const adminName = adminData.full_name || user.email.split('@')[0];
        console.log('Admin name found:', adminName);
        
        localStorage.setItem('currentAdmin', JSON.stringify({ 
            full_name: adminName, 
            email: user.email,
            role: adminData.role,
            admin_id: adminData.admin_id,
            status: adminData.status
        }));
        
        updateGreeting();
        
    } catch (error) {
        console.error('Error loading admin name:', error);
    }
}

// ============ DATA STORES ============
let students = [];
let penalties = [];

// ============ LOAD STUDENTS FROM SUPABASE ============
async function loadStudents() {
    try {
        const { data, error } = await supabase
            .from('students')
            .select('*');
        
        if (error) throw error;
        students = data || [];
        console.log('Students loaded:', students.length);
        return students;
    } catch (error) {
        console.error('Error loading students:', error);
        students = [];
        return [];
    }
}

// ============ LOAD PENALTIES FROM SUPABASE ============
async function loadPenalties() {
    try {
        const { data, error } = await supabase
            .from('penalties')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        penalties = data || [];
        console.log('Penalties loaded:', penalties.length);
        return penalties;
    } catch (error) {
        console.error('Error loading penalties:', error);
        penalties = [];
        return [];
    }
}

// ============ UPDATE STATISTICS ============
function updateStats() {
    const totalStudents = students.length;
    const activePenalties = penalties.filter(p => p.status !== 'completed').length;
    const completedHours = penalties
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + (parseInt(p.hours) || 0), 0);
    const complianceRate = totalStudents > 0 ? Math.min(Math.round((completedHours / (totalStudents * 10)) * 100), 100) : 0;
    
    const totalStudentsEl = document.getElementById('totalStudents');
    const activePenaltiesEl = document.getElementById('activePenalties');
    const completedHoursEl = document.getElementById('completedHours');
    const complianceRateEl = document.getElementById('complianceRate');
    
    if (totalStudentsEl) totalStudentsEl.textContent = totalStudents;
    if (activePenaltiesEl) activePenaltiesEl.textContent = activePenalties;
    if (completedHoursEl) completedHoursEl.textContent = completedHours;
    if (complianceRateEl) complianceRateEl.textContent = `${complianceRate}%`;
    
    console.log('Stats updated:', { totalStudents, activePenalties, completedHours, complianceRate });
}

// ============ UPDATE RECENT PENALTIES TABLE ============
function updateRecentPenalties() {
    const tbody = document.getElementById('recentPenaltiesBody');
    if (!tbody) return;
    
    const recentPenalties = [...penalties].slice(0, 5);
    
    if (recentPenalties.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    <div class="empty-icon">
                        ${getWarningIconSvg()}
                    </div>
                    <div>No penalty records found</div>
                </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = recentPenalties.map(p => `
        <tr>
            <td><strong>${escapeHtml(p.student_id || 'N/A')}</strong></td>
            <td>${escapeHtml(p.violation)}</span></td>
            <td>${p.hours || 0} hrs</span></td>
            <td><span class="status-badge status-${p.status === 'in-progress' ? 'progress' : p.status}">${p.status === 'in-progress' ? 'In Progress' : p.status || 'pending'}</span></td>
            <td>${formatDate(p.deadline)}</span></td>
        </tr>
    `).join('');
}

// ============ UPDATE TOP VIOLATIONS ============
function updateTopViolations() {
    const container = document.getElementById('violationsContainer');
    if (!container) return;
    
    const violationCount = {};
    penalties.forEach(p => {
        if (p.violation) {
            violationCount[p.violation] = (violationCount[p.violation] || 0) + 1;
        }
    });
    
    const topViolations = Object.entries(violationCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    if (topViolations.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    ${getDocumentIconSvg()}
                </div>
                <div>No violations recorded yet</div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = topViolations.map(([name, count]) => `
        <div class="violation-item">
            <span class="violation-name">${escapeHtml(name)}</span>
            <span class="violation-count">${count} cases</span>
        </div>
    `).join('');
}

// ============ UPDATE ACTIVITY FEED ============
function updateActivityFeed() {
    const container = document.getElementById('activityContainer');
    if (!container) return;
    
    const activities = [];
    
    students.forEach(student => {
        if (student.created_at) {
            activities.push({
                text: `New student registered: ${student.name}`,
                time: new Date(student.created_at),
                icon: getCalendarActivitySvg()
            });
        }
    });
    
    penalties.forEach(penalty => {
        if (penalty.created_at) {
            activities.push({
                text: `Penalty issued to ${penalty.student_id} for ${penalty.violation}`,
                time: new Date(penalty.created_at),
                icon: getCalendarActivitySvg()
            });
        }
    });
    
    activities.sort((a, b) => b.time - a.time);
    const recentActivities = activities.slice(0, 5);
    
    if (recentActivities.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    ${getCalendarActivitySvg()}
                </div>
                <div>No recent activity</div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = recentActivities.map(a => `
        <div class="activity-item">
            <div class="activity-icon">${a.icon}</div>
            <div class="activity-content">
                <div class="activity-text">${escapeHtml(a.text)}</div>
                <div class="activity-time">${formatRelativeTime(a.time)}</div>
            </div>
        </div>
    `).join('');
}

// ============ UPDATE CHART ============
let penaltyChart;

function updateChart() {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const last6Months = [];
    const currentDate = new Date();
    
    for (let i = 5; i >= 0; i--) {
        const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        last6Months.push(months[d.getMonth()] + ' ' + d.getFullYear());
    }
    
    const monthlyCounts = last6Months.map(() => 0);
    
    penalties.forEach(penalty => {
        if (penalty.created_at) {
            const date = new Date(penalty.created_at);
            const monthYear = months[date.getMonth()] + ' ' + date.getFullYear();
            const index = last6Months.indexOf(monthYear);
            if (index !== -1) {
                monthlyCounts[index]++;
            }
        }
    });
    
    const ctx = document.getElementById('penaltyChart')?.getContext('2d');
    if (!ctx) return;
    
    if (penaltyChart) penaltyChart.destroy();
    
    penaltyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: last6Months,
            datasets: [{
                label: 'Penalties Issued',
                data: monthlyCounts,
                borderColor: '#2563EB',
                backgroundColor: 'rgba(37, 99, 235, 0.05)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#2563EB',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1 }
                }
            }
        }
    });
}

// ============ HELPER FUNCTIONS ============
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
}

function formatRelativeTime(date) {
    const diffMins = Math.floor((Date.now() - date) / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
}

// ============ REFRESH ALL DASHBOARD DATA ============
async function refreshDashboard() {
    console.log('Refreshing dashboard data from Supabase...');
    await loadStudents();
    await loadPenalties();
    updateStats();
    updateRecentPenalties();
    updateTopViolations();
    updateActivityFeed();
    updateChart();
    console.log(`Dashboard updated: ${students.length} students, ${penalties.length} penalties`);
}

// ============ DARK MODE ============
function initDarkMode() {
    const savedMode = localStorage.getItem('docst_dark_mode');
    if (savedMode === 'enabled') {
        document.body.classList.add('dark-mode');
    }
}

function setupDarkModeToggle() {
    const darkModeBtn = document.getElementById('darkModeToggle');
    if (!darkModeBtn) return;
    
    const isDark = document.body.classList.contains('dark-mode');
    updateDarkModeIcon(darkModeBtn, isDark);
    
    darkModeBtn.onclick = () => {
        document.body.classList.toggle('dark-mode');
        const nowDark = document.body.classList.contains('dark-mode');
        localStorage.setItem('docst_dark_mode', nowDark ? 'enabled' : 'disabled');
        updateDarkModeIcon(darkModeBtn, nowDark);
        showInfoToast(nowDark ? 'Dark mode enabled' : 'Light mode enabled', 'Display Mode', 2000);
    };
}

function updateDarkModeIcon(btn, isDark) {
    if (!btn) return;
    if (isDark) {
        btn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="12" x2="23" y2="12"/>
            </svg>
        `;
    } else {
        btn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
        `;
    }
}

const darkModeStyle = document.createElement('style');
darkModeStyle.textContent = `
    @keyframes fadeInOut {
        0% { opacity: 0; transform: translateX(20px); }
        15% { opacity: 1; transform: translateX(0); }
        85% { opacity: 1; transform: translateX(0); }
        100% { opacity: 0; transform: translateX(20px); }
    }
`;
document.head.appendChild(darkModeStyle);

// ============ NOTIFICATION BUTTON ============
const notifyBtn = document.getElementById('notifyBtn');
if (notifyBtn) {
    notifyBtn.addEventListener('click', () => {
        showNotificationPanel();
    });
}

// ============ SEND NOTIFICATION BUTTON SETUP ============
function setupSendNotificationButton() {
    const sendNotificationBtn = document.getElementById('sendNotificationBtn');
    if (sendNotificationBtn) {
        // Remove existing listeners to avoid duplicates
        const newBtn = sendNotificationBtn.cloneNode(true);
        sendNotificationBtn.parentNode.replaceChild(newBtn, sendNotificationBtn);
        
        newBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showSendNotificationModal();
        });
        console.log('Send notification button initialized');
    } else {
        console.warn('Send notification button not found in DOM');
    }
}

// ============ INITIALIZE ============
async function init() {
    console.log('Checking admin authentication...');
    
    const isAuthorized = await checkAdminAuth();
    if (!isAuthorized) {
        return;
    }
    
    console.log('Initializing Admin Dashboard...');
    initDarkMode();
    setupDarkModeToggle();
    await loadAdminName();
    await refreshDashboard();
    
    startNotificationPolling();
    setupSendNotificationButton();
    
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcomeNotification');
    if (!hasSeenWelcome) {
        setTimeout(() => {
            createSampleNotification();
            localStorage.setItem('hasSeenWelcomeNotification', 'true');
        }, 1500);
    }
    
    setInterval(refreshDashboard, 90000);
}

// ============ DRAWER STATE TRACKING FOR MOBILE BOTTOM NAV ============
(function() {
    const drawer = document.getElementById('drawer');
    const overlay = document.getElementById('overlay');
    const hamburger = document.getElementById('hamburger');
    const drawerClose = document.getElementById('drawerClose');
    
    function updateBodyState() {
        if (drawer && drawer.classList.contains('open')) {
            document.body.classList.add('drawer-open');
            document.body.style.overflow = 'hidden';
        } else {
            document.body.classList.remove('drawer-open');
            document.body.style.overflow = '';
        }
    }
    
    if (drawer) {
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.attributeName === 'class') {
                    updateBodyState();
                }
            });
        });
        observer.observe(drawer, { attributes: true });
        updateBodyState();
    }
    
    if (hamburger) {
        hamburger.addEventListener('click', () => {
            setTimeout(updateBodyState, 50);
        });
    }
    
    if (drawerClose) {
        drawerClose.addEventListener('click', () => {
            setTimeout(updateBodyState, 50);
        });
    }
    
    if (overlay) {
        overlay.addEventListener('click', () => {
            setTimeout(updateBodyState, 50);
        });
    }
})();

init();

export { supabase, showLogoutToast };