/* MarketHub – shared script. Include on every page. Cart & wishlist persist via localStorage. */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const fmt = n => '₦' + n.toLocaleString('en-NG');
const store = {
  get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
};

/* ---------- Data (swap `e` emoji for `img:'images/x.jpg'` when you have photos) ---------- */
const CATS = [
  ['phones','Phones & Tablets','📱'],['electronics','Electronics','🖥️'],['fashion','Fashion','👕'],
  ['home','Home & Kitchen','🏠'],['health','Health & Beauty','💄'],['groceries','Groceries','🧺'],
  ['baby','Baby Products','🍼'],['sports','Sporting Goods','🏀'],['auto','Automobile','🚗'],
  ['books','Books & Stationery','📚'],['gaming','Gaming','🎮'],['pets','Pet Supplies','🐾']
];
const BRANDS = ['Samsung','Apple','Nike','Adidas','Tecno','HP','LG','Xiaomi'];
const P = (id,name,price,old,r,rv,cat,e,sec) => ({id,name,price,old,r,rv,cat,e,sec});
const PRODUCTS = [
  P(1,'Infinix Hot 30 6.6" 128GB 8GB RAM',142500,237500,4,'340','phones','📱','flash'),
  P(2,'Oraimo FreePods 4 Bluetooth Earbuds',21800,36300,5,'1.2k','electronics','🎧','flash'),
  P(3,'Binatone Standing Fan 18" Remote Control',38900,64800,4,'87','home','🌀','flash'),
  P(4,'Silver Crest 2L Heavy Duty Blender',24500,40800,4,'212','home','🥤','flash'),
  P(5,'Tecno Spark 20 6.6" 128GB 8GB RAM',118990,198300,4,'560','phones','📱','flash'),
  P(6,'Nexus 5-Burner Gas Cooker with Oven',189000,315000,4,'143','home','🔥','flash'),
  P(7,'Samsung Galaxy A15 128GB Dual SIM',189000,215000,5,'820','phones','📱','top'),
  P(8,'Ankara Print Maxi Dress for Women',24500,32000,4,'156','fashion','👗','top'),
  P(9,'Nike Air Force 1 Low Sneakers',78000,95000,5,'1.2k','fashion','👟','top'),
  P(10,'LG 43" Smart LED TV with WiFi',289000,340000,5,'410','electronics','📺','top'),
  P(11,'Casio Edifice Chronograph Wristwatch',96500,120000,5,'233','fashion','⌚','top'),
  P(12,'Sony WH-CH520 Wireless Headphones',62000,74000,4,'512','electronics','🎧','top'),
  P(13,'Philips 2L Daily Collection Blender',45900,58000,4,'188','home','🥤','top'),
  P(14,'Vintage Full-Grain Leather Backpack',38500,49000,4,'97','fashion','🎒','top'),
  P(15,'Apple iPhone 15 128GB Titanium',985000,1150000,5,'2.3k','phones','📱','rec'),
  P(16,'HP Pavilion 15 Core i7 16GB Laptop',875000,960000,5,'340','electronics','💻','rec'),
  P(17,'Adidas Ultraboost 22 Running Shoes',112000,135000,5,'276','sports','👟','rec'),
  P(18,'Hisense 55" 4K UHD Smart TV',495000,560000,4,'610','electronics','📺','rec'),
  P(19,'Samsung 20L Solo Microwave Oven',128000,152000,4,'129','home','🍲','rec'),
  P(20,'Apple Watch SE GPS 44mm Sport Band',399000,445000,5,'894','electronics','⌚','rec'),
  P(21,'Oraimo 20000mAh Power Bank Fast Charge',27500,35000,5,'1.5k','electronics','🔋','rec'),
  P(22,'Elegant Leather Tote Handbag for Women',52000,68000,5,'203','fashion','👜','rec')
].concat(window.EXTRA_PRODUCTS || []);   // phones.js adds the smartphone catalogue
const byId = id => PRODUCTS.find(p => p.id == id);

/* ---------- State ---------- */
let cart = store.get('mh_cart', {});       // {id: qty}
let wish = store.get('mh_wish', []);       // [id]
const cartCount = () => Object.values(cart).reduce((a, b) => a + b, 0);
const save = () => { store.set('mh_cart', cart); store.set('mh_wish', wish); updateBadges(); };

function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2000);
}

/* ---------- Shared header / footer / drawer ---------- */
function mountShell() {
  const u = Auth.user(), first = u ? Auth.esc(u.name.split(' ')[0]) : '';
  $('#site-header').innerHTML = `
  <div class="topbar"><span>Deliver to: <b>Lagos</b></span>
    <span><a href="page.html?p=seller">Sell on MarketHub</a><a href="page.html?p=help">Help</a><a href="page.html?p=track">Track Order</a>${u ? `<a href="#" data-act="account">Hi, ${first}</a><a href="#" data-act="logout" class="reg">Sign Out</a>` : '<a href="account.html">Sign In</a><a href="account.html#register" class="reg">Register</a>'}</span></div>
  <header class="head">
    <a href="index.html" class="logo"><i>🏪</i>MarketHub</a>
    <form class="search" id="searchForm">
      <select id="searchCat"><option value="">All Categories</option>${CATS.map(c => `<option value="${c[0]}">${c[1]}</option>`).join('')}</select>
      <input id="searchInput" placeholder="Search products, brands and categories" autocomplete="off">
      <button>🔍 Search</button>
    </form>
    <div class="hact">
      <button data-act="account"><span class="ic">👤</span><span class="lbl">${u ? first : 'Account'}</span></button>
      <button data-act="wishlist"><span class="ic">♡</span><span class="badge" id="wBadge">0</span></button>
      <button data-act="cart"><span class="ic">🛒</span><span class="lbl">Cart</span><span class="badge c" id="cBadge">0</span></button>
    </div>
  </header>
  <nav class="nav"><a href="#" data-act="allcats">☰ All Categories ⌄</a><a href="index.html#flash">Flash Sales</a><a href="page.html?p=soon">MarketHub Global</a><a href="page.html?p=seller">Sell on MarketHub</a><a href="page.html?p=help">Help Center</a><a href="page.html?p=track">Track Order</a><span class="push">✔ Pay on Delivery available</span></nav>`;

  const LINKS = { 'About Us': 'page.html?p=about', 'Help Center': 'page.html?p=help', 'Track Order': 'page.html?p=track', 'Returns & Refunds': 'page.html?p=help#returns',
    'Shipping Info': 'page.html?p=help#shipping', 'FAQ': 'page.html?p=faq', 'Contact Us': 'page.html?p=contact', 'Terms': 'page.html?p=terms', 'Privacy': 'page.html?p=privacy', 'Cookies': 'page.html?p=privacy#cookies',
    'Careers': 'page.html?p=about#careers', 'Blog': 'page.html?p=soon', 'Press': 'page.html?p=soon', 'Become a Seller': 'page.html?p=seller',
    'Seller Login': 'page.html?p=soon', 'Seller Policies': 'page.html?p=sellerpolicies', 'Payout Info': 'page.html?p=payouts' };
  const col = (t, items) => `<div><h4>${t}</h4><ul>${items.map(i => `<li><a href="${LINKS[i] || '#'}">${i}</a></li>`).join('')}</ul></div>`;
  $('#site-footer').innerHTML = `
  <section class="news"><h2>Get the best deals in your inbox</h2><p>Subscribe to MarketHub and never miss a sale.</p>
    <form id="newsForm" novalidate><input type="email" id="newsEmail" placeholder="Enter your email address"><button>Subscribe</button></form>
    <div class="msg" id="newsMsg"></div></section>
  <footer class="foot"><div class="fcols">
    ${col('MarketHub',['About Us','Careers','Blog','Press','Contact Us'])}
    ${col('Customer Service',['Help Center','Track Order','Returns & Refunds','Shipping Info','FAQ'])}
    ${col('Sell With Us',['Become a Seller','Seller Login','Seller Policies','Payout Info'])}
    <div><h4>Legal & Social</h4><ul><li><a href="page.html?p=terms">Terms</a></li><li><a href="page.html?p=privacy">Privacy</a></li><li><a href="page.html?p=privacy#cookies">Cookies</a></li></ul>
      <div class="soc"><a href="#">f</a><a href="#">X</a><a href="#">ig</a><a href="#">yt</a></div></div></div>
    <div class="legal"><span>© ${new Date().getFullYear()} MarketHub. All rights reserved.</span>
      <span>We accept <span>Visa</span><span>Mastercard</span><span>Verve</span><span>Paystack</span></span></div></footer>
  <div class="shade" id="shade" hidden></div>
  <aside id="drawer"><div class="dh"><h3>Your Cart</h3><button data-act="close">✕</button></div>
    <div id="cartItems"></div>
    <div class="df"><p><span>Total</span><span id="cartTotal">₦0</span></p><a class="btn" href="cart.html">View Cart &amp; Checkout</a></div></aside>
  <div id="toast"></div>`;

  $('#searchForm').addEventListener('submit', e => {
    e.preventDefault();
    const q = $('#searchInput').value.trim(), c = $('#searchCat').value;
    location.href = 'category.html?' + new URLSearchParams({ ...(q && { q }), ...(c && { c }) });
  });
  $('#newsForm').addEventListener('submit', e => {
    e.preventDefault();
    const v = $('#newsEmail').value.trim(), m = $('#newsMsg');
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { m.textContent = '✔ Thanks for subscribing!'; $('#newsEmail').value = ''; }
    else m.textContent = 'Please enter a valid email address.';
  });
}

/* ---------- Cart drawer ---------- */
function renderCart() {
  const ids = Object.keys(cart);
  $('#cartItems').innerHTML = ids.length ? ids.map(id => {
    const p = byId(id);
    return `<div class="ci"><div class="t">${pic(p)}</div><div><b>${p.name}</b><small>${fmt(p.price)}</small>
      <div class="qty"><button data-qty="-1" data-id="${id}">−</button>${cart[id]}<button data-qty="1" data-id="${id}">+</button></div></div>
      <button class="rm" data-rm="${id}">🗑</button></div>`;
  }).join('') : '<p class="empty">Your cart is empty.</p>';
  $('#cartTotal').textContent = fmt(ids.reduce((s, id) => s + byId(id).price * cart[id], 0));
}
function toggleDrawer(open) {
  if (open) renderCart();
  $('#drawer').classList.toggle('open', open);
  $('#shade').hidden = !open;
}
function updateBadges() {
  $('#cBadge').textContent = cartCount(); $('#wBadge').textContent = wish.length;
  $$('.heart').forEach(h => h.classList.toggle('on', wish.includes(+h.dataset.wish)));
  if ($('#drawer')?.classList.contains('open')) renderCart();
}

/* ---------- Product rendering ---------- */
const USE_PHOTOS = false;   // set true after adding images/products/<id>.jpg (see images/products/README.txt)
const pic = p => p.img ? `<img src="${p.img}" alt="" loading="lazy">` : USE_PHOTOS
  ? `<img src="images/products/${p.id}.jpg" alt="" loading="lazy" onerror="this.replaceWith(document.createTextNode('${p.e}'))">` : p.e;
const stars = r => '★'.repeat(r) + '☆'.repeat(5 - r);
const card = p => `<article class="card">
  <span class="off">-${Math.round(100 - p.price / p.old * 100)}%</span>
  <button class="heart ${wish.includes(p.id) ? 'on' : ''}" data-wish="${p.id}" aria-label="Wishlist">♥</button>
  <div class="pic">${pic(p)}</div>
  <div class="info"><h3>${p.name}</h3>
    <div class="price">${fmt(p.price)}<s>${fmt(p.old)}</s></div>
    <div class="stars">${stars(p.r)}<small>(${p.rv})</small></div>
    <button class="add" data-add="${p.id}">🛒 Add to Cart</button></div></article>`;
const list = arr => arr.length ? arr.map(card).join('') : '<p class="empty">No products found.</p>';

/* ---------- Global events (work on every page) ---------- */
document.addEventListener('click', e => {
  // Clicking a product's image or title opens its details page
  const pc = e.target.closest('.card .pic, .card h3');
  if (pc && !e.target.closest('button')) {
    const b = pc.closest('.card').querySelector('[data-add]');
    if (b) return (location.href = 'product.html?id=' + b.dataset.add);
  }
  const t = e.target.closest('[data-add],[data-wish],[data-qty],[data-rm],[data-act],[data-cat],[data-brand]');
  if (t && t.tagName === 'A') e.preventDefault();
  if (e.target.id === 'shade') return toggleDrawer(false);
  if (!t) return;
  const d = t.dataset;
  if (d.add) { cart[d.add] = (cart[d.add] || 0) + 1; save(); toast('Added to cart ✔'); }
  else if (d.wish) {
    const id = +d.wish; wish = wish.includes(id) ? wish.filter(x => x !== id) : [...wish, id];
    save(); toast(wish.includes(id) ? 'Saved to wishlist' : 'Removed from wishlist');
  }
  else if (d.qty) { cart[d.id] += +d.qty; if (cart[d.id] < 1) delete cart[d.id]; save(); }
  else if (d.rm) { delete cart[d.rm]; save(); }
  else if (d.cat) location.href = 'category.html?c=' + d.cat;
  else if (d.brand) location.href = 'category.html?brand=' + d.brand;
  else if (d.act === 'cart') toggleDrawer(true);
  else if (d.act === 'close') toggleDrawer(false);
  else if (d.act === 'wishlist') location.href = 'account.html#wishlist';
  else if (d.act === 'all') location.href = 'category.html';
  else if (d.act === 'allcats') location.href = 'category.html';
  else if (d.act === 'account') location.href = 'account.html';
  else if (d.act === 'logout') Auth.logout().then(() => { toast('Signed out'); setTimeout(() => location.reload(), 700); });
  else if (d.act === 'checkout') toast(cartCount() ? 'Checkout page coming soon' : 'Your cart is empty');
});
document.addEventListener('keydown', e => e.key === 'Escape' && toggleDrawer(false));

/* ---------- Homepage only ---------- */
function initHome() {
  $('#sideCats').innerHTML = CATS.map(c => `<li><button data-cat="${c[0]}"><span>${c[2]}</span><span>${c[1]}</span><span>›</span></button></li>`).join('');
  const sideItems = $$('#sideCats li');
  const fold = () => sideItems.forEach((li, i) => li.hidden = i > 8 && !fold.open);
  $('#allCats').onclick = () => { fold.open = !fold.open; fold(); $('#allCats').textContent = fold.open ? 'Show less ↑' : 'View all categories →'; };
  fold();

  $('#flashRow').innerHTML = PRODUCTS.filter(p => p.sec === 'flash').map(card).join('');
  $('#topGrid').innerHTML = list(PRODUCTS.filter(p => p.sec === 'top'));
  $('#recGrid').innerHTML = list(PRODUCTS.filter(p => p.sec === 'rec'));
  $('#catGrid').innerHTML = CATS.map(c => `<button data-cat="${c[0]}"><i>${c[2]}</i>${c[1]}</button>`).join('');
  $('#brandRow').innerHTML = BRANDS.map(b => `<button data-brand="${b}"><i>🏪</i>${b}</button>`).join('');

  // Hero slider
  const SLIDES = [
    ['MEGA SALE', 'Up to 70% Off — This Week Only', 'Free delivery on orders above ₦25,000', 'Shop Now', '#top-selling', '🎁', 's1'],
    ['NEW ARRIVALS', 'The latest phones & gadgets', 'Genuine devices from official brand stores', 'Shop Phones', 'category.html?c=phones', '📱', 's2'],
    ['FREE DELIVERY', 'Free delivery on MarketHub Official items', 'Pay on Delivery in Lagos, Abuja & Port Harcourt', 'Start Shopping', 'category.html', '🚚', 's3']
  ];
  $('#hero').innerHTML = SLIDES.map((s, i) => `<div class="slide ${s[6]} ${i ? '' : 'on'}"><div><span class="pill">${s[0]}</span><h1>${s[1]}</h1><p>${s[2]}</p><a href="${s[4]}" class="btn">${s[3]} →</a></div><div class="gifts" aria-hidden="true">${s[5]}</div></div>`).join('') +
    `<button class="sl-nav prev" data-sl="-1" aria-label="Previous slide">‹</button><button class="sl-nav next" data-sl="1" aria-label="Next slide">›</button><div class="dots">${SLIDES.map((s, i) => `<button class="${i ? '' : 'on'}" data-dot="${i}" aria-label="Go to slide ${i + 1}"></button>`).join('')}</div>`;
  let cur = 0, timer;
  const go = n => { cur = (n + SLIDES.length) % SLIDES.length; $$('.slide').forEach((el, i) => el.classList.toggle('on', i === cur)); $$('.dots button').forEach((el, i) => el.classList.toggle('on', i === cur)); };
  const play = () => { clearInterval(timer); if (!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) timer = setInterval(() => go(cur + 1), 6000); };
  $('#hero').addEventListener('mouseenter', () => clearInterval(timer)); $('#hero').addEventListener('mouseleave', play);
  $('#hero').addEventListener('click', e => { const b = e.target.closest('[data-sl],[data-dot]'); if (b) { go(b.dataset.dot !== undefined ? +b.dataset.dot : cur + +b.dataset.sl); play(); } });
  play();

  // Flash-sale countdown (persists across reloads)
  let end = store.get('mh_flash_end', 0);
  if (end < Date.now()) { end = Date.now() + (5 * 3600 + 42 * 60 + 18) * 1000; store.set('mh_flash_end', end); }
  const pad = n => String(n).padStart(2, '0');
  const tick = () => {
    let s = Math.max(0, Math.floor((end - Date.now()) / 1000));
    $('#h').textContent = pad(Math.floor(s / 3600)); $('#m').textContent = pad(Math.floor(s % 3600 / 60)); $('#s').textContent = pad(s % 60);
    if (!s) { end = Date.now() + 6 * 3600 * 1000; store.set('mh_flash_end', end); }
  };
  tick(); setInterval(tick, 1000);
}

/* ---------- Backend detection: use the PHP API when it is there, otherwise the browser-storage demo ---------- */
const MH = window.MH = { mode: 'demo', user: null, csrf: '', ready: null };
async function apiFetch(path, { method = 'GET', body } = {}) {
  const res = await fetch('api/' + path, {
    method, credentials: 'same-origin',
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(method !== 'GET' ? { 'X-CSRF-Token': MH.csrf } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  let data = null; try { data = await res.json(); } catch {}
  if (!res.ok) return { error: (data && data.error) || 'Something went wrong. Please try again.', status: res.status };
  return data || {};
}
async function detectBackend() {
  try {
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 2500);
    const res = await fetch('api/health.php', { signal: ctl.signal, credentials: 'same-origin' });
    clearTimeout(timer);
    const health = await res.json();                    // on GitHub Pages this is an HTML 404 page, so json() throws -> demo mode
    if (!res.ok || !health.ok) return;
    const me = await apiFetch('auth/me.php');
    if (me.error) return;
    MH.mode = 'api'; MH.user = me.user; MH.csrf = me.csrf;
    const list = await apiFetch('products/list.php');   // the catalogue comes from MySQL; the bundled data stays as the fallback
    if (Array.isArray(list.items) && list.items.length) { PRODUCTS.splice(0, PRODUCTS.length, ...list.items); window.EXTRA_PRODUCTS = list.items; }
  } catch { /* no backend: stay in demo mode */ }
}
MH.ready = detectBackend();   // every page waits for this before it draws anything

/* ---------- Auth (DEMO: accounts live in this browser's localStorage; passwords are salted + PBKDF2-hashed) ---------- */
const Auth = {
  esc: s => String(s).replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';'),
  users: () => store.get('mh_users', []),
  session() {
    try { return JSON.parse(sessionStorage.getItem('mh_session') || localStorage.getItem('mh_session') || 'null'); } catch { return null; }
  },
  user() { if (MH.mode === 'api') return MH.user; const s = Auth.session(); return (s && Auth.users().find(u => u.email === s.email)) || null; },
  async hash(pw, salt) {
    const enc = new TextEncoder(), k = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
    const b = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: enc.encode(salt), iterations: 100000, hash: 'SHA-256' }, k, 256);
    return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
  },
  async register({ name, email, phone, password }) {
    if (MH.mode === 'api') {
      const r = await apiFetch('auth/register.php', { method: 'POST', body: { name, email, phone, password } });
      if (r.error) return { error: r.error };
      MH.user = r.user; MH.csrf = r.csrf; return { ok: true };
    }
    email = email.trim().toLowerCase();
    if (Auth.users().some(u => u.email === email)) return { error: 'An account with this email already exists.' };
    const salt = [...crypto.getRandomValues(new Uint8Array(16))].map(x => x.toString(16).padStart(2, '0')).join('');
    const u = { id: Date.now(), name: name.trim(), email, phone: phone.trim(), salt, hash: await Auth.hash(password, salt) };
    store.set('mh_users', [...Auth.users(), u]);
    Auth.start(u, true);
    return { ok: true };
  },
  async login(email, password, remember) {
    if (MH.mode === 'api') {
      const r = await apiFetch('auth/login.php', { method: 'POST', body: { email, password } });
      if (r.error) return { error: r.error };
      MH.user = r.user; MH.csrf = r.csrf; return { ok: true };
    }
    const u = Auth.users().find(x => x.email === email.trim().toLowerCase());
    if (!u || await Auth.hash(password, u.salt) !== u.hash) return { error: 'Incorrect email or password.' };
    Auth.start(u, remember);
    return { ok: true };
  },
  start(u, remember) {
    Auth.logout();
    try { (remember ? localStorage : sessionStorage).setItem('mh_session', JSON.stringify({ email: u.email })); } catch {}
  },
  async logout() {
    if (MH.mode === 'api') {
      await apiFetch('auth/logout.php', { method: 'POST' });
      MH.user = null; MH.csrf = (await apiFetch('auth/me.php')).csrf || '';   // the old session is gone, so fetch a fresh token
      return;
    }
    try { sessionStorage.removeItem('mh_session'); localStorage.removeItem('mh_session'); } catch {}
  },
  async update(fields) {
    if (MH.mode === 'api') {
      const r = await apiFetch('auth/update.php', { method: 'POST', body: fields });
      if (r.error) return { error: r.error };
      MH.user = r.user; return { ok: true };
    }
    const all = Auth.users(), u = all.find(x => x.email === Auth.session()?.email);
    if (u) { Object.assign(u, fields); store.set('mh_users', all); }
  },
  async changePassword(oldPw, newPw) {
    if (MH.mode === 'api') {
      const r = await apiFetch('auth/password.php', { method: 'POST', body: { old: oldPw, password: newPw } });
      return r.error ? { error: r.error } : { ok: true };
    }
    const u = Auth.user();
    if (!u || await Auth.hash(oldPw, u.salt) !== u.hash) return { error: 'Current password is incorrect.' };
    const salt = [...crypto.getRandomValues(new Uint8Array(16))].map(x => x.toString(16).padStart(2, '0')).join('');
    Auth.update({ salt, hash: await Auth.hash(newPw, salt) });
    return { ok: true };
  }
};

function enhance() {
  const m = document.querySelector('main'); if (m && !m.id) m.id = 'main';   // never overwrite an existing id
  const a = document.createElement('a'); a.className = 'skip'; a.href = '#' + (m?.id || 'main'); a.textContent = 'Skip to content'; document.body?.prepend?.(a);
  const b = document.createElement('button'); b.id = 'toTop'; b.className = 'totop'; b.hidden = true; b.textContent = '↑'; b.setAttribute?.('aria-label', 'Back to top'); document.body?.append?.(b);
  window.addEventListener?.('scroll', () => { b.hidden = window.scrollY < 600; }, { passive: true });
  b.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
}
MH.ready.then(() => {
  mountShell();
  enhance();
  updateBadges();
  if ($('#home')) initHome();
});