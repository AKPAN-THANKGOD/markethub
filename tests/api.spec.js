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