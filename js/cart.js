/* Cart page – runs after app.js (shares cart, wish, save(), toast(), byId(), fmt(), stars()) */
const DELIVERY_FEE = 2500;   // per non-official seller
const PROMOS = { WELCOME10: { flat: 10000 }, SAVE5: { pct: 5 }, NEWUSER: { flat: 5000 } };
let saved = store.get('mh_saved', []);       // saved-for-later ids
let unsel = store.get('mh_unsel', []);       // unticked cart ids (strings)
let promo = store.get('mh_promo', ''), promoMsg = '', GROUPS = [];

const sellerOf = p => p.seller || (p.cat === 'home' ? 'Home Essentials Store' : 'MarketHub Official');
const variantOf = p => (store.get('mh_var', {})[p.id]) || p.variant;   // set by the product page
const isOfficial = s => /Official/.test(s);
const pct = p => Math.round(100 - p.price / p.old * 100);
const keep = () => { store.set('mh_saved', saved); store.set('mh_unsel', unsel); store.set('mh_promo', promo); };

const row = p => {
  const q = cart[p.id], on = !unsel.includes(String(p.id));
  return `<div class="ci2">
    <input type="checkbox" data-sel="${p.id}" ${on ? 'checked' : ''} aria-label="Select item">
    <div class="th">${pic(p)}</div>
    <div class="mid"><h3><a href="product.html?id=${p.id}">${p.name}</a></h3>${variantOf(p) ? `<small>${variantOf(p)}</small>` : ''}<div class="ok">✔ In Stock</div>
      <div class="acts"><button data-later="${p.id}">Save for Later</button><button data-del="${p.id}">Remove</button></div></div>
    <div class="rt"><div class="price">${fmt(p.price)}</div><s>${fmt(p.old)}</s>
      <small class="sv">You save ${fmt((p.old - p.price) * q)} (${pct(p)}%)</small>
      ${q > 1 ? `<small>${fmt(p.price)} × ${q} = ${fmt(p.price * q)}</small>` : ''}
      <div class="rt-row"><div class="stepper">
        <button data-q="-1" data-id="${p.id}" ${q < 2 ? 'disabled' : ''}>−</button>
        <input type="number" min="1" max="99" value="${q}" data-qin="${p.id}" aria-label="Quantity">
        <button data-q="1" data-id="${p.id}">+</button></div>
        <button class="tr" data-del="${p.id}" aria-label="Remove">🗑</button></div></div></div>`;
};

function renderSaved() {
  const items = saved.map(byId).filter(Boolean);
  const html = items.length ? `<div class="cgh"><b>Saved for Later</b><span class="dl">${items.length} item${items.length > 1 ? 's' : ''}</span></div>
    <div class="svgrid">${items.map(p => `<div class="sv-card"><div class="th">${pic(p)}</div><div><h3>${p.name}</h3><div class="price">${fmt(p.price)}</div>
      <button class="btn-outline mini" data-move="${p.id}">Move to Cart</button><button class="lnk" data-sdel="${p.id}">Remove</button></div></div>`).join('')}</div>` : '';
  ['#savedBox', '#savedEmpty'].forEach(s => { $(s).innerHTML = html; $(s).hidden = !items.length; });
}

function render() {
  const ids = Object.keys(cart).filter(id => byId(id));
  $('#sub').textContent = ids.length ? `You have ${ids.length} item${ids.length > 1 ? 's' : ''} in your cart` : 'Your cart is empty';
  $('#layout').hidden = !ids.length; $('#empty').hidden = !!ids.length;
  const by = {}; ids.forEach(id => { const p = byId(id); (by[sellerOf(p)] ||= []).push(p); });
  GROUPS = Object.entries(by);
  let sub = 0, fee = 0, units = 0;
  $('#groups').innerHTML = GROUPS.map(([s, items], gi) => {
    const sel = items.filter(p => !unsel.includes(String(p.id)));
    const gSub = sel.reduce((a, p) => a + p.price * cart[p.id], 0), gUnits = items.reduce((a, p) => a + cart[p.id], 0);
    sub += gSub; units += sel.reduce((a, p) => a + cart[p.id], 0);
    if (sel.length && !isOfficial(s)) fee += DELIVERY_FEE;
    return `<section class="cg"><div class="cgh"><label><input type="checkbox" data-g="${gi}" ${sel.length === items.length ? 'checked' : ''}> <b>${s}</b></label>
      <span class="ver">${isOfficial(s) ? '✔ Verified' : 'Verified Seller'}</span><span class="dl">Delivery: ${isOfficial(s) ? 'Free' : fmt(DELIVERY_FEE)}</span></div>
      ${items.map(row).join('')}
      <div class="cgf"><span>${items.length} item${items.length > 1 ? 's' : ''}${gUnits > items.length ? `, ${gUnits} units` : ''}</span><b>Subtotal: ${fmt(gSub)}</b></div></section>`;
  }).join('');

  const pr = PROMOS[promo];
  const disc = pr && sub ? Math.min(sub, pr.flat ?? Math.round(sub * pr.pct / 100)) : 0;
  const total = Math.max(0, sub + fee - disc);
  $('#summary').innerHTML = `<div class="sm-body"><h3>Order Summary</h3>
    <p><span>Subtotal (${units} item${units === 1 ? '' : 's'})</span><b>${fmt(sub)}</b></p>
    <p><span>Delivery Fee<small>Free delivery on MarketHub Official items</small></span><b>${fee ? fmt(fee) : 'Free'}</b></p>
    ${disc ? `<p><span>Discount Applied<small>Promo code: ${promo}</small></span><b class="grn">- ${fmt(disc)}</b></p>` : ''}
    <p class="tot"><span>Total<small>Inclusive of all taxes</small></span><b>${fmt(total)}</b></p>
    <hr><label class="pl">Have a promo code?</label>
    <div class="promo"><input id="promo" placeholder="Enter code" value="${promo}" autocomplete="off"><button class="btn-outline" data-apply>Apply</button></div>
    <small class="${promoMsg.startsWith('✔') ? 'grn' : 'redt'}">${promoMsg || 'Try: WELCOME10, SAVE5, NEWUSER'}</small>
    <button class="btn" data-checkout>Proceed to Checkout →</button>
    <a href="index.html" class="lnk c">Continue Shopping</a><button class="lnk c" data-clear>Clear Cart</button></div>
    <ul class="assure"><li>🛡️ Secure checkout</li><li>🔄 7-day easy returns</li><li>🎧 24/7 customer support</li></ul>`;
  renderSaved();
  const p4 = p => `<article class="card pc"><span class="off">-${pct(p)}%</span>${p.official ? '<span class="os">OFFICIAL STORE</span>' : ''}
    <button class="heart ${wish.includes(p.id) ? 'on' : ''}" data-wish="${p.id}" aria-label="Wishlist">♥</button><div class="pic">${pic(p)}</div>
    <div class="info"><h3>${p.name}</h3><div class="price">${fmt(p.price)}<s>${fmt(p.old)}</s></div>
    <div class="stars">${stars(p.r)}<small>(${p.rv})</small><span class="free">🚚 Free Delivery</span></div><small class="sold">Sold by ${p.seller}</small>
    <button class="add" data-add="${p.id}">🛒 Add to Cart</button></div></article>`;
  $('#fbtGrid').innerHTML = window.EXTRA_PRODUCTS.filter(p => p.fbt).map(p4).join('');
}

/* ---- events ---- */
document.addEventListener('click', e => {
  const c = e.target.closest('[data-q],[data-del],[data-later],[data-move],[data-sdel],[data-apply],[data-clear],[data-checkout],[data-add]');
  if (!c) return;
  const d = c.dataset;
  if (d.add) return render();                       // app.js already added it; just redraw
  if (d.q) { cart[d.id] = Math.max(1, cart[d.id] + +d.q); }
  else if (d.del) { delete cart[d.del]; toast('Item removed'); }
  else if (d.later) { delete cart[d.later]; if (!saved.includes(+d.later)) saved.push(+d.later); toast('Saved for later'); }
  else if (d.move) { saved = saved.filter(x => x != d.move); cart[d.move] = (cart[d.move] || 0) + 1; toast('Moved to cart'); }
  else if (d.sdel) saved = saved.filter(x => x != d.sdel);
  else if ('apply' in d) {
    const code = $('#promo').value.trim().toUpperCase();
    if (!code) { promo = ''; promoMsg = ''; }
    else if (PROMOS[code]) { promo = code; promoMsg = '✔ Promo code applied!'; }
    else { promo = ''; promoMsg = 'Invalid promo code.'; }
  }
  else if ('clear' in d) { if (!confirm('Remove all items from your cart?')) return; cart = {}; }
  else if ('checkout' in d) {
    const n = Object.keys(cart).filter(id => !unsel.includes(id)).length;
    if (!n) return toast('Select at least one item');
    return (location.href = 'checkout.html');
  }
  keep(); save(); render();
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.qin) { cart[t.dataset.qin] = Math.min(99, Math.max(1, parseInt(t.value) || 1)); }
  else if (t.dataset.sel) { unsel = t.checked ? unsel.filter(x => x !== t.dataset.sel) : [...unsel, t.dataset.sel]; }
  else if (t.dataset.g) {
    const ids = GROUPS[t.dataset.g][1].map(p => String(p.id));
    unsel = t.checked ? unsel.filter(x => !ids.includes(x)) : [...new Set([...unsel, ...ids])];
  } else return;
  keep(); save(); render();
});
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'promo') $('[data-apply]').click(); });

render();