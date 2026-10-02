const CLASSES = [...Array.from({length:10},(_,i)=>`Class ${i+1}`), 'HSC 1st Year', 'HSC 2nd Year'];
const METHODS = ['Cash','Bkash','Nagad','Rocket','Bank Transfer'];
const PAGES = [
  ['dashboard','Dashboard','grid'], ['students','Students','users'], ['attendance','Attendance','check'],
  ['schedule','Schedule','calendar'], ['exams','Exams','file'], ['payments','Payments','wallet'],
  ['invoices','Invoices','receipt'], ['holidays','Holidays','sun'], ['feedback','Feedback','message']
];
const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const localDate = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);

function renderNav() {
  const nav = $('nav');
  if (!nav) return;
  const here = location.pathname.split('/').pop().replace('.html', '');
  nav.innerHTML = `
    <div class="nav-in">
      <strong class="brand">TuitionFlow</strong>
      <button class="menu-btn" aria-label="Toggle menu" onclick="$('links').classList.toggle('open')">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
      </button>
      <nav id="links">
        ${PAGES.map(([p, l, icon]) => `<a href="${p}.html" ${p === here ? 'aria-current="page"' : ''}><span class="nav-ico">${svg(icon)}</span><span>${l}</span></a>`).join('')}
        <div class="theme-switcher" aria-label="Theme selection">
          <button class="theme-btn" data-theme-choice="light" title="Light mode" aria-label="Light mode">${svg('sun')}</button>
          <button class="theme-btn" data-theme-choice="blue" title="Blue mode" aria-label="Blue mode">${svg('palette')}</button>
          <button class="theme-btn" data-theme-choice="dark" title="Dark mode" aria-label="Dark mode">${svg('moon')}</button>
        </div>
        <button class="btn ghost logout-btn" onclick="logout()"><span class="nav-ico">${svg('logout')}</span><span>Logout</span></button>
      </nav>
    </div>`;
  initTheme();
}

function requireAuth() {
  renderNav();
  return new Promise(resolve => {
    const off = auth.onAuthStateChanged(u => {
      off();
      if (!u) { location.href = 'login.html'; return resolve(null); }
      USER = u;
      resolve(u);
    });
  });
}

async function logout() { await auth.signOut(); location.href = 'login.html'; }

function toast(msg, type = 'ok') {
  const t = document.createElement('div');
  t.className = `toast ${type}`; t.setAttribute('role', 'status'); t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

function exportCSV(rows, filename) {
  if (!rows.length) return toast('Nothing to export', 'err');
  const keys = Object.keys(rows[0]);
  const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [keys.join(','), ...rows.map(r => keys.map(k => q(r[k])).join(','))].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = filename; a.click();
}
const ICONS = {
  wallet: '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
  trend: '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
  calx: '<path d="M8 2v4M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18M10 14l4 4M14 14l-4 4"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  ucheck: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/>',
  cal: '<path d="M8 2v4M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
  exam: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4M10 9H8M16 13H8M16 17H8"/>',
  book: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  alert: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>',
  chart: '<path d="M3 3v18h18"/><path d="M18 17V9M13 17V5M8 17v-3"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  check: '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  calendar: '<path d="M8 2v4M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h6"/>',
  receipt: '<path d="M4 2v20l3-2 3 2 3-2 3 2 4-2V2l-4 2-3-2-3 2-3-2z"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>',
  message: '<path d="M21 11.5a8.38 8.38 0 0 1-9 8.5 9.7 9.7 0 0 1-4-.8L3 21l1.8-4A8.3 8.3 0 0 1 3 11.5 8.38 8.38 0 0 1 12 3a8.38 8.38 0 0 1 9 8.5z"/><path d="M8 11h.01M12 11h.01M16 11h.01"/>',
  logout: '<path d="M10 17l5-5-5-5M15 12H3"/><path d="M21 19V5a2 2 0 0 0-2-2h-6"/>',
  palette: '<circle cx="12" cy="12" r="9"/><path d="M8 15.5h.01M8 9h.01M12 7h.01M16 9h.01M17 14h-2a2 2 0 0 0-2 2v1"/>',
  moon: '<path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5 8.5 8.5 0 1 0 20.5 14.5z"/>'
};
const svg = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ''}</svg>`;
function applyTheme(theme) {
  const valid = ['light','blue','dark'];
  if (!valid.includes(theme)) theme = 'light';
  document.documentElement.dataset.theme = theme;
  localStorage.setItem('tuitionflow_theme', theme);
  document.querySelectorAll('[data-theme-choice]').forEach(btn => btn.classList.toggle('active', btn.dataset.themeChoice === theme));
}
function initTheme() {
  const saved = localStorage.getItem('tuitionflow_theme') || 'light';
  applyTheme(saved);
  document.querySelectorAll('[data-theme-choice]').forEach(btn => btn.addEventListener('click', () => applyTheme(btn.dataset.themeChoice)));
}
document.querySelectorAll('[data-icon]').forEach(el => el.innerHTML = svg(el.dataset.icon));