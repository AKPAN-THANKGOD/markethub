/* Category / search / brand listing – category.html?c=phones  ?q=earbuds  ?brand=Apple  (runs after app.js) */
const num = s => /k$/i.test(s) ? parseFloat(s) * 1000 : parseInt(String(s).replace(/,/g, '')) || 0;
const sellerFor = p => p.seller || (p.cat === 'home' ? 'Home Essentials Store' : 'MarketHub Official');
const DATA = PRODUCTS.map(p => { const seller = sellerFor(p);
  return { ...p, brand: p.brand || p.name.split(' ')[0], seller, free: p.free ?? true, official: p.official ?? /Official/.test(seller), pop: p.pop ?? num(p.rv) }; });
const PAGE_SIZE = 12;               // raise this as your catalogue grows
const BUCKETS = [['Under ₦50,000', 0, 5e4], ['₦50,000 – ₦100,000', 5e4, 1e5], ['₦100,000 – ₦200,000', 1e5, 2e5], ['₦200,000 – ₦500,000', 2e5, 5e5], ['Above ₦500,000', 5e5, Infinity]];
const disc = p => Math.round(100 - p.price / p.old * 100);
const catName = k => CATS.find(c => c[0] === k)?.[1] || '';
const prm = new URLSearchParams(location.search), RAW_Q = prm.get('q') || '', Q = RAW_Q.toLowerCase().trim(), C = prm.get('c'), BR = prm.get('brand');
const BASE = DATA.filter(p => !Q || Q.split(/\s+/).every(w => (p.name + ' ' + p.brand + ' ' + catName(p.cat)).toLowerCase().includes(w)));
let S = {}, page = 1, brandsOpen = false;

/* ---- page title + header sync ---- */
const title = Q ? `Results for "${RAW_Q}"` : catName(C) || BR || 'All Products';
$('#ptitle').textContent = title; document.title = title + ' – MarketHub';
$('#psub').textContent = catName(C) ? `Shop ${catName(C)} online at the best prices in Nigeria` : 'Great deals from verified sellers across Nigeria';
$('#crumbs').innerHTML = `<a href="index.html">Home</a> › <b>${catName(C) || (Q ? 'Search' : 'All Products')}</b>`;
$('#searchInput').value = RAW_Q; if (catName(C)) $('#searchCat').value = C;

/* ---- build filter options ---- */
const lab = (name, val, txt, n) =>
  `<label class="${n === 0 ? 'dis' : ''}"><input type="${name === 'rating' ? 'radio' : 'checkbox'}" name="${name}" value="${val}" ${n === 0 ? 'disabled' : ''}> ${txt}${n != null ? ` <small>(${n})</small>` : ''}</label>`;
const count = fn => BASE.filter(fn).length;
$('#fType').innerHTML = CATS.map(([k, n]) => lab('cat', k, n, count(p => p.cat === k))).join('');
$('#fBucket').innerHTML = BUCKETS.map((b, i) => lab('bucket', i, b[0], count(p => p.price >= b[1] && p.price < b[2]))).join('');
const BRAND_LIST = [...new Set(BASE.map(p => p.brand))].sort((a, b) => count(p => p.brand === b) - count(p => p.brand === a) || a.localeCompare(b));
function drawBrands() {
  const keep = $$('[name=brand]:checked').map(i => i.value);
  $('#fBrand').innerHTML = (brandsOpen ? BRAND_LIST : BRAND_LIST.slice(0, 6)).map(b => lab('brand', b, b, count(p => p.brand === b))).join('');
  keep.forEach(v => { const i = $(`[name=brand][value="${v}"]`); if (i) i.checked = true; });
  $('#moreBrands').hidden = BRAND_LIST.length <= 6; $('#moreBrands').textContent = brandsOpen ? 'See less' : 'See more';
}
drawBrands();

/* ---- state, filter, sort ---- */
function readState() {
  const g = n => $$(`[name=${n}]:checked`).map(i => i.value);
  S = { cats: g('cat'), buckets: g('bucket').map(Number), brands: g('brand'), rating: +(g('rating')[0] || 0), disc: +(g('disc')[0] || 0),
        sellers: g('seller'), free: g('free').length > 0, min: parseFloat($('#min').value) || 0, max: parseFloat($('#max').value) || Infinity };
}
const matches = p =>
  (!S.cats.length || S.cats.includes(p.cat)) &&
  (!S.buckets.length || S.buckets.some(i => p.price >= BUCKETS[i][1] && p.price < BUCKETS[i][2])) &&
  (!S.brands.length || S.brands.includes(p.brand)) &&
  p.price >= S.min && p.price <= S.max && p.r >= S.rating && disc(p) >= S.disc &&
  (!S.sellers.length || S.sellers.includes(p.official ? 'official' : 'partner')) && (!S.free || p.free);
const SORTS = { pop: (a, b) => b.pop - a.pop, asc: (a, b) => a.price - b.price, desc: (a, b) => b.price - a.price,
  new: (a, b) => b.id - a.id, rate: (a, b) => b.r - a.r || b.pop - a.pop, disc: (a, b) => disc(b) - disc(a) };

/* ---- render ---- */
const pcard = p => `<article class="card pc">
  <span class="off">-${disc(p)}%</span>${p.official ? '<span class="os">OFFICIAL STORE</span>' : ''}
  <button class="heart ${wish.includes(p.id) ? 'on' : ''}" data-wish="${p.id}" aria-label="Wishlist">♥</button>
  <div class="pic">${pic(p)}${p.low ? '<span class="low">Only 2 left</span>' : ''}</div>
  <div class="info"><h3>${p.name}</h3><div class="price">${fmt(p.price)}<s>${fmt(p.old)}</s></div>
    <div class="stars">${stars(p.r)}<small>(${p.rv})</small>${p.free ? '<span class="free">🚚 Free Delivery</span>' : ''}</div>
    <small class="sold">Sold by ${p.seller}</small><button class="add" data-add="${p.id}">🛒 Add to Cart</button></div></article>`;
function pageList(c, t) {
  const keep = [...new Set([1, t, c - 1, c, c + 1])].filter(n => n >= 1 && n <= t).sort((a, b) => a - b), out = [];
  keep.forEach((n, i) => { if (i && n - keep[i - 1] > 1) out.push('…'); out.push(n); });
  return out;
}
function render() {
  const res = BASE.filter(matches).sort(SORTS[$('#sort').value]), pages = Math.max(1, Math.ceil(res.length / PAGE_SIZE));
  page = Math.min(page, pages);
  const start = (page - 1) * PAGE_SIZE, slice = res.slice(start, start + PAGE_SIZE), n = res.length.toLocaleString();
  $('#pgrid').innerHTML = slice.length ? slice.map(pcard).join('') : '<p class="empty">No products match your search or filters. <a href="#" class="link" id="reset">Clear filters</a></p>';
  $('#found').textContent = `${n} result${res.length === 1 ? '' : 's'} found`;
  $('#showing').innerHTML = res.length ? `Showing <b>${start + 1}–${start + slice.length}</b> of <b>${n}</b> results` : 'No results';
  $('#viewed').textContent = res.length ? `You've viewed ${start + slice.length} of ${n} products` : '';
  $('#pager').innerHTML = pages < 2 ? '' : `<button data-pg="${page - 1}" ${page === 1 ? 'disabled' : ''} aria-label="Previous page">‹</button>` +
    pageList(page, pages).map(x => x === '…' ? '<span>…</span>' : `<button data-pg="${x}" class="${x === page ? 'on' : ''}">${x}</button>`).join('') +
    `<button data-pg="${page + 1}" ${page === pages ? 'disabled' : ''} aria-label="Next page">›</button>`;
}
const update = (resetPage = true) => { readState(); if (resetPage) page = 1; render(); };

/* ---- events ---- */
$('#ff').addEventListener('change', e => { if (e.target.type !== 'number') update(); });
$('#ff').addEventListener('submit', e => { e.preventDefault(); update(); });
$('#sort').addEventListener('change', () => update());
$('#moreBrands').onclick = () => { brandsOpen = !brandsOpen; drawBrands(); };
function clearAll() { $('#ff').reset(); update(); }
$('#clear').onclick = clearAll;
const setView = list => { $('#pgrid').classList.toggle('list', list); $('#vList').classList.toggle('on', list); $('#vGrid').classList.toggle('on', !list); };
$('#vGrid').onclick = () => setView(false); $('#vList').onclick = () => setView(true);
$('#fToggle').onclick = () => $('#filters').classList.toggle('open');
document.addEventListener('click', e => {
  const b = e.target.closest('[data-pg]');
  if (b && !b.disabled) { page = +b.dataset.pg; render(); scrollTo({ top: 0, behavior: 'smooth' }); }
  if (e.target.id === 'reset') { e.preventDefault(); clearAll(); }
});

/* preselect from the URL */
if (catName(C)) { const i = $(`[name=cat][value="${C}"]`); if (i && !i.disabled) i.checked = true; }
if (BR) { brandsOpen = true; drawBrands(); const i = $(`[name=brand][value="${BR}"]`); if (i) i.checked = true; }
update();