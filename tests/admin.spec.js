// Admin API tests. Add the admin e-mail to 'admin_emails' in api/config.local.php, then (Windows cmd):
//   set ADMIN_EMAIL=ci-admin@example.com
//   set API_BASE=http://localhost:8000
//   npx playwright test tests/admin.spec.js
const { test, expect, request } = require('@playwright/test');
const { shopper, placeOrder, getOrder, cancelOrders } = require('./helpers');

const BASE = process.env.API_BASE, ADMIN = process.env.ADMIN_EMAIL;

test.describe('Admin (orders)', () => {
  test.skip(!BASE || !ADMIN, 'Set API_BASE and ADMIN_EMAIL (an address listed in admin_emails) to run these');
  test.describe.configure({ mode: 'serial' });

  const stamp = Date.now(), made = [];
  let cs, ca, s, adm, order;

  test.beforeAll(async () => {
    cs = await request.newContext({ baseURL: BASE });
    ca = await request.newContext({ baseURL: BASE });
    s = await shopper(cs, `adm${stamp}@example.com`);
    adm = await shopper(ca, ADMIN, { admin: true });
    order = await placeOrder(s, 'transfer'); made.push(order.id);
  });
  test.afterAll(async () => { cancelOrders(made); await cs?.dispose(); await ca?.dispose(); });

  test('a normal shopper is not an admin and gets 403 everywhere', async () => {
    expect((await s.me()).admin).toBe(false);
    expect((await s.get('/api/admin/orders.php')).status()).toBe(403);
    expect((await s.post('/api/admin/order-update.php', { id: order.id, action: 'paid' })).status()).toBe(403);
    expect((await getOrder(s, order.id)).payStatus).toBe('pending');
    const anon = await request.newContext({ baseURL: BASE });
    expect((await anon.get('/api/admin/orders.php')).status()).toBe(401);
    await anon.dispose();
  });

  test('the admin sees orders, can search and filter them', async () => {
    expect((await adm.me()).admin).toBe(true);
    const all = await (await adm.get('/api/admin/orders.php')).json();
    expect(all.items.length).toBeGreaterThan(0);
    const one = await (await adm.get(`/api/admin/orders.php?q=${order.id}`)).json();
    expect(one.items).toHaveLength(1);
    expect(one.items[0]).toMatchObject({ id: order.id, email: s.email, status: 'placed', payStatus: 'pending', pay: 'transfer', total: order.total, refundDue: false });
    expect((await (await adm.get(`/api/admin/orders.php?q=${order.id}&status=shipped`)).json()).items).toHaveLength(0);
    expect((await (await adm.get(`/api/admin/orders.php?q=${order.id}&pay=unpaid`)).json()).items).toHaveLength(1);
    expect((await adm.get('/api/admin/orders.php?status=nonsense')).status()).toBe(422);
  });

  test('the admin can change the status and mark a transfer as paid; the shopper sees it', async () => {
    expect((await adm.post('/api/admin/order-update.php', { id: order.id, action: 'status', status: 'processing' })).status()).toBe(200);
    expect((await adm.post('/api/admin/order-update.php', { id: order.id, action: 'paid' })).status()).toBe(200);
    const o = await getOrder(s, order.id);
    expect(o).toMatchObject({ status: 'processing', payStatus: 'paid' });
    expect(o.events.map(e => e.status)).toEqual(['placed', 'processing']);
  });

  test('bad requests are refused, and cancelling a paid order is flagged for a refund', async () => {
    expect((await adm.post('/api/admin/order-update.php', { id: order.id, action: 'status', status: 'teleported' })).status()).toBe(422);
    expect((await adm.post('/api/admin/order-update.php', { id: order.id, action: 'status', status: 'processing' })).status()).toBe(422);   // already processing
    expect((await adm.post('/api/admin/order-update.php', { id: 'MH00000000', action: 'paid' })).status()).toBe(422);
    expect((await adm.post('/api/admin/order-update.php', { id: order.id, action: 'explode' })).status()).toBe(422);
    expect((await ca.post('/api/admin/order-update.php', { data: { id: order.id, action: 'paid' } })).status()).toBe(403);                     // no CSRF token
    expect((await adm.post('/api/admin/order-update.php', { id: order.id, action: 'status', status: 'cancelled' })).status()).toBe(200);
    const one = await (await adm.get(`/api/admin/orders.php?q=${order.id}`)).json();
    expect(one.items[0]).toMatchObject({ status: 'cancelled', payStatus: 'paid', refundDue: true });
    expect((await adm.post('/api/admin/order-update.php', { id: order.id, action: 'status', status: 'placed' })).status()).toBe(422);        // stays cancelled
  });
});
