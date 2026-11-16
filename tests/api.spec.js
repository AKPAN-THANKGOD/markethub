// API tests for the PHP + MySQL backend. They need the backend running, so they are skipped unless API_BASE is set:
//   Windows cmd:  set API_BASE=http://localhost:8000   then   npx playwright test tests/api.spec.js
// (No browser is needed for these.)
const { test, expect, request } = require('@playwright/test');
const path = require('path');
const { execFileSync } = require('child_process');

const BASE = process.env.API_BASE;

test.describe('API (PHP + MySQL)', () => {
  test.skip(!BASE, 'API_BASE is not set');
  test.describe.configure({ mode: 'serial' });

  let api, csrf;
  const stamp = Date.now();
  const user = { name: 'Api Tester', email: `api${stamp}@example.com`, phone: '08031234567', password: 'Passw0rd!1' };

  test.beforeAll(async () => { api = await request.newContext({ baseURL: BASE }); });
  test.afterAll(async () => { await api.dispose(); });

  const post = (url, data, token = csrf) => api.post(url, { data, headers: token ? { 'X-CSRF-Token': token } : {} });
  const freshToken = async () => { csrf = (await (await api.get('/api/auth/me.php')).json()).csrf; return csrf; };

  test('health: PHP is running and the database is reachable', async () => {
    const r = await api.get('/api/health.php');
    expect(r.status(), await r.text()).toBe(200);
    expect(await r.json()).toMatchObject({ ok: true, db: true });
  });

  test('me: signed out, and a CSRF token is issued', async () => {
    const j = await (await api.get('/api/auth/me.php')).json();
    expect(j.user).toBeNull();
    expect(j.csrf).toMatch(/^[0-9a-f]{64}$/);
    csrf = j.csrf;
  });

  test('register: rejects a missing CSRF token, weak passwords and bad emails', async () => {
    expect((await post('/api/auth/register.php', user, '')).status()).toBe(403);
    expect((await post('/api/auth/register.php', { ...user, password: 'short' })).status()).toBe(422);
    expect((await post('/api/auth/register.php', { ...user, password: 'allletters' })).status()).toBe(422);
    expect((await post('/api/auth/register.php', { ...user, email: 'not-an-email' })).status()).toBe(422);
    expect((await post('/api/auth/register.php', { ...user, phone: 'abc' })).status()).toBe(422);
  });

  test('register: creates the account and signs in; duplicates are refused', async () => {
    const r = await post('/api/auth/register.php', user);
    expect(r.status(), await r.text()).toBe(201);
    const j = await r.json(); csrf = j.csrf;
    expect(j.user).toMatchObject({ name: user.name, email: user.email });
    expect(JSON.stringify(j)).not.toContain('password');
    expect((await post('/api/auth/register.php', user)).status()).toBe(409);
    expect((await (await api.get('/api/auth/me.php')).json()).user.email).toBe(user.email);
  });

  test('logout ends the session', async () => {
    expect((await post('/api/auth/logout.php', {})).status()).toBe(200);
    expect((await (await api.get('/api/auth/me.php')).json()).user).toBeNull();
  });

  test('login: wrong password fails, right password works', async () => {
    await freshToken();
    const bad = await post('/api/auth/login.php', { email: user.email, password: 'WrongPass1' });
    expect(bad.status()).toBe(401);
    expect((await bad.json()).error).toContain('Incorrect');
    const ok = await post('/api/auth/login.php', { email: user.email.toUpperCase(), password: user.password });
    expect(ok.status(), await ok.text()).toBe(200);
    csrf = (await ok.json()).csrf;
    expect((await (await api.get('/api/auth/me.php')).json()).user.email).toBe(user.email);
  });

  test('profile and password: need sign-in; update name/phone; change password', async () => {
    // currently signed in from the login test
    const up = await post('/api/auth/update.php', { name: 'Api Tester Jr', phone: '08099998888' });
    expect(up.status(), await up.text()).toBe(200);
    expect((await up.json()).user).toMatchObject({ name: 'Api Tester Jr', phone: '08099998888' });
    expect((await post('/api/auth/update.php', { name: 'X', phone: '08099998888' })).status()).toBe(422);
    expect((await post('/api/auth/password.php', { old: 'WrongOld1', password: 'N3wPassw0rd!' })).status()).toBe(401);
    expect((await post('/api/auth/password.php', { old: user.password, password: 'short' })).status()).toBe(422);
    const ch = await post('/api/auth/password.php', { old: user.password, password: 'N3wPassw0rd!' });
    expect(ch.status(), await ch.text()).toBe(200);
    await post('/api/auth/logout.php', {}); await freshToken();
    expect((await post('/api/auth/update.php', { name: 'Anyone', phone: '08099998888' })).status()).toBe(401);   // signed out
    expect((await post('/api/auth/login.php', { email: user.email, password: user.password })).status()).toBe(401);   // old password no longer works
    const ok = await post('/api/auth/login.php', { email: user.email, password: 'N3wPassw0rd!' });
    expect(ok.status(), await ok.text()).toBe(200); csrf = (await ok.json()).csrf;
  });

  test('cart and wishlist: need sign-in, validate input, replace the saved list', async () => {
    const anon = await request.newContext({ baseURL: BASE });
    expect((await anon.get('/api/cart/get.php')).status()).toBe(401);
    expect((await anon.get('/api/wishlist/get.php')).status()).toBe(401);
    await anon.dispose();
    expect((await (await api.get('/api/cart/get.php')).json()).items).toEqual([]);
    const save = await post('/api/cart/save.php', { items: [{ id: 205, qty: 2, selected: true, variant: 'Color: Blue | Style: Standard' }, { id: 3, qty: 1, selected: false }] });
    expect(save.status(), await save.text()).toBe(200);
    expect((await (await api.get('/api/cart/get.php')).json()).items).toEqual([
      { id: 3, qty: 1, selected: false, variant: null }, { id: 205, qty: 2, selected: true, variant: 'Color: Blue | Style: Standard' }]);
    expect((await post('/api/cart/save.php', { items: [{ id: 205, qty: 0 }] })).status()).toBe(422);
    expect((await post('/api/cart/save.php', { items: [{ id: 205, qty: 100 }] })).status()).toBe(422);
    expect((await post('/api/cart/save.php', { items: [{ id: 999999, qty: 1 }] })).status()).toBe(422);
    expect((await post('/api/cart/save.php', { items: 'nope' })).status()).toBe(422);
    expect((await post('/api/cart/save.php', { items: [] }, '')).status()).toBe(403);          // no CSRF token
    expect((await (await api.get('/api/cart/get.php')).json()).items).toHaveLength(2);        // failed saves changed nothing
    await post('/api/cart/save.php', { items: [{ id: 7, qty: 1 }] });                          // a new save replaces the list
    expect((await (await api.get('/api/cart/get.php')).json()).items).toEqual([{ id: 7, qty: 1, selected: true, variant: null }]);

    expect((await post('/api/wishlist/save.php', { ids: [2, 15, 2] })).status()).toBe(200);
    expect((await (await api.get('/api/wishlist/get.php')).json()).ids.sort((a, b) => a - b)).toEqual([2, 15]);
    expect((await post('/api/wishlist/save.php', { ids: [999999] })).status()).toBe(422);
    expect((await post('/api/wishlist/save.php', { ids: ['x'] })).status()).toBe(422);
  });

  test('addresses: add, edit, default, delete; validation; other users cannot touch them', async () => {
    const a1 = { name: 'Api Tester', phone: '08031234567', street: '12 Test Street, Ikeja', city: 'Lagos', state: 'Lagos State', zip: '100001' };
    const r1 = await post('/api/addresses/save.php', a1);
    expect(r1.status(), await r1.text()).toBe(201);
    const j1 = await r1.json(); const id1 = j1.id;
    expect(j1.items).toHaveLength(1); expect(j1.items[0]).toMatchObject({ ...a1, def: true });   // the first address is the default
    const j2 = await (await post('/api/addresses/save.php', { ...a1, name: 'Second Home', street: '5 Garki Road', city: 'Abuja' })).json(); const id2 = j2.id;
    expect(j2.items).toHaveLength(2); expect(j2.items.find(a => a.id === id2).def).toBe(false);
    expect((await post('/api/addresses/save.php', { ...a1, phone: 'abc' })).status()).toBe(422);
    expect((await post('/api/addresses/save.php', { ...a1, city: '' })).status()).toBe(422);
    const ed = await post('/api/addresses/save.php', { id: id2, ...a1, name: 'Second Home', street: '7 Garki Road', city: 'Abuja' });
    expect(ed.status()).toBe(200); expect((await ed.json()).items.find(a => a.id === id2).street).toBe('7 Garki Road');
    expect((await (await post('/api/addresses/default.php', { id: id2 })).json()).items.filter(a => a.def).map(a => a.id)).toEqual([id2]);
    const del = await (await post('/api/addresses/delete.php', { id: id2 })).json();            // deleting the default hands it to another address
    expect(del.items).toHaveLength(1); expect(del.items[0]).toMatchObject({ id: id1, def: true });

    const other = await request.newContext({ baseURL: BASE });                                   // a different shopper
    const t1 = (await (await other.get('/api/auth/me.php')).json()).csrf;
    const reg = await other.post('/api/auth/register.php', { data: { name: 'Other Person', email: `other${stamp}@example.com`, phone: '08022223333', password: 'Passw0rd!1' }, headers: { 'X-CSRF-Token': t1 } });
    expect(reg.status(), await reg.text()).toBe(201);
    const t2 = (await reg.json()).csrf;
    const op = (url, data) => other.post(url, { data, headers: { 'X-CSRF-Token': t2 } });
    expect((await (await other.get('/api/addresses/list.php')).json()).items).toEqual([]);
    expect((await (await other.get('/api/cart/get.php')).json()).items).toEqual([]);
    expect((await op('/api/addresses/save.php', { id: id1, ...a1, name: 'Hacked' })).status()).toBe(404);
    expect((await op('/api/addresses/delete.php', { id: id1 })).status()).toBe(404);
    expect((await op('/api/addresses/default.php', { id: id1 })).status()).toBe(404);
    expect((await (await api.get('/api/addresses/list.php')).json()).items[0].name).toBe('Api Tester');   // untouched
    await other.dispose();
  });

  // ---- orders (phase 4) ----
  // Products used: 7 (MarketHub Official), 110 and 119 (two different outside sellers, so delivery is 2 x ₦2,500), 114 (only 2 in stock), 115 (over ₦300,000)
  const prod = async id => (await (await api.get(`/api/products/get.php?id=${id}`)).json()).item;
  const stockOf = async id => (await prod(id)).stock;
  const setCart = async items => expect((await post('/api/cart/save.php', { items })).status()).toBe(200);
  const placeOrder = (extra = {}) => post('/api/orders/create.php', { address_id: lagos, ship: 'standard', pay: 'transfer', note: '', promo: '', ...extra });
  const BASKET = [{ id: 7, qty: 1, selected: true, variant: 'Color: Blue' }, { id: 110, qty: 1, selected: true }, { id: 119, qty: 2, selected: true }, { id: 9, qty: 1, selected: false }];
  let lagos, orderA, orderB;

  test('orders: need sign-in and a CSRF token; empty carts and bad input are refused', async () => {
    const anon = await request.newContext({ baseURL: BASE });
    const t = (await (await anon.get('/api/auth/me.php')).json()).csrf;
    expect((await anon.post('/api/orders/create.php', { data: {}, headers: { 'X-CSRF-Token': t } })).status()).toBe(401);
    expect((await anon.get('/api/orders/list.php')).status()).toBe(401);
    expect((await anon.get('/api/orders/get.php?id=MH12345678')).status()).toBe(401);
    await anon.dispose();

    lagos = (await (await api.get('/api/addresses/list.php')).json()).items[0].id;
    expect((await post('/api/orders/create.php', { address_id: lagos, ship: 'standard', pay: 'cod' }, '')).status()).toBe(403);   // no CSRF token
    await setCart([{ id: 9, qty: 1, selected: false }]);                                                                          // nothing ticked
    const empty = await placeOrder(); expect(empty.status()).toBe(422); expect((await empty.json()).error).toContain('Select at least one item');

    await setCart(BASKET);
    expect((await placeOrder({ ship: 'teleport' })).status()).toBe(422);
    expect((await placeOrder({ pay: 'bitcoin' })).status()).toBe(422);
    expect((await placeOrder({ address_id: undefined })).status()).toBe(422);
    expect((await placeOrder({ address_id: 999999 })).status()).toBe(422);
    const bad = await placeOrder({ promo: 'NOPE' }); expect(bad.status()).toBe(422); expect((await bad.json()).error).toContain('Invalid promo');
    expect((await placeOrder({ note: 'x'.repeat(501) })).status()).toBe(422);
    expect((await (await api.get('/api/orders/list.php')).json()).items).toEqual([]);                    // nothing was ordered...
    expect((await (await api.get('/api/cart/get.php')).json()).items).toHaveLength(4);                   // ...and the cart is untouched
  });

  test('orders: the server prices the order, ignores what the browser claims, takes stock and empties the ticked items', async () => {
    const [p7, p110, p119] = await Promise.all([prod(7), prod(110), prod(119)]);
    const before = { 7: p7.stock, 110: p110.stock, 119: p119.stock };
    const sub = p7.price + p110.price + 2 * p119.price, fee = 2 * 2500, disc = Math.round(sub * 5 / 100);
    const r = await placeOrder({ promo: 'save5', note: 'Call on arrival', total: 1, sub: 1, fee: 0, items: [{ id: 205, qty: 50, price: 1 }] });   // the extra fields must be ignored
    expect(r.status(), await r.text()).toBe(201);
    orderA = (await r.json()).order;
    expect(orderA.id).toMatch(/^MH\d{8}$/);
    expect(orderA).toMatchObject({ status: 'placed', payStatus: 'pending', ship: 'standard', pay: 'transfer', promo: 'SAVE5', note: 'Call on arrival', sub, fee, disc, total: sub + fee - disc });
    expect(orderA.items.map(i => [i.id, i.q, i.price])).toEqual([[7, 1, p7.price], [110, 1, p110.price], [119, 2, p119.price]]);
    expect(orderA.items[0].variant).toBe('Color: Blue');
    expect(orderA.address).toMatchObject({ street: '12 Test Street, Ikeja', city: 'Lagos' });
    expect(orderA.events.map(e => e.status)).toEqual(['placed']);
    expect(await stockOf(7)).toBe(before[7] - 1); expect(await stockOf(110)).toBe(before[110] - 1); expect(await stockOf(119)).toBe(before[119] - 2);
    expect((await (await api.get('/api/cart/get.php')).json()).items).toEqual([{ id: 9, qty: 1, selected: false, variant: null }]);   // only the unticked item is left
    expect((await placeOrder()).status()).toBe(422);                                                      // sending it again does not order twice
  });

  test('orders: two requests at the same moment make one order; express delivery is a flat fee', async () => {
    const p119 = await prod(119);
    await setCart([{ id: 119, qty: 1, selected: true }]);
    const [a, b] = await Promise.all([placeOrder({ ship: 'express' }), placeOrder({ ship: 'express' })]);
    expect([a.status(), b.status()].sort()).toEqual([201, 422]);
    orderB = (await (a.status() === 201 ? a : b).json()).order;
    expect(orderB).toMatchObject({ ship: 'express', sub: p119.price, fee: 5500, disc: 0, total: p119.price + 5500 });
  });

  test('orders: cannot buy more than is in stock; Pay on Delivery only in its cities and under the limit', async () => {
    await setCart([{ id: 114, qty: 3, selected: true }]);                                                 // only 2 in stock
    const over = await placeOrder(); expect(over.status()).toBe(409); expect((await over.json()).error).toContain('only has');
    expect(await stockOf(114)).toBe(2);                                                                    // nothing was taken
    const uyo = (await (await post('/api/addresses/save.php', { name: 'Api Tester', phone: '08031234567', street: '3 Oron Road', city: 'Uyo', state: 'Akwa Ibom' })).json()).id;
    await setCart([{ id: 119, qty: 1, selected: true }]);
    const cod = await placeOrder({ pay: 'cod', address_id: uyo }); expect(cod.status()).toBe(422); expect((await cod.json()).error).toContain('Pay on Delivery');
    await setCart([{ id: 115, qty: 1, selected: true }]);                                                  // ₦335,000 is over the Pay on Delivery limit
    expect((await placeOrder({ pay: 'cod' })).status()).toBe(422);
    await post('/api/addresses/delete.php', { id: uyo });
    await setCart([]);
  });

  test('orders: list and get show my orders (newest first); other shoppers cannot see them', async () => {
    const list = (await (await api.get('/api/orders/list.php')).json()).items;
    expect(list.map(o => o.id)).toEqual([orderB.id, orderA.id]);
    const one = await api.get(`/api/orders/get.php?id=${orderA.id.toLowerCase()}`);
    expect(one.status()).toBe(200); expect((await one.json()).order).toMatchObject({ id: orderA.id, total: orderA.total });
    expect((await api.get('/api/orders/get.php?id=MH00000000')).status()).toBe(404);
    expect((await api.get('/api/orders/get.php?id=nonsense')).status()).toBe(404);

    const other = await request.newContext({ baseURL: BASE });
    const t1 = (await (await other.get('/api/auth/me.php')).json()).csrf;
    const reg = await other.post('/api/auth/register.php', { data: { name: 'Other Buyer', email: `buyer${stamp}@example.com`, phone: '08022223333', password: 'Passw0rd!1' }, headers: { 'X-CSRF-Token': t1 } });
    expect(reg.status(), await reg.text()).toBe(201);
    expect((await (await other.get('/api/orders/list.php')).json()).items).toEqual([]);
    expect((await other.get(`/api/orders/get.php?id=${orderA.id}`)).status()).toBe(404);                  // looks the same as an order that does not exist
    await other.dispose();
  });

  test('orders: public tracking needs the order number AND the account email, and shows no address', async () => {
    const anon = await request.newContext({ baseURL: BASE });
    expect((await anon.get(`/api/orders/track.php?id=${orderA.id}&email=wrong@example.com`)).status()).toBe(404);
    expect((await anon.get(`/api/orders/track.php?id=MH00000000&email=${user.email}`)).status()).toBe(404);
    const ok = await anon.get(`/api/orders/track.php?id=${orderA.id.toLowerCase()}&email=${user.email.toUpperCase()}`);
    expect(ok.status(), await ok.text()).toBe(200);
    const o = (await ok.json()).order;
    expect(o).toMatchObject({ id: orderA.id, status: 'placed', total: orderA.total });
    expect(o).not.toHaveProperty('address'); expect(o).not.toHaveProperty('note');
    expect(JSON.stringify(o)).not.toContain('08031234567');
    await anon.dispose();
  });

  test('orders: a status change (command line) shows up for the shopper; cancelling puts the stock back', async () => {
    const cli = (...args) => execFileSync(process.env.PHP_BIN || 'php', [path.join(__dirname, '..', 'db', 'orders-cli.php'), ...args], { encoding: 'utf8' });
    try { cli('list'); } catch { test.skip(true, 'PHP command line not found - set PHP_BIN to your php executable to run this test'); }
    cli('status', orderA.id, 'shipped');
    let o = (await (await api.get(`/api/orders/get.php?id=${orderA.id}`)).json()).order;
    expect(o.status).toBe('shipped'); expect(o.events.map(e => e.status)).toEqual(['placed', 'shipped']);
    const before = await stockOf(110);
    cli('status', orderA.id, 'cancelled');
    o = (await (await api.get(`/api/orders/get.php?id=${orderA.id}`)).json()).order;
    expect(o.status).toBe('cancelled');
    expect(await stockOf(110)).toBe(before + 1);                                                           // the cancelled order's items went back on the shelf
    expect(() => cli('status', orderA.id, 'processing')).toThrow();                                        // a cancelled order stays cancelled
    cli('status', orderB.id, 'cancelled');                                                                 // leave the shared test stock as we found it
  });

  test('login: locks an email after 5 failed attempts', async () => {
    await freshToken();
    const email = `lock${stamp}@example.com`;
    for (let i = 0; i < 5; i++) expect((await post('/api/auth/login.php', { email, password: 'WrongPass1' })).status()).toBe(401);
    expect((await post('/api/auth/login.php', { email, password: 'WrongPass1' })).status()).toBe(429);
  });

  test('products: list, filters, single product, unknown id', async () => {
    const all = await (await api.get('/api/products/list.php')).json();
    expect(all.total, 'products in the database - was db/seed.sql loaded? Response: ' + JSON.stringify(all).slice(0, 200)).toBeGreaterThanOrEqual(56);
    expect(all.items.find(p => p.id === 205).detail.features.length).toBeGreaterThan(3);
    const phones = await (await api.get('/api/products/list.php?c=phones')).json();
    expect(phones.items.length).toBeGreaterThan(20);
    phones.items.forEach(p => expect(p.cat).toBe('phones'));
    const buds = await (await api.get('/api/products/list.php?q=earbuds')).json();
    expect(buds.items.length).toBeGreaterThanOrEqual(5);
    buds.items.forEach(p => expect(p.name).toMatch(/earbuds/i));
    expect((await (await api.get('/api/products/list.php?ids=1,2')).json()).total).toBe(2);
    expect((await (await api.get("/api/products/list.php?q=' OR 1=1 --")).json()).total).toBe(0);   // SQL injection attempt finds nothing
    const one = await api.get('/api/products/get.php?id=205');
    expect((await one.json()).item).toMatchObject({ id: 205, price: 24500, old: 42000, cat: 'electronics' });
    expect((await api.get('/api/products/get.php?id=999999')).status()).toBe(404);
  });
});