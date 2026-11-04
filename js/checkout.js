MH.ready.then(() => {   // wait for the backend check (see app.js), then run
/* Checkout page – runs after app.js.
   DEMO ONLY: no payment is processed and card details are never stored.
   For real payments use a hosted provider (e.g. Paystack Inline/Checkout) – never handle raw card data yourself. */
if (!Auth.user()) location.replace('account.html?next=checkout.html');   // checkout needs an account
const USER = Auth.user() || { id: 0, name: 'Guest', email: '' };
const PROMOS = { WELCOME10: { flat: 10000 }, SAVE5: { pct: 5 }, NEWUSER: { flat: 5000 } };   // keep in sync with cart.js
const FEE = 2500, EXPRESS_FEE = 5500, COD_MAX = 300000, COD_CITIES = ['lagos', 'abuja', 'port harcourt'];
const esc = s => String(s).replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';');
const sellerOf = p => p.seller || (p.cat === 'home' ? 'Home Essentials Store' : 'MarketHub Official');

const unsel = store.get('mh_unsel', []);
const items = Object.keys(cart).filter(id => byId(id) && !unsel.includes(id)).map(id => ({ p: byId(id), q: cart[id] }));
let promo = store.get('mh_promo', ''), promoMsg = '', editing = null;
const AKEY = 'mh_addr_' + USER.id;
let addrs = store.get(AKEY, []);
const sel = { addr: (addrs.find(a => a.def) || addrs[0] || {}).id, ship: 'standard', pay: 'card' };

/* ---- helpers ---- */
const step = n => $('#steps').innerHTML = ['Cart', 'Address', 'Payment', 'Confirmation'].map((t, i) =>
  `<div class="stp ${i + 1 < n ? 'done' : i + 1 === n ? 'cur' : ''}"><i>${i + 1 < n ? '✓' : i + 1}</i><span>${t}</span></div>`).join('');
const bizDay = n => { const d = new Date(); while (n) { d.setDate(d.getDate() + 1); if (d.getDay() % 6) n--; } return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); };
const range = (a, b) => `${bizDay(a)} – ${bizDay(b)}`;
const curAddr = () => addrs.find(a => a.id === sel.addr);
const codOk = (t = totals()) => t.total < COD_MAX && COD_CITIES.includes((curAddr()?.city || '').trim().toLowerCase());

function totals() {
  const by = {}; items.forEach(x => (by[sellerOf(x.p)] ||= []).push(x));
  const sub = items.reduce((a, { p, q }) => a + p.price * q, 0), units = items.reduce((a, x) => a + x.q, 0);
  const std = Object.keys(by).filter(s => !/Official/.test(s)).length * FEE;
  const fee = sel.ship === 'express' ? EXPRESS_FEE : sel.ship === 'pickup' ? 0 : std;
  const pr = PROMOS[promo], disc = pr && sub ? Math.min(sub, pr.flat ?? Math.round(sub * pr.pct / 100)) : 0;
  return { by, sub, units, std, fee, disc, total: Math.max(0, sub + fee - disc) };
}

/* ---- renderers ---- */
function renderAddrs() {
  $('#addrList').innerHTML = addrs.map(a => `<label class="opt addr"><input type="radio" name="addr" value="${a.id}" ${a.id === sel.addr ? 'checked' : ''}>
    <div class="oh"><b>${esc(a.name)} ${a.def ? '<span class="tag ok2">DEFAULT ADDRESS</span>' : ''}</b><button type="button" class="lnk" data-edit="${a.id}">Edit</button></div>
    <small class="mut">${esc(a.street)}<br>${esc(a.city)}${a.state ? ', ' + esc(a.state) : ''}${a.zip ? ', ' + esc(a.zip) : ''}<br>Phone: ${esc(a.phone)}</small></label>`).join('');
}
function renderSummary() {
  const t = totals();
  $('#sum').innerHTML = `<div class="sm-body"><div class="sh"><h3>Order Summary</h3><a href="cart.html" class="link">Edit Cart</a></div>
    <small class="mut">${t.units} item${t.units === 1 ? '' : 's'} in your order</small>
    ${Object.entries(t.by).map(([s, list]) => `<div class="sel">🏪 ${esc(s).toUpperCase()}</div>${list.map(({ p, q }) => `<div class="si"><div class="th">${pic(p)}</div>
      <div><span>${p.name}</span><small class="mut">Qty: ${q}${q > 1 ? ' @ ' + fmt(p.price) : ''}</small></div><b>${fmt(p.price * q)}</b></div>`).join('')}`).join('')}
    <hr><p><span>Subtotal (${t.units} items)</span><b>${fmt(t.sub)}</b></p>
    <p><span>Delivery Fee<small>${{ standard: 'Standard Delivery · 2–4 business days', express: 'Express Delivery · 1–2 business days', pickup: 'Pickup Station · 1 business day' }[sel.ship]}</small></span><b>${t.fee ? fmt(t.fee) : 'Free'}</b></p>
    ${t.disc ? `<p><span>Discount Applied<small>Code applied: ${promo}</small></span><b class="grn">- ${fmt(t.disc)}</b></p>` : ''}
    <hr><p class="tot"><span>Total<small>Inclusive of all taxes</small></span><b>${fmt(t.total)}</b></p>
    <details class="pdet" ${promoMsg ? 'open' : ''}><summary>Have a promo code?</summary>
      <div class="promo"><input id="promo" placeholder="Enter code" value="${promo}"><button type="button" class="btn-outline" data-apply>Apply</button></div>
      <small class="${promoMsg.startsWith('✔') ? 'grn' : 'redt'}">${promoMsg || 'Try: WELCOME10, SAVE5, NEWUSER'}</small></details></div>
    <ul class="assure"><li>🛡️ Secure checkout — SSL encrypted</li><li>🔄 7-day returns on most items</li><li>🎧 Need help? Call 0700-MARKETHUB</li>
      <li>🚚 Estimated delivery: ${{ standard: range(2, 4), express: range(1, 2), pickup: bizDay(1) }[sel.ship]}</li></ul>`;
  $('#pStd').textContent = t.std ? fmt(t.std) : 'Free';
  $('#place').textContent = `🔒 Place Order — ${fmt(t.total)}`;
  $('#multi').hidden = Object.keys(t.by).length < 2;
  const ok = codOk(t);
  $('#codTag').textContent = ok ? 'AVAILABLE' : 'UNAVAILABLE'; $('#codTag').className = 'tag ' + (ok ? 'ok2' : '');
  $('#codOpt').classList.toggle('dis', !ok); $('input[value=cod]').disabled = !ok;
  if (!ok && sel.pay === 'cod') { sel.pay = 'card'; $('input[value=card]').checked = true; $('#cardForm').hidden = false; }
}

/* ---- validation ---- */
const luhn = n => { let s = 0, d = false; for (let i = n.length - 1; i >= 0; i--) { let x = +n[i]; if (d && (x *= 2) > 9) x -= 9; s += x; d = !d; } return s % 10 === 0; };
function fail(msg, sel_) { toast(msg); const el = $(sel_); el?.scrollIntoView({ behavior: 'smooth', block: 'center' }); el?.focus?.(); return false; }
function placeOrder() {
  if (!items.length) return toast('Your cart is empty');
  const a = curAddr(); if (!a) return fail('Please choose a delivery address', '#secAddr');
  if (sel.pay === 'card') {
    const n = $('#cn').value.replace(/\s/g, ''), [mm, yy] = $('#ce').value.split('/').map(Number), now = new Date();
    if (!/^\d{13,19}$/.test(n) || !luhn(n)) return fail('Enter a valid card number', '#cn');
    if (!(mm >= 1 && mm <= 12) || !yy || new Date(2000 + yy, mm) <= now) return fail('Enter a valid expiry date (MM/YY)', '#ce');
    if (!/^\d{3,4}$/.test($('#cv').value)) return fail('Enter a valid CVV', '#cv');
    if (!$('#cname').value.trim()) return fail('Enter the name on your card', '#cname');
  }
  if (sel.pay === 'cod' && !codOk()) return fail('Pay on Delivery is not available for this order', '#codOpt');
  if (!$('#terms').checked) return fail('Please accept the Terms & Privacy Policy', '#terms');
  const t = totals();
  const order = { user: USER.email, id: 'MH' + Date.now().toString().slice(-8), date: new Date().toISOString(), address: a, ship: sel.ship, pay: sel.pay, note: $('#note').value.trim(),
    items: items.map(({ p, q }) => ({ id: p.id, name: p.name, price: p.price, q })), sub: t.sub, fee: t.fee, disc: t.disc, total: t.total };
  store.set('mh_orders', [order, ...store.get('mh_orders', [])]);       // no card data is stored
  items.forEach(({ p }) => delete cart[p.id]);
  store.set('mh_promo', ''); store.set('mh_unsel', unsel.filter(id => cart[id])); save();
  confirmPage(order);
}
function confirmPage(o) {
  step(5); scrollTo(0, 0);
  const payTxt = { card: 'Paid by card', transfer: 'Bank transfer — transfer details have been sent to your email', cod: 'Pay on Delivery — have cash or POS ready' }[o.pay];
  const eta = { standard: range(2, 4), express: range(1, 2), pickup: bizDay(1) }[o.ship];
  $('#ckPage').innerHTML = `<div class="steps box" id="steps"></div><div class="box emptycart"><div class="big">✅</div><h2>Thank you, your order is placed!</h2>
    <p>Order <b>#${o.id}</b> · confirmation sent to ${esc(USER.email)}</p>
    <div class="conf"><div><b>Delivering to</b><br>${esc(o.address.name)}<br>${esc(o.address.street)}, ${esc(o.address.city)}</div>
      <div><b>Estimated delivery</b><br>${eta}<br><small class="mut">${{ standard: 'Standard', express: 'Express', pickup: 'Pickup station' }[o.ship]}</small></div>
      <div><b>Payment</b><br>${payTxt}<br><b class="price">${fmt(o.total)}</b></div></div>
    <a href="index.html" class="btn">Continue Shopping</a></div>`;
  step(5);
}

/* ---- events ---- */
$('#who').innerHTML = `Signed in as <b>${esc(USER.name)}</b> · ${esc(USER.email)}`;
$('#dStd').textContent = '2–4 business days'; $('#dExp').textContent = '1–2 business days';
$('#note').addEventListener('input', e => $('#cnt').textContent = e.target.value.length);
$('#cn').addEventListener('input', e => e.target.value = e.target.value.replace(/\D/g, '').slice(0, 19).replace(/(.{4})/g, '$1 ').trim());
$('#ce').addEventListener('input', e => { let v = e.target.value.replace(/\D/g, '').slice(0, 4); e.target.value = v.length > 2 ? v.slice(0, 2) + '/' + v.slice(2) : v; });
$('#cv').addEventListener('input', e => e.target.value = e.target.value.replace(/\D/g, ''));

document.addEventListener('change', e => {
  const t = e.target;
  if (t.name === 'addr') sel.addr = +t.value;
  else if (t.name === 'ship') sel.ship = t.value;
  else if (t.name === 'pay') { sel.pay = t.value; $('#cardForm').hidden = t.value !== 'card'; }
  else return;
  renderSummary();
});
document.addEventListener('focusin', e => { const s = e.target.closest('.panel'); if (s) step(s.id === 'secPay' || s.id === 'termsBox' ? 3 : 2); });
document.addEventListener('click', e => {
  const c = e.target.closest('[data-edit],[data-apply],[data-soon],#addAddr,#cancelAddr,#place');
  if (!c) return;
  if (c.tagName === 'A') e.preventDefault();
  const f = $('#addrForm');
  if (c.dataset.edit) { e.preventDefault(); editing = +c.dataset.edit; const a = addrs.find(x => x.id === editing); ['name', 'phone', 'street', 'city', 'state', 'zip'].forEach(k => f.elements[k].value = a[k] || ''); f.hidden = false; }
  else if (c.id === 'addAddr') { editing = null; f.reset(); f.hidden = false; }
  else if (c.id === 'cancelAddr') f.hidden = true;
  else if (c.dataset.soon) toast(c.dataset.soon);
  else if ('apply' in c.dataset) {
    const code = $('#promo').value.trim().toUpperCase();
    if (!code) { promo = ''; promoMsg = ''; } else if (PROMOS[code]) { promo = code; promoMsg = '✔ Promo code applied!'; } else { promo = ''; promoMsg = 'Invalid promo code.'; }
    store.set('mh_promo', promo); renderSummary();
  }
  else if (c.id === 'place') placeOrder();
});
$('#addrForm').addEventListener('submit', e => {
  e.preventDefault();
  const f = e.target, v = Object.fromEntries(['name', 'phone', 'street', 'city', 'state', 'zip'].map(k => [k, f.elements[k].value.trim()]));
  if (!v.name || !v.street || !v.city) return toast('Name, street and city are required');
  if (!/^[0-9+\s]{10,16}$/.test(v.phone)) return toast('Enter a valid phone number');
  if (editing) Object.assign(addrs.find(a => a.id === editing), v);
  else { const a = { id: Date.now(), ...v, def: !addrs.length }; addrs.push(a); sel.addr = a.id; }
  store.set(AKEY, addrs); f.hidden = true; renderAddrs(); renderSummary();
});

if (!items.length) {
  $('#ckPage').innerHTML = '<div class="box emptycart"><div class="big">🛒</div><h2>Nothing to check out</h2><p>Add items to your cart (and tick them) first.</p><a href="cart.html" class="btn">Go to Cart</a></div>';
} else {
  step(2); renderAddrs(); renderSummary();
  if (!addrs.length) { $('#addrForm').hidden = false; $('#addrForm').elements.namedItem('name').value = USER.name; }   // first order: add an address
}
});