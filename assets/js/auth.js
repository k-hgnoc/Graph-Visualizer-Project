/* ════════════════════════════════════════════
   auth.js
   – Redirect nếu chưa đăng nhập (dành cho /pages/)
   – Render navbar: hiện email + nút Logout
   – Dùng chung cho tất cả trang con
   ════════════════════════════════════════════ */

/* ── Redirect nếu chưa đăng nhập ── */
(function checkAuth() {
    const isSubpage = window.location.pathname.includes('/pages/');
    if (isSubpage && !localStorage.getItem('currentUser')) {
        window.location.href = '../index.html';
    }
})();

/* ── Render navbar ── */
function renderAuthNav() {
    const nav   = document.getElementById('auth-nav');
    if (!nav) return;

    const email = localStorage.getItem('currentUser');

    if (email) {
        nav.innerHTML = `
            <span class="nav-username">${email}</span>
            <button class="btn-nav-logout" onclick="doLogoutNav()">LOGOUT</button>
        `;
    } else {
        // Trang con không nên hiển thị được nếu chưa đăng nhập
        // nhưng để an toàn vẫn render nút về trang chủ
        nav.innerHTML = `
            <a class="btn-nav-login" href="../index.html">ĐĂNG NHẬP</a>
        `;
    }
}

/* ── Logout từ trang con ── */
function doLogoutNav() {
    // dbLogout() từ supabaseClient.js (đã load trước auth.js)
    if (typeof dbLogout === 'function') dbLogout();
    else localStorage.removeItem('currentUser');

    // Redirect về trang chủ
    const isSubpage = window.location.pathname.includes('/pages/');
    window.location.href = isSubpage ? '../index.html' : 'index.html';
}

/* ── Auto-render khi load ── */
window.addEventListener('DOMContentLoaded', renderAuthNav);