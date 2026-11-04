/* My Account page – runs after app.js. Routes via hash: #overview #orders #orders/<id> #addresses #wishlist #profile */
MH.ready.then(() => {   // wait for the backend check (see app.js), then run
const user = Auth.user();   // signed out: the sign-in / register forms (login.js) are shown instead
$('#authView').hidden = !!user; $('#accView').hidden = !user;
if (user) initAccount();

function initAccount() {
  const esc = Auth.esc, AKEY = 'mh_addr_' + user.id;
  const myOrders = () => store.get('mh_orders', []).filter(o => o.user === user.email);
  const getAddrs = () => store.get(AKEY, []);
  const date = d => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const TABS = [['overview', '🏠', 'Overview'], ['orders', '📦', 'My Orders'], ['addresses', '📍', 'Addresses'], ['wishlist', '♥', 'Wishlist'], ['profile', '👤', 'Profile & Security']];
  // DEMO tracking: minutes after ordering that each stage is reached. Replace with real status from your backend.
  const STAGES = [['Order placed', 0], ['Processing', 1], ['Shipped', 3], ['Delivered', 6]];
  const stageOf = o => { const m = (Date.now() - new Date(o.date)) / 60000; return STAGES.reduce((a, [, t], i) => m >= t ? i : a, 0); };
  const badge = o => { const i = stageOf(o); return `<span class="st st${i}">${STAGES[i][0]}</span>`; };
  const SHIP = { standard: 'Standard Delivery', express: 'Express Delivery', pickup: 'Pickup Station' };
  const PAY = { card: 'Card payment', transfer: 'Bank transfer', cod: 'Pay on Delivery' };
  let editing = null;

  /* ---------- views ---------- */
  const views = {
    overview() {
      const os = myOrders(), last = os[0];
      return `<h1>Hi, ${esc(user.name.split(' ')[0])} 👋</h1><p class="mut">${esc(user.email)}</p>
        <div class="stats"><a href="#orders"><b>${os.length}</b><span>Orders</span></a><a href="#wishlist"><b>${wish.length}</b><span>Wishlist items</span></a><a href="#addresses"><b>${getAddrs().length}</b><span>Saved addresses</span></a></div>
        <h2>Most recent order</h2>${last ? orderCard(last) : '<div class="box empty2">No orders yet. <a href="index.html" class="link">Start shopping →</a></div>'}`;
    },
    orders() {
      const os = myOrders();
      return `<h1>My Orders</h1>${os.length ? os.map(orderCard).join('') : '<div class="box empty2"><div class="big">📦</div>You haven\'t placed any orders yet.<br><a href="index.html" class="btn" style="margin-top:14px">Start Shopping</a></div>'}`;
    },
    order(id) {
      const o = myOrders().find(x => x.id === id);
      if (!o) return '<h1>Order not found</h1><a href="#orders" class="link">← Back to orders</a>';
      const cur = stageOf(o), a = o.address;
      return `<a href="#orders" class="link">← All orders</a><div class="oh2"><h1>Order #${o.id}</h1>${badge(o)}</div><p class="mut">Placed on ${date(o.date)}</p>
        <div class="tl">${STAGES.map(([t, m], i) => `<div class="${i < cur ? 'done' : i === cur ? 'cur' : ''}"><i>${i < cur ? '✓' : i + 1}</i><b>${t}</b><small>${i <= cur ? date(+new Date(o.date) + m * 60000) : 'Pending'}</small></div>`).join('')}</div>
        <div class="grid2"><div class="box"><h3>Items</h3>${o.items.map(i => `<div class="li"><span class="th">${byId(i.id)?.e || '📦'}</span><div><a href="product.html?id=${i.id}">${esc(i.name)}</a><small class="mut">Qty ${i.q} × ${fmt(i.price)}</small></div><b>${fmt(i.price * i.q)}</b></div>`).join('')}
          <hr><p class="row2"><span>Subtotal</span><b>${fmt(o.sub)}</b></p><p class="row2"><span>Delivery</span><b>${o.fee ? fmt(o.fee) : 'Free'}</b></p>${o.disc ? `<p class="row2"><span>Discount</span><b class="grn">- ${fmt(o.disc)}</b></p>` : ''}<p class="row2 tot"><span>Total</span><b>${fmt(o.total)}</b></p></div>
          <div class="box"><h3>Delivery address</h3><p>${esc(a.name)}<br>${esc(a.street)}<br>${esc(a.city)}${a.state ? ', ' + esc(a.state) : ''}<br>${esc(a.phone)}</p>
            <h3>Delivery</h3><p>${SHIP[o.ship]}</p><h3>Payment</h3><p>${PAY[o.pay]}</p>${o.note ? `<h3>Instructions</h3><p>${esc(o.note)}</p>` : ''}
            <button class="btn big-btn" data-reorder="${o.id}">Reorder</button></div></div>`;
    },
    addresses() {
      const as = getAddrs();
      return `<div class="oh2"><h1>Addresses</h1><button class="btn mini2" data-newaddr>+ Add address</button></div>
        <form id="afrm" class="afrm box" hidden novalidate><input name="name" placeholder="Full name"><input name="phone" placeholder="Phone"><input name="street" class="wide" placeholder="Street address">
          <input name="city" placeholder="City"><input name="state" placeholder="State"><input name="zip" placeholder="Postcode">
          <div class="wide"><button class="btn mini2">Save address</button> <button type="button" class="lnk" data-cancel>Cancel</button></div></form>
        ${as.length ? as.map(a => `<div class="box addr2"><div><b>${esc(a.name)}</b> ${a.def ? '<span class="tag ok2">DEFAULT</span>' : ''}<p class="mut">${esc(a.street)}, ${esc(a.city)}${a.state ? ', ' + esc(a.state) : ''}${a.zip ? ', ' + esc(a.zip) : ''}<br>${esc(a.phone)}</p></div>
          <div class="acts2"><button data-eaddr="${a.id}">Edit</button>${a.def ? '' : `<button data-defaddr="${a.id}">Set as default</button>`}<button data-deladdr="${a.id}">Delete</button></div></div>`).join('') : '<div class="box empty2">No saved addresses yet.</div>'}`;
    },
    wishlist() {
      const ps = wish.map(byId).filter(Boolean);
      return `<h1>Wishlist</h1>${ps.length ? `<div class="wgrid">${ps.map(p => `<article class="card"><div class="pic">${pic(p)}</div><div class="info"><h3><a href="product.html?id=${p.id}">${esc(p.name)}</a></h3>
        <div class="price">${fmt(p.price)}<s>${fmt(p.old)}</s></div><button class="add" data-wmove="${p.id}">🛒 Move to Cart</button><button class="lnk c" data-wrm="${p.id}">Remove</button></div></article>`).join('')}</div>` : '<div class="box empty2"><div class="big">♡</div>Your wishlist is empty. Tap the heart on any product to save it.</div>'}`;
    },
    profile() {
      return `<h1>Profile &amp; Security</h1>
        <form id="fProf" class="box fgrid" novalidate><h3>Personal details</h3>
          <label>Full name<input name="name" value="${esc(user.name)}"></label><label>Phone<input name="phone" value="${esc(user.phone || '')}"></label>
          <label>Email<input value="${esc(user.email)}" disabled></label><p class="msg" id="mProf"></p><button class="btn mini2">Save changes</button></form>
        <form id="fPass" class="box fgrid" novalidate><h3>Change password</h3>
          <label>Current password<input name="old" type="password" autocomplete="current-password"></label>
          <label>New password<input name="pw" type="password" autocomplete="new-password" placeholder="8+ characters, letters and numbers"></label>
          <label>Confirm new password<input name="pw2" type="password" autocomplete="new-password"></label><p class="msg" id="mPass"></p><button class="btn mini2">Update password</button></form>
        <button class="btn-outline" data-signout style="max-width:200px">Sign Out</button>`;
    }
  };
  function orderCard(o) {
    return `<div class="box ocard"><div class="oh2"><div><b>#${o.id}</b><small class="mut"> · ${date(o.date)}</small></div>${badge(o)}</div>
      <div class="oi"><div class="thumbs2">${o.items.slice(0, 4).map(i => `<span class="th">${byId(i.id)?.e || '📦'}</span>`).join('')}</div>
      <div><small class="mut">${o.items.reduce((a, i) => a + i.q, 0)} item(s)</small><br><b class="price">${fmt(o.total)}</b></div>
      <div class="acts3"><a class="btn-outline mini" href="#orders/${o.id}">View details</a><button class="btn mini2" data-reorder="${o.id}">Reorder</button></div></div></div>`;
  }

  /* ---------- router ---------- */
  function route() {
    const [tab, arg] = (location.hash.slice(1) || 'overview').split('/');
    const active = views[tab] ? tab : 'overview';
    $('#accNav').innerHTML = `<div class="who"><span class="av">${esc(user.name[0].toUpperCase())}</span><div><b>${esc(user.name)}</b><small class="mut">${esc(user.email)}</small></div></div>` +
      TABS.map(([k, i, t]) => `<a href="#${k}" class="${k === active ? 'on' : ''}"><span>${i}</span>${t}</a>`).join('') + '<button data-signout>⏻ Sign Out</button>';
    $('#acc').innerHTML = active === 'orders' && arg ? views.order(arg) : views[active]();
    document.title = 'My Account – MarketHub';
  }
  window.addEventListener('hashchange', route);

  /* ---------- actions ---------- */
  document.addEventListener('click', e => {
    const c = e.target.closest('[data-reorder],[data-newaddr],[data-cancel],[data-eaddr],[data-defaddr],[data-deladdr],[data-wmove],[data-wrm],[data-signout]');
    if (!c) return;
    const d = c.dataset, f = $('#afrm');
    if (d.reorder) {
      const o = myOrders().find(x => x.id === d.reorder), ids = [];
      o.items.forEach(i => { if (byId(i.id)) { cart[i.id] = (cart[i.id] || 0) + i.q; ids.push(String(i.id)); } });
      store.set('mh_unsel', store.get('mh_unsel', []).filter(x => !ids.includes(x))); save(); location.href = 'cart.html';
    }
    else if (d.signout !== undefined) Auth.logout().then(() => { location.href = 'index.html'; });
    else if (d.newaddr !== undefined) { editing = null; f.reset(); f.hidden = false; f.elements.namedItem('name').value = user.name; }
    else if (d.cancel !== undefined) f.hidden = true;
    else if (d.eaddr) { editing = +d.eaddr; const a = getAddrs().find(x => x.id === editing); ['name', 'phone', 'street', 'city', 'state', 'zip'].forEach(k => f.elements.namedItem(k).value = a[k] || ''); f.hidden = false; f.scrollIntoView({ behavior: 'smooth' }); }
    else if (d.defaddr) { store.set(AKEY, getAddrs().map(a => ({ ...a, def: a.id === +d.defaddr }))); route(); toast('Default address updated'); }
    else if (d.deladdr) {
      if (!confirm('Delete this address?')) return;
      let as = getAddrs().filter(a => a.id !== +d.deladdr); if (as.length && !as.some(a => a.def)) as[0].def = true;
      store.set(AKEY, as); route();
    }
    else if (d.wmove) { wish = wish.filter(x => x !== +d.wmove); cart[d.wmove] = (cart[d.wmove] || 0) + 1; save(); route(); toast('Moved to cart ✔'); }
    else if (d.wrm) { wish = wish.filter(x => x !== +d.wrm); save(); route(); }
  });

  document.addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target, v = k => f.elements.namedItem(k).value.trim();
    if (f.id === 'afrm') {
      const a = Object.fromEntries(['name', 'phone', 'street', 'city', 'state', 'zip'].map(k => [k, v(k)]));
      if (!a.name || !a.street || !a.city) return toast('Name, street and city are required');
      if (!/^[0-9+\s]{10,16}$/.test(a.phone)) return toast('Enter a valid phone number');
      const as = getAddrs();
      if (editing) Object.assign(as.find(x => x.id === editing), a); else as.push({ id: Date.now(), ...a, def: !as.length });
      store.set(AKEY, as); route(); toast('Address saved');
    } else if (f.id === 'fProf') {
      const m = $('#mProf'), name = v('name'), phone = v('phone'); m.className = 'msg redt';
      if (name.length < 2) return m.textContent = 'Enter your full name.';
      if (!/^[0-9+\s]{10,16}$/.test(phone)) return m.textContent = 'Enter a valid phone number.';
      const r = await Auth.update({ name, phone });
      if (r && r.error) return m.textContent = r.error;
      user.name = name; user.phone = phone; toast('Profile updated'); setTimeout(() => location.reload(), 600);
    } else if (f.id === 'fPass') {
      const m = $('#mPass'), pw = v('pw'); m.className = 'msg redt';
      if (pw.length < 8 || !/[a-z]/i.test(pw) || !/\d/.test(pw)) return m.textContent = 'New password needs 8+ characters with letters and numbers.';
      if (pw !== v('pw2')) return m.textContent = 'Passwords do not match.';
      try {
        const r = await Auth.changePassword(f.elements.namedItem('old').value, pw);
        if (r.error) m.textContent = r.error; else { f.reset(); m.className = 'msg grn'; m.textContent = '✔ Password updated.'; }
      } catch { m.textContent = 'Needs a secure context (localhost or https).'; }
    }
  });

  route();
  setInterval(() => { if (/^#orders|^#overview|^$/.test(location.hash) && !document.querySelector?.('form:not([hidden])')) route(); }, 30000);   // refresh demo tracking
}
});