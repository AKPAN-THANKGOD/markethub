// Small helpers shared by the payment and admin API tests.
const { expect } = require('@playwright/test');
const path = require('path');
const { execFileSync } = require('child_process');

const ADDR = { name: 'Pay Tester', phone: '08031234567', street: '12 Test Street, Ikeja', city: 'Lagos', state: 'Lagos State', zip: '100001' };

/** Registers a new account on this request context (or signs in if the e-mail already exists) and returns helpers bound to it. */
async function shopper(ctx, email, { admin = false } = {}) {
  let csrf = (await (await ctx.get('/api/auth/me.php')).json()).csrf;
  const creds = { name: 'Pay Tester', email, phone: '08031234567', password: 'Passw0rd!1' };
  let r = await ctx.post('/api/auth/register.php', { data: creds, headers: { 'X-CSRF-Token': csrf } });
  if (r.status() === 409 && admin) r = await ctx.post('/api/auth/login.php', { data: { email, password: creds.password }, headers: { 'X-CSRF-Token': csrf } });
  expect(r.status(), await r.text()).toBeLessThan(300);
  csrf = (await r.json()).csrf;
  const s = { email, ctx, post: (url, data) => ctx.post(url, { data, headers: { 'X-CSRF-Token': csrf } }), get: url => ctx.get(url) };
  if (!admin) { const a = await s.post('/api/addresses/save.php', ADDR); expect(a.status(), await a.text()).toBe(201); s.address = (await a.json()).id; }
  s.me = async () => (await s.get('/api/auth/me.php')).json();
  return s;
}

/** Puts one product in the cart and places an order. Returns the order as the API shows it. */
async function placeOrder(s, pay = 'transfer') {
  expect((await s.post('/api/cart/save.php', { items: [{ id: 119, qty: 1, selected: true }] })).status()).toBe(200);
  const r = await s.post('/api/orders/create.php', { address_id: s.address, ship: 'standard', pay, note: '', promo: '' });
  expect(r.status(), await r.text()).toBe(201);
  return (await r.json()).order;
}

const getOrder = async (s, id) => (await (await s.get(`/api/orders/get.php?id=${id}`)).json()).order;

/** Cancels test orders through the PHP command line so the shared demo stock is put back. Does nothing if PHP is not on the PATH. */
function cancelOrders(ids) {
  for (const id of ids) {
    try { execFileSync(process.env.PHP_BIN || 'php', [path.join(__dirname, '..', 'db', 'orders-cli.php'), 'status', id, 'cancelled'], { encoding: 'utf8', stdio: 'pipe' }); } catch { /* no php, or already cancelled */ }
  }
}

module.exports = { ADDR, shopper, placeOrder, getOrder, cancelOrders };
