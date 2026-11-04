/* Product details page – product.html?id=205  (runs after app.js) */
MH.ready.then(() => {   // wait for the backend check (see app.js), then run
const id = +(new URLSearchParams(location.search).get('id') || 205);
const p = byId(id);
const num = s => /k$/i.test(s) ? parseFloat(s) * 1000 : parseInt(String(s).replace(/,/g, '')) || 0;
const pct = x => Math.round(100 - x.price / x.old * 100);
const sellerOf = x => x.seller || (x.cat === 'home' ? 'Home Essentials Store' : 'MarketHub Official');

if (!p) {
  $('#pdMain').innerHTML = '<div class="box emptycart"><div class="big">🔍</div><h2>Product not found</h2><p>It may have been removed.</p><a class="btn" href="index.html">Back to Home</a></div>';
} else init();

function init() {
  const brand = p.brand || p.name.split(' ')[0];
  const catName = CATS.find(c => c[0] === p.cat)?.[1] || 'Products';
  const D = Object.assign({
    model: 'MH-' + p.id, sku: 'MH-' + String(p.id).padStart(5, '0'), sold: '1,000+', ratings: num(p.rv), stock: 5 + (p.id * 7) % 30, sellerRating: 92,
    crumbs: [[catName, 'category.html?c=' + p.cat]],
    colors: [['Black', '#222'], ['White', '#eee'], ['Blue', '#3b6cb0'], ['Green', '#3b8a5a']], styles: ['Standard', 'Premium'],
    desc: [`The ${p.name} combines dependable quality with great value. Designed for everyday use, it is built to last and backed by MarketHub's 7-day return policy.`],
    features: ['Genuine product from a verified seller', 'Pay on Delivery available', '7-day easy returns', 'Fast delivery nationwide'],
    specs: [['Brand', brand], ['Model', 'MH-' + p.id], ['Category', catName], ['Warranty', '12 months'], ['In the box', 'Product, manual, warranty card']]
  }, p.detail || {});
  const sel = { color: D.colors[0][0], style: D.styles[0], qty: 1 };
  const imgs = D.images || [USE_PHOTOS ? `images/products/${p.id}.jpg` : p.e, '📦', '🔍', '✋', '🎁', '😀'];
  const asImg = v => /\.(jpe?g|png|webp|svg)$|^https?:/.test(v) ? `<img src="${v}" alt="">` : v;
  const off = /Official/.test(sellerOf(p));
  document.title = p.name + ' – MarketHub';

  $('#crumbs').innerHTML = `<a href="index.html">Home</a>` + D.crumbs.map(([n, h]) => ` › ${h ? `<a href="${h}">${n}</a>` : n}`).join('') + ` › <b>${p.name.split(' ').slice(0, 3).join(' ')}</b>`;

  $('#pdMain').innerHTML = `
  <section class="box pd">
    <div class="gal"><div class="gmain" id="gmain">${asImg(imgs[0])}</div>
      <div class="thumbs">${imgs.map((v, i) => `<button class="${i ? '' : 'on'}" data-th="${i}">${asImg(v)}</button>`).join('')}</div>
      <div class="gacts"><button data-wish="${p.id}"><span id="wl"></span></button><button id="share">↗ Share</button></div></div>
    <div class="pinfo">
      <div class="brand">Brand: <a href="#">${brand}</a></div>
      <h1>${p.name}</h1>
      <small class="mut">Model: ${D.model} | SKU: ${D.sku}</small>
      <div class="rrow"><span class="stars">${stars(p.r)}</span><a href="#reviews" data-tab="rev" class="ul">(${D.ratings.toLocaleString()} ratings)</a><span>|</span><span>${D.sold} sold</span><span class="ver">Verified Product</span></div>
      <div class="pbox"><div class="pp"><span class="price big">${fmt(p.price)}</span><s>${fmt(p.old)}</s><span class="off in">-${pct(p)}%</span></div>
        <small class="mut">Inclusive of all taxes</small><div class="ok">✔ Pay on Delivery available</div></div>
      <div class="opt"><b>Color:</b> <span id="cname">${sel.color}</span>
        <div class="sw">${D.colors.map(([n, h], i) => `<button class="${i ? '' : 'on'}" style="--c:${h}" data-color="${n}" aria-label="${n}"></button>`).join('')}</div></div>
      <div class="opt"><b>Style:</b> <span id="sname">${sel.style}</span>
        <div class="pills">${D.styles.map((s, i) => `<button class="${i ? '' : 'on'}" data-style="${s}">${s}</button>`).join('')}</div></div>
      <div class="opt"><b>Quantity:</b>
        <div class="qrow"><div class="stepper"><button data-pq="-1" id="qm" disabled>−</button><input id="qin" type="number" min="1" max="${D.stock}" value="1"><button data-pq="1">+</button></div>
          <span class="redt">${D.stock <= 15 ? D.stock + ' units left' : 'In stock'}</span></div></div>
      <button class="btn big-btn" id="addCart">🛒 Add to Cart</button>
      <button class="btn-outline big-btn" id="buyNow">Buy Now</button>
      <div class="sellerbox"><div class="sl"><div class="sicon">🛍️</div><div><b>Sold by ${sellerOf(p)}</b><small class="mut">${D.sellerRating}% Positive Seller Rating</small></div><button class="btn-outline mini" data-soon="Seller stores coming soon">Visit Store</button></div>
        <a href="#" class="mut" data-soon="Chat coming soon">💬 Chat with Seller</a></div>
      <div class="dlv">
        <div><i>📍</i><span><b>Deliver to <span id="city">Lagos</span></b><a href="#" class="link" id="chcity">Deliver to a different address</a></span></div>
        <div><i>🚚</i><span><b>Free Delivery</b><small class="mut">On orders above ₦25,000</small></span></div>
        <div><i>📅</i><span><b>Estimated delivery: 2–4 business days</b></span></div>
        <div><i>🔄</i><span><b>7-day return policy</b><a href="#" class="link" data-soon="Returns page coming soon">Learn more</a></span></div>
        <div><i>🛡️</i><span><b>Secure payment</b><small class="mut">Card, transfer, or pay on delivery</small></span></div></div>
      <div class="offers"><b>🏷️ Available Offers</b><ul><li>Get 5% off when you pay with MarketHub Wallet</li><li>Buy 2 or more and get an extra 10% off</li><li>Free delivery on your first order — use code WELCOME10</li></ul></div>
    </div></section>

  <section class="box tabsbox" id="reviews">
    <div class="tabs"><button class="on" data-tab="desc">Description</button><button data-tab="spec">Specifications</button><button data-tab="rev">Reviews (${D.ratings.toLocaleString()})</button></div>
    <div class="tab" id="t-desc">${D.desc.map(t => `<p>${t}</p>`).join('')}<h3>Key Features</h3><ul class="feat">${D.features.map(f => `<li>✔ ${f}</li>`).join('')}</ul></div>
    <div class="tab" id="t-spec" hidden><table class="spec">${D.specs.map(([a, b]) => `<tr><th>${a}</th><td>${b}</td></tr>`).join('')}</table></div>
    <div class="tab" id="t-rev" hidden>
      <div class="rsum"><div class="rbig"><b>${p.r}.0</b><span class="stars">${stars(p.r)}</span><small class="mut">${D.ratings.toLocaleString()} ratings</small></div>
        <div class="bars">${[5, 4, 3, 2, 1].map(s => { const w = s === p.r ? 70 : s === p.r - 1 ? 20 : s > p.r ? 2 : 4; return `<div><span>${s}★</span><i><u style="width:${w}%"></u></i><span>${w}%</span></div>`; }).join('')}</div></div>
      <p class="mut">Sample reviews (connect a reviews backend to show real ones):</p>
      ${[['Chinedu O.', 5, 'Exactly as described and delivered in 2 days to Lagos. Great value.'], ['Amina B.', 4, 'Good quality for the price. Packaging could be better.'], ['Tunde A.', 5, 'Genuine product, easy return policy gave me confidence to buy.']].map(([n, r, t]) => `<div class="rev"><b>${n}</b> <span class="stars">${stars(r)}</span> <span class="ver">Verified Purchase</span><p>${t}</p></div>`).join('')}</div>
  </section>

  <section class="box"><div class="sec-head"><h2>Similar Products</h2><a href="category.html?c=${p.cat}" class="link">See All →</a></div><div class="grid g5" id="similar"></div></section>
  <section class="box" id="recentBox" hidden><h2>Recently Viewed</h2><div class="grid g5" id="recent" style="margin-top:16px"></div></section>`;

  /* ---- interactions ---- */
  const wl = () => $('#wl').textContent = wish.includes(p.id) ? '♥ In Wishlist' : '♡ Add to Wishlist';
  wl();
  const setQty = n => { sel.qty = Math.min(D.stock, Math.max(1, n || 1)); $('#qin').value = sel.qty; $('#qm').disabled = sel.qty < 2; };
  const addToCart = () => {
    cart[p.id] = Math.min(99, (cart[p.id] || 0) + sel.qty);
    const v = store.get('mh_var', {}); v[p.id] = `Color: ${sel.color} | Style: ${sel.style}`; store.set('mh_var', v);
    save();
  };
  const mark = (sel_, el) => { $$(sel_).forEach(b => b.classList.toggle('on', b === el)); };
  document.addEventListener('click', e => {
    const c = e.target.closest('[data-th],[data-color],[data-style],[data-pq],[data-tab],[data-soon],[data-wish],#addCart,#buyNow,#share,#chcity');
    if (!c) return;
    const d = c.dataset;
    if (c.tagName === 'A') e.preventDefault();
    if (d.th) { $('#gmain').innerHTML = asImg(imgs[d.th]); mark('.thumbs button', c); }
    else if (d.color) { sel.color = d.color; $('#cname').textContent = d.color; mark('.sw button', c); }
    else if (d.style) { sel.style = d.style; $('#sname').textContent = d.style; mark('.pills button', c); }
    else if (d.pq) setQty(sel.qty + +d.pq);
    else if (d.tab) { $$('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === d.tab)); ['desc', 'spec', 'rev'].forEach(t => $('#t-' + t).hidden = t !== d.tab); }
    else if (d.soon) toast(d.soon);
    else if (d.wish) { if (+d.wish === p.id) wl(); }
    else if (c.id === 'addCart') { addToCart(); toast('Added to cart ✔'); }
    else if (c.id === 'buyNow') { addToCart(); location.href = 'cart.html'; }
    else if (c.id === 'share') { navigator.clipboard?.writeText(location.href).then(() => toast('Link copied'), () => toast(location.href)) || toast(location.href); }
    else if (c.id === 'chcity') { const v = prompt('Deliver to which city?', $('#city').textContent); if (v) $('#city').textContent = v.trim(); }
  });
  $('#qin').addEventListener('change', e => setQty(parseInt(e.target.value)));

  /* ---- similar & recently viewed ---- */
  const mini = x => { const s = sellerOf(x), o = /Official/.test(s); return `<article class="card pc"><span class="off">-${pct(x)}%</span>${o ? '<span class="os">OFFICIAL STORE</span>' : ''}
    <div class="pic">${pic(x)}</div><div class="info"><h3>${x.name}</h3><div class="price">${fmt(x.price)}<s>${fmt(x.old)}</s></div>
    <div class="stars">${stars(x.r)}<small>(${x.rv})</small></div><span class="free">🚚 Free Delivery</span><small class="sold">Sold by ${s}</small>
    <button class="add" data-add="${x.id}">🛒 Add to Cart</button></div></article>`; };
  $('#similar').innerHTML = PRODUCTS.filter(x => x.cat === p.cat && x.id !== p.id).sort((a, b) => Math.abs(a.price - p.price) - Math.abs(b.price - p.price)).slice(0, 5).map(mini).join('');
  const rec = store.get('mh_recent', []);
  const shown = rec.filter(x => x !== p.id).map(byId).filter(Boolean).slice(0, 4);
  if (shown.length) { $('#recent').innerHTML = shown.map(mini).join(''); $('#recentBox').hidden = false; }
  store.set('mh_recent', [p.id, ...rec.filter(x => x !== p.id)].slice(0, 8));
}
});