/* Sign in / register page – runs after app.js (uses Auth, $, $$, toast) */
MH.ready.then(() => {   // wait for the backend check (see app.js), then run
const nextParam = new URLSearchParams(location.search).get('next') || '';
const NEXT = /^[\w-]+\.html(\?[\w=&.-]*)?$/.test(nextParam) ? nextParam : 'account.html';   // same-site pages only
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function showTab(t) {
  const reg = t === 'reg';
  $('#fSign').hidden = reg; $('#fReg').hidden = !reg;
  $('#tSign').classList.toggle('on', !reg); $('#tReg').classList.toggle('on', reg);
  document.title = (reg ? 'Create Account' : 'Sign In') + ' – MarketHub';
}
const busy = (f, on) => { const b = f.querySelector('button.btn'); b.disabled = on; b.textContent = on ? 'Please wait…' : f.id === 'fReg' ? 'Create Account' : 'Sign In'; };
const val = (f, n) => f.elements[n].value;

document.addEventListener('click', e => {
  const c = e.target.closest('[data-t],[data-eye],[data-soon]');
  if (!c) return;
  if (c.tagName === 'A') e.preventDefault();
  if (c.dataset.t) { showTab(c.dataset.t); history.replaceState(null, '', c.dataset.t === 'reg' ? '#register' : location.pathname + location.search); }
  else if (c.dataset.soon) toast(c.dataset.soon);
  else if (c.dataset.eye !== undefined) { const i = c.previousElementSibling; i.type = i.type === 'password' ? 'text' : 'password'; c.textContent = i.type === 'password' ? 'Show' : 'Hide'; }
});

/* password strength */
$('#fReg').elements.namedItem('password').addEventListener('input', e => {
  const v = e.target.value;
  const score = (v.length >= 8) + /[a-z]/i.test(v) + /\d/.test(v) + (v.length >= 12) + /[^\w\s]/.test(v);
  const lvl = !v ? 0 : score <= 2 ? 1 : score <= 3 ? 2 : 3;
  $('#meter').style.width = [0, 33, 66, 100][lvl] + '%'; $('#meter').style.background = ['', '#e5242b', '#f5a31f', '#1f9d55'][lvl];
  $('#meterTxt').textContent = ['Use 8+ characters with letters and numbers', 'Weak', 'Okay', 'Strong'][lvl];
});

/* sign in (with a simple 30s lockout after 5 failures) */
$('#fSign').addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.target, err = $('#eSign'); err.textContent = '';
  const lock = +(sessionStorage.getItem('mh_lock') || 0);
  if (Date.now() < lock) return err.textContent = `Too many attempts. Try again in ${Math.ceil((lock - Date.now()) / 1000)}s.`;
  if (!EMAIL.test(val(f, 'email').trim())) return err.textContent = 'Enter a valid email address.';
  if (!val(f, 'password')) return err.textContent = 'Enter your password.';
  busy(f, true);
  try {
    const r = await Auth.login(val(f, 'email'), val(f, 'password'), f.elements.remember.checked);
    if (r.error) {
      const n = +(sessionStorage.getItem('mh_fails') || 0) + 1; sessionStorage.setItem('mh_fails', n);
      if (n >= 5) { sessionStorage.setItem('mh_lock', Date.now() + 30000); sessionStorage.setItem('mh_fails', 0); }
      err.textContent = r.error;
    } else { sessionStorage.setItem('mh_fails', 0); location.href = NEXT; return; }
  } catch { err.textContent = 'Sign-in needs a secure context. Open the site with Live Server (localhost) or https.'; }
  busy(f, false);
});

/* register */
$('#fReg').addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.target, err = $('#eReg'), pw = val(f, 'password'); err.textContent = '';
  if (val(f, 'name').trim().length < 2) return err.textContent = 'Enter your full name.';
  if (!EMAIL.test(val(f, 'email').trim())) return err.textContent = 'Enter a valid email address.';
  if (!/^[0-9+\s]{10,16}$/.test(val(f, 'phone').trim())) return err.textContent = 'Enter a valid phone number.';
  if (pw.length < 8 || !/[a-z]/i.test(pw) || !/\d/.test(pw)) return err.textContent = 'Password needs 8+ characters with letters and numbers.';
  if (pw !== val(f, 'confirm')) return err.textContent = 'Passwords do not match.';
  if (!f.elements.terms.checked) return err.textContent = 'Please accept the Terms and Privacy Policy.';
  busy(f, true);
  try {
    const r = await Auth.register({ name: val(f, 'name'), email: val(f, 'email'), phone: val(f, 'phone'), password: pw });
    if (r.error) err.textContent = r.error; else { location.href = NEXT; return; }
  } catch { err.textContent = 'Registration needs a secure context. Open the site with Live Server (localhost) or https.'; }
  busy(f, false);
});

showTab(location.hash === '#register' ? 'reg' : 'sign');
});