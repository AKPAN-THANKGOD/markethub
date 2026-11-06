// API tests for the PHP + MySQL backend. They need the backend running, so they are skipped unless API_BASE is set:
//   Windows cmd:  set API_BASE=http://localhost:8000   then   npx playwright test tests/api.spec.js
// (No browser is needed for these.)
const { test, expect, request } = require('@playwright/test');

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