// Payment tests (phase 5). They run the PHP backend against a FAKE Paystack that this file starts, so no real money or network is involved.
// Start PHP with the same two settings, then run the tests (Windows cmd example):
//   set PAYSTACK_SECRET_KEY=sk_test_local
//   set PAYSTACK_BASE_URL=http://127.0.0.1:9911
//   D:\xampp\php\php.exe -S localhost:8000          (leave it running; in a second window:)
//   set API_BASE=http://localhost:8000
//   npx playwright test tests/pay.spec.js
const { test, expect, request } = require('@playwright/test');
const { startFakePaystack } = require('./fake-paystack');
const { shopper, placeOrder, getOrder, cancelOrders } = require('./helpers');

const BASE = process.env.API_BASE, SECRET = process.env.PAYSTACK_SECRET_KEY, PBASE = process.env.PAYSTACK_BASE_URL;

test.describe('Payments (PHP backend + fake Paystack)', () => {
  test.skip(!BASE || !SECRET || !PBASE, 'Set API_BASE, PAYSTACK_SECRET_KEY and PAYSTACK_BASE_URL (and start PHP with the last two) to run these');
  test.describe.configure({ mode: 'serial' });

  const stamp = Date.now(), made = [];
  let fake, ctx1, ctx2, a, b, orderA, orderB, refA, refB;
  const webhook = (body, sig) => ctx1.post('/api/payments/webhook.php', { data: Buffer.from(body), headers: { 'Content-Type': 'application/json', ...(sig ? { 'x-paystack-signature': sig } : {}) } });
  const event = (reference, amount, over = {}) => JSON.stringify({ event: 'charge.success', data: { reference, amount, currency: 'NGN', status: 'success', ...over } });

  test.beforeAll(async () => {
    fake = await startFakePaystack(PBASE, SECRET);
    ctx1 = await request.newContext({ baseURL: BASE });
    ctx2 = await request.newContext({ baseURL: BASE });
    a = await shopper(ctx1, `paya${stamp}@example.com`);
    b = await shopper(ctx2, `payb${stamp}@example.com`);
  });
  test.afterAll(async () => { cancelOrders(made); await ctx1?.dispose(); await ctx2?.dispose(); await fake?.close(); });

  test('health: online payment is switched on', async () => {
    expect(await (await ctx1.get('/api/health.php')).json()).toMatchObject({ ok: true, payments: true });
  });

  test('init: needs sign-in; only works for your own online-payment orders', async () => {
    const anon = await request.newContext({ baseURL: BASE });
    const t = (await (await anon.get('/api/auth/me.php')).json()).csrf;
    expect((await anon.post('/api/payments/init.php', { data: { order: 'MH12345678' } })).status()).toBe(403);                      // no CSRF token
    expect((await anon.post('/api/payments/init.php', { data: { order: 'MH12345678' }, headers: { 'X-CSRF-Token': t } })).status()).toBe(401);
    await anon.dispose();

    orderA = await placeOrder(a, 'transfer'); made.push(orderA.id);
    const cod = await placeOrder(a, 'cod'); made.push(cod.id);
    expect((await a.post('/api/payments/init.php', { order: 'MH00000000' })).status()).toBe(404);
    expect((await a.post('/api/payments/init.php', { order: 'abc' })).status()).toBe(422);
    const r = await a.post('/api/payments/init.php', { order: cod.id }); expect(r.status()).toBe(422); expect((await r.json()).error).toContain('delivery');
    expect((await b.post('/api/payments/init.php', { order: orderA.id })).status()).toBe(404);                                       // someone else's order
  });

  test('init: Paystack is asked for the order total in kobo, with the shopper e-mail and a return address', async () => {
    const r = await a.post('/api/payments/init.php', { order: orderA.id });
    expect(r.status(), await r.text()).toBe(200);
    const j = await r.json(); refA = j.reference;
    expect(refA).toMatch(new RegExp(`^${orderA.id}-[0-9a-f]{12}$`));
    expect(j.url).toBe(`${PBASE}/pay/${refA}`);
    const tx = fake.txs.get(refA);
    expect(tx).toMatchObject({ email: a.email, amount: orderA.total * 100, currency: 'NGN', channels: ['bank_transfer', 'bank'] });
    expect(tx.callback_url).toMatch(/\/checkout\.html$/);
    expect((await getOrder(a, orderA.id)).payStatus).toBe('pending');                  // asking to pay is not paying
  });

  test('verify: still pending until Paystack says success; strangers and bad references are refused', async () => {
    expect((await ctx1.get('/api/payments/verify.php?reference=nonsense')).status()).toBe(404);
    expect((await ctx1.get(`/api/payments/verify.php?reference=${orderA.id}-aaaaaaaaaaaa`)).status()).toBe(404);
    expect((await b.get(`/api/payments/verify.php?reference=${refA}`)).status()).toBe(404);                         // not b's payment
    const j = await (await a.get(`/api/payments/verify.php?reference=${refA}`)).json();
    expect(j.state).toBe('pending'); expect(j.order.payStatus).toBe('pending');
  });

  test('verify: after Paystack reports success the order is paid, and asking again changes nothing', async () => {
    fake.txs.get(refA).status = 'success';
    const j = await (await a.get(`/api/payments/verify.php?reference=${refA}`)).json();
    expect(j.state).toBe('paid'); expect(j.order).toMatchObject({ id: orderA.id, payStatus: 'paid' });
    expect((await (await a.get(`/api/payments/verify.php?reference=${refA}`)).json()).state).toBe('paid');
    expect((await getOrder(a, orderA.id)).payStatus).toBe('paid');
    const again = await a.post('/api/payments/init.php', { order: orderA.id });          // nothing left to pay
    expect(again.status()).toBe(409);
  });

  test('verify: a payment for the wrong amount is NOT accepted', async () => {
    orderB = await placeOrder(b, 'card'); made.push(orderB.id);
    refB = (await (await b.post('/api/payments/init.php', { order: orderB.id })).json()).reference;
    Object.assign(fake.txs.get(refB), { status: 'success', amount: 100 });               // Paystack "took" ₦1 instead of the total
    const j = await (await b.get(`/api/payments/verify.php?reference=${refB}`)).json();
    expect(j.state).toBe('failed'); expect(j.order.payStatus).toBe('pending');
    fake.txs.get(refB).amount = orderB.total * 100;                                      // put it right again for the webhook tests
    fake.txs.get(refB).status = 'abandoned';
  });

  test('webhook: rejects a missing or wrong signature', async () => {
    const body = event(refB, orderB.total * 100);
    expect((await webhook(body)).status()).toBe(401);
    expect((await webhook(body, 'deadbeef')).status()).toBe(401);
    expect((await webhook(body, fake.sign(body + ' '))).status()).toBe(401);             // signed a different body
    expect((await getOrder(b, orderB.id)).payStatus).toBe('pending');
  });

  test('webhook: a signed success pays the order; wrong amounts, other events and replays are handled', async () => {
    let body = event(refB, 100), r = await webhook(body, fake.sign(body));
    expect(r.status()).toBe(200); expect((await r.json()).result).toBe('mismatch');       // wrong amount: answered, but not accepted
    body = event(refB, orderB.total * 100, { currency: 'USD' }); r = await webhook(body, fake.sign(body));
    expect((await r.json()).result).toBe('mismatch');
    body = JSON.stringify({ event: 'transfer.success', data: { reference: refB } }); r = await webhook(body, fake.sign(body));
    expect(r.status()).toBe(200); expect((await r.json()).result).toBe('ignored');
    body = event('MH00000000-000000000000', 500000); r = await webhook(body, fake.sign(body));
    expect(r.status()).toBe(200); expect((await r.json()).result).toBe('unknown');
    expect((await getOrder(b, orderB.id)).payStatus).toBe('pending');

    body = event(refB, orderB.total * 100); r = await webhook(body, fake.sign(body));
    expect((await r.json()).result).toBe('paid');
    expect((await getOrder(b, orderB.id)).payStatus).toBe('paid');
    r = await webhook(body, fake.sign(body)); expect((await r.json()).result).toBe('already');   // Paystack retries: harmless
  });

  test('browser: place an order, pay on the (fake) Paystack page, land on the confirmation', async ({ browser }) => {
    const bctx = await browser.newContext({ baseURL: BASE });
    const s = await shopper(bctx.request, `payc${stamp}@example.com`);
    expect((await s.post('/api/cart/save.php', { items: [{ id: 119, qty: 1, selected: true }] })).status()).toBe(200);
    const page = await bctx.newPage();
    await page.goto('/checkout.html');
    await expect(page.locator('#cardForm')).toContainText('Paystack');                  // no card fields: the card is entered on Paystack's page
    await expect(page.locator('#cn')).toHaveCount(0);
    await page.check('#terms');
    await page.click('#place');
    await expect(page.locator('.emptycart h2')).toContainText('order is placed', { timeout: 25_000 });
    await expect(page.locator('.emptycart')).toContainText('Paid online');
    const orders = (await (await s.get('/api/orders/list.php')).json()).items;
    expect(orders).toHaveLength(1); made.push(orders[0].id);
    expect(orders[0]).toMatchObject({ pay: 'card', payStatus: 'paid' });
    await bctx.close();
  });
});
