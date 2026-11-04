// End-to-end test pass for MarketHub. Run:  npm test   (see README → Testing)
// The tests share ONE browser context and run in order: register → shop → checkout → account.
const { test, expect } = require('@playwright/test');

const BASE = process.env.E2E_BASE || 'http://localhost:5500';   // set E2E_BASE (+ E2E_EXPECT_MODE=api) to run the same journey against the PHP backend
const USER = { name: 'Test Shopper', email: 'shopper@example.com', phone: '08031234567', pw: 'Passw0rd!1', pw2: 'N3wPassw0rd!' };
let ctx, page, errors = [];

test.describe.configure({ mode: 'serial' });

test.beforeAll(async ({ browser }) => {
  ctx = await browser.newContext();
  page = await ctx.newPage();
  page.on('dialog', d => d.accept());                                      // confirm() boxes
  page.on('pageerror', e => errors.push('JS error: ' + e.message));
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const u = m.location().url || '';
    if (u && !u.startsWith(BASE)) return;                                  // ignore Google Fonts etc.
    if (/\/api\/auth\/(login|password)\.php$/.test(u)) return;               // a wrong password is meant to be refused (401)
    errors.push('console: ' + m.text());
  });
  page.on('response', r => {
    if (/\/api\/auth\/(login|password)\.php$/.test(r.url()) && r.status() === 401) return;   // expected in the wrong-password tests
    if (r.url().startsWith(BASE) && r.status() >= 400) errors.push(`HTTP ${r.status()}: ${r.url()}`);
  });
});
test.afterAll(async () => { await ctx.close(); });

const go = async u => { await page.goto(BASE + '/' + u); await page.locator('#site-header .head').waitFor(); };   // the page draws itself once the backend check is done
const naira = t => +(t.replace(/[^\d]/g, '') || 0);
const prices = async () => (await page.locator('#pgrid .card .price').allTextContents()).map(t => naira(t.split('₦')[1]));
const noErrors = () => { const e = errors.splice(0); expect(e, e.join('\n')).toEqual([]); };
const signIn = async (email, pw) => {
  await go('account.html');
  await page.fill('#fSign input[name=email]', email); await page.fill('#fSign input[name=password]', pw);
  await page.click('#fSign button.btn');
};

test('0. runs in the expected mode (demo storage or real backend)', async () => {
  await go('index.html');
  expect(await page.evaluate(() => window.MH.mode)).toBe(process.env.E2E_EXPECT_MODE || 'demo');   // stops a silent fallback to demo mode passing as a backend test
  noErrors();
});

test('1. every page loads without errors', async () => {
  const urls = ['index.html', 'category.html', 'category.html?c=phones', 'category.html?q=earbuds', 'category.html?brand=Apple', 'product.html?id=205', 'product.html?id=101',
    'cart.html', 'account.html', 'page.html?p=help', 'page.html?p=faq', 'page.html?p=about', 'page.html?p=terms', 'page.html?p=privacy', 'page.html?p=track',
    'page.html?p=contact', 'page.html?p=seller', 'page.html?p=sellerpolicies', 'page.html?p=payouts', 'page.html?p=soon'];
  for (const u of urls) {
    await go(u);
    await expect(page.locator('#site-header .head'), u).toBeVisible();
    await expect(page.locator('#site-footer .foot'), u).toBeVisible();
  }
  noErrors();
});

test('2. home: hero slider, flash countdown, sidebar', async () => {
  await go('index.html');
  await expect(page.locator('.slide')).toHaveCount(3);
  await expect(page.locator('.slide.on')).toHaveCount(1);
  const first = await page.locator('.slide.on h1').textContent();
  await page.click('.sl-nav.next');
  expect(await page.locator('.slide.on h1').textContent()).not.toBe(first);
  await page.click('.dots button >> nth=0');
  expect(await page.locator('.slide.on h1').textContent()).toBe(first);
  const s1 = await page.textContent('#s'); await page.waitForTimeout(1500);
  expect(await page.textContent('#s')).not.toBe(s1);
  expect(await page.locator('#flashRow .card').count()).toBeGreaterThanOrEqual(6);
  expect(await page.locator('#sideCats li:visible').count()).toBe(9);
  await page.click('#allCats'); expect(await page.locator('#sideCats li:visible').count()).toBe(12);
  await page.click('#sideCats >> text=Phones & Tablets');
  await expect(page).toHaveURL(/category\.html\?c=phones/);
  noErrors();
});

test('3. search, filters, sorting, pagination', async () => {
  await go('index.html');
  await page.fill('#searchInput', 'earbuds'); await page.click('#searchForm button');
  await expect(page).toHaveURL(/q=earbuds/);
  await expect(page.locator('#ptitle')).toContainText('Results for');
  const names = await page.locator('#pgrid .card h3').allTextContents();
  expect(names.length).toBeGreaterThan(3); names.forEach(n => expect(n).toMatch(/earbuds/i));

  await go('category.html?q=zzzz'); await expect(page.locator('#pgrid')).toContainText('No products match');

  await go('category.html?c=phones');
  await expect(page.locator('#ptitle')).toHaveText('Phones & Tablets');
  const total = await page.locator('#pgrid .card').count(); expect(total).toBeGreaterThan(0);
  await page.fill('#max', '150000'); await page.click('#ff .apply');
  (await prices()).forEach(p => expect(p).toBeLessThanOrEqual(150000));
  await page.click('#clear');
  await page.selectOption('#sort', 'asc');
  const asc = await prices(); expect(asc).toEqual([...asc].sort((a, b) => a - b));
  await page.selectOption('#sort', 'desc');
  const desc = await prices(); expect(desc).toEqual([...desc].sort((a, b) => b - a));

  await go('category.html');                                              // all products → more than one page
  await page.click('#pager [data-pg="2"]');
  await expect(page.locator('#showing')).toContainText('13');
  await page.click('#vList'); await expect(page.locator('#pgrid')).toHaveClass(/list/);

  await go('category.html?brand=Apple');
  const apple = await page.locator('#pgrid .card h3').allTextContents();
  expect(apple.length).toBeGreaterThan(0); apple.forEach(n => expect(n).toMatch(/^Apple/));
  noErrors();
});

test('4. product page: options, quantity, add to cart, wishlist', async () => {
  await go('product.html?id=205');
  await expect(page.locator('h1')).toContainText('Oraimo FreePods 4 ANC');
  await page.click('[data-color="Blue"]'); await expect(page.locator('#cname')).toHaveText('Blue');
  await page.click('[data-style="With Charging Case"]'); await expect(page.locator('#sname')).toHaveText('With Charging Case');
  await page.click('[data-pq="1"]'); await expect(page.locator('#qin')).toHaveValue('2');
  await page.fill('#qin', '99'); await page.locator('#qin').blur(); await expect(page.locator('#qin')).toHaveValue('12');   // capped at stock
  await page.fill('#qin', '2'); await page.locator('#qin').blur();
  await page.click('[data-tab="spec"]'); await expect(page.locator('#t-spec')).toBeVisible();
  await page.click('[data-tab="rev"]'); await expect(page.locator('#t-rev')).toBeVisible();
  await page.click('[data-wish="205"]'); await expect(page.locator('#wl')).toContainText('In Wishlist');
  await page.click('[data-wish="205"]'); await expect(page.locator('#wl')).toContainText('Add to Wishlist');
  await page.click('#addCart');
  await expect(page.locator('#cBadge')).toHaveText('2');
  expect(await page.locator('#similar .card').count()).toBe(5);
  await page.locator('#similar .card h3 >> nth=0').click();
  await expect(page).toHaveURL(/product\.html\?id=(?!205)\d+/);
  noErrors();
});

test('5. register: validation, then success', async () => {
  await go('account.html#register');
  await expect(page.locator('#fReg')).toBeVisible();
  await page.click('#fReg button.btn'); await expect(page.locator('#eReg')).not.toBeEmpty();
  await page.fill('#fReg input[name=name]', USER.name); await page.fill('#fReg input[name=email]', USER.email);
  await page.fill('#fReg input[name=phone]', USER.phone); await page.fill('#fReg input[name=password]', 'short');
  await page.click('#fReg button.btn'); await expect(page.locator('#eReg')).toContainText('Password needs');
  await page.fill('#fReg input[name=password]', USER.pw); await page.fill('#fReg input[name=confirm]', 'different1');
  await page.click('#fReg button.btn'); await expect(page.locator('#eReg')).toContainText('do not match');
  await page.fill('#fReg input[name=confirm]', USER.pw); await page.click('#fReg input[name=terms]');
  await page.click('#fReg button.btn');
  await expect(page.locator('#acc h1')).toContainText('Hi, Test');
  await expect(page.locator('.topbar')).toContainText('Hi, Test');
  noErrors();
});

test('6. sign out and sign in (wrong then right password)', async () => {
  await page.click('#accNav [data-signout]');
  await expect(page).toHaveURL(/index\.html$/);
  await expect(page.locator('.topbar')).toContainText('Sign In');
  await signIn(USER.email, 'WrongPass1'); await expect(page.locator('#eSign')).toContainText('Incorrect');
  await signIn(USER.email, USER.pw); await expect(page.locator('#acc h1')).toContainText('Hi, Test');
  noErrors();
});

test('7. cart: quantity, selection, promo, save for later', async () => {
  await go('product.html?id=3'); await page.click('#addCart');                     // fan from "Home Essentials Store"
  await go('cart.html');
  await expect(page.locator('#groups .cg')).toHaveCount(2);
  await page.click('.ci2:has-text("FreePods") [data-q="1"]');                       // FreePods: 2 → 3
  await expect(page.locator('#summary')).toContainText('₦112,400');                // 3 × 24,500 + 38,900
  await page.locator('.ci2:has-text("Binatone") input[data-sel]').uncheck();     // untick the fan
  await expect(page.locator('#summary')).toContainText('₦73,500');
  await page.locator('.ci2:has-text("Binatone") input[data-sel]').check();
  await page.fill('#promo', 'BADCODE'); await page.click('[data-apply]'); await expect(page.locator('#summary')).toContainText('Invalid promo');
  await page.fill('#promo', 'welcome10'); await page.click('[data-apply]');
  await expect(page.locator('#summary')).toContainText('₦104,900');                // 112,400 + 2,500 delivery − 10,000
  await page.click('.ci2:has-text("Binatone") [data-later]');
  await expect(page.locator('#savedBox')).toBeVisible(); await expect(page.locator('.ci2')).toHaveCount(1);
  await page.click('#savedBox [data-move]'); await expect(page.locator('.ci2')).toHaveCount(2);
  noErrors();
});

test('8. checkout: address, delivery, payment validation, place order', async () => {
  await page.click('[data-checkout]');
  await expect(page).toHaveURL(/checkout\.html/);
  await expect(page.locator('#sum')).toContainText('Order Summary');
  await page.click('#place'); await expect(page.locator('#toast')).toContainText('delivery address');
  await expect(page.locator('#addrForm')).toBeVisible();                            // first order → form open
  await expect(page.locator('#addrForm input[name=name]')).toHaveValue(USER.name);
  await page.fill('#addrForm input[name=phone]', USER.phone);
  await page.fill('#addrForm input[name=street]', '12 Test Street, Ikeja');
  await page.fill('#addrForm input[name=city]', 'Lagos'); await page.fill('#addrForm input[name=state]', 'Lagos State');
  await page.click('#addrForm button.btn'); await expect(page.locator('#addrList .addr')).toHaveCount(1);
  await page.check('input[value=express]'); await expect(page.locator('#sum')).toContainText('₦5,500');
  await page.check('input[value=standard]');
  await page.click('#place'); await expect(page.locator('#toast')).toContainText('valid card number');      // card is the default
  await page.fill('#cn', '4242424242424242'); await expect(page.locator('#cn')).toHaveValue('4242 4242 4242 4242');
  await page.fill('#ce', '1230'); await expect(page.locator('#ce')).toHaveValue('12/30');
  await page.fill('#cv', '12'); await page.click('#place'); await expect(page.locator('#toast')).toContainText('CVV');
  await page.check('input[value=cod]');
  await page.click('#place'); await expect(page.locator('#toast')).toContainText('Terms');
  await page.check('#terms'); await page.click('#place');
  await expect(page.locator('.emptycart h2')).toContainText('order is placed');
  await expect(page.locator('.emptycart')).toContainText(/#MH\d+/);
  await go('cart.html'); await expect(page.locator('#empty')).toBeVisible();
  noErrors();
});

test('9. account: orders, tracking timeline, reorder, track page', async () => {
  await go('account.html#orders');
  await expect(page.locator('.ocard')).toHaveCount(1);
  await page.click('.ocard a[href^="#orders/"]');
  await expect(page.locator('.tl > div')).toHaveCount(4);
  await expect(page.locator('#acc')).toContainText('Binatone');
  await page.click('[data-reorder]');
  await expect(page).toHaveURL(/cart\.html/); await expect(page.locator('.ci2')).toHaveCount(2);   // waits for the page to draw
  const id = await page.evaluate(() => JSON.parse(localStorage.getItem('mh_orders'))[0].id);
  await go('page.html?p=track');
  await page.fill('#trkForm input[name=id]', 'MH00000000'); await page.click('#trkForm button.btn'); await expect(page.locator('#trkErr')).toContainText("couldn't find");
  await page.fill('#trkForm input[name=id]', id.toLowerCase()); await page.click('#trkForm button.btn');
  await expect(page.locator('#trkOut')).toContainText(id);
  noErrors();
});

test('10. account: addresses (add, default, delete) and wishlist', async () => {
  await go('account.html#addresses');
  await expect(page.locator('.addr2')).toHaveCount(1);
  await page.click('[data-newaddr]');
  await page.fill('#afrm input[name=name]', 'Second Home'); await page.fill('#afrm input[name=phone]', '08099999999');
  await page.fill('#afrm input[name=street]', '5 Garki Road'); await page.fill('#afrm input[name=city]', 'Abuja');
  await page.click('#afrm button.btn'); await expect(page.locator('.addr2')).toHaveCount(2);
  await page.click('[data-defaddr]'); await expect(page.locator('.addr2 .tag.ok2')).toHaveCount(1);
  await page.locator('[data-deladdr] >> nth=0').click(); await expect(page.locator('.addr2')).toHaveCount(1);
  await expect(page.locator('.addr2 .tag.ok2')).toHaveCount(1);                    // a default always remains

  await go('category.html?c=phones'); await page.locator('.heart >> nth=0').click();
  await expect(page.locator('#wBadge')).toHaveText('1');
  await go('account.html#wishlist'); await expect(page.locator('.wgrid .card')).toHaveCount(1);
  const before = await page.textContent('#cBadge');
  await page.click('[data-wmove]'); await expect(page.locator('#acc')).toContainText('wishlist is empty');
  expect(+(await page.textContent('#cBadge'))).toBe(+before + 1);
  noErrors();
});

test('11. profile: update name, change password, sign in with the new one', async () => {
  await go('account.html#profile');
  await page.fill('#fProf input[name=name]', 'Test Shopper Jr'); await page.click('#fProf button.btn');
  await expect(page.locator('.who b')).toHaveText('Test Shopper Jr');
  await go('account.html#profile');
  await page.fill('#fPass input[name=old]', 'nope12345'); await page.fill('#fPass input[name=pw]', USER.pw2); await page.fill('#fPass input[name=pw2]', USER.pw2);
  await page.click('#fPass button.btn'); await expect(page.locator('#mPass')).toContainText('incorrect');
  await page.fill('#fPass input[name=old]', USER.pw); await page.click('#fPass button.btn'); await expect(page.locator('#mPass')).toContainText('updated');
  await page.click('#accNav [data-signout]');
  await signIn(USER.email, USER.pw); await expect(page.locator('#eSign')).toContainText('Incorrect');
  await signIn(USER.email, USER.pw2); await expect(page.locator('#acc h1')).toContainText('Hi, Test');
  noErrors();
});

test('12. info pages: FAQ search, contact, seller application', async () => {
  await go('page.html?p=faq');
  const all = await page.locator('#faqList .qa').count();
  await page.fill('#faqSearch', 'refund'); const hit = await page.locator('#faqList .qa:visible').count();
  expect(hit).toBeGreaterThan(0); expect(hit).toBeLessThan(all);
  await page.fill('#faqSearch', 'qqqqqq'); await expect(page.locator('#faqNone')).toBeVisible();
  await go('page.html?p=contact');
  await page.fill('#ctForm textarea[name=msg]', 'short'); await page.click('#ctForm button.btn'); await expect(page.locator('#ctErr')).toContainText('more');
  await page.fill('#ctForm textarea[name=msg]', 'Where is my order? It has been three days.'); await page.click('#ctForm button.btn');
  await expect(page.locator('#page')).toContainText('Message sent');
  await go('page.html?p=seller');
  await page.fill('#slForm input[name=biz]', 'Test Gadgets'); await page.fill('#slForm input[name=owner]', 'Test Owner');
  await page.fill('#slForm input[name=email]', 'seller@example.com'); await page.fill('#slForm input[name=phone]', '08011112222');
  await page.check('#slForm input[name=terms]'); await page.click('#slForm button.btn');
  await expect(page.locator('#page')).toContainText('Application received');
  await go('page.html?p=help#returns'); await expect(page.locator('#returns')).toBeVisible();
  await go('page.html?p=doesnotexist'); await expect(page.locator('#crumb')).toHaveText('Help Center');   // unknown page falls back
  noErrors();
});

test('13. responsive: no sideways scrolling on a phone', async () => {
  await page.setViewportSize({ width: 375, height: 800 });
  for (const u of ['index.html', 'category.html', 'product.html?id=205', 'cart.html', 'account.html#orders', 'page.html?p=help']) {
    await go(u);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(over, `${u} scrolls sideways by ${over}px`).toBeLessThanOrEqual(1);
  }
  await page.setViewportSize({ width: 1280, height: 720 });
});

test('14. accessibility basics: skip link, page titles, signed-out guard', async () => {
  await go('index.html'); await page.keyboard.press('Tab');
  await expect(page.locator('a.skip')).toBeFocused();
  for (const u of ['category.html?c=home', 'product.html?id=205', 'cart.html', 'page.html?p=terms']) { await go(u); expect((await page.title()).length).toBeGreaterThan(10); }
  await page.click('[data-act="logout"]');
  await expect(page.locator('#toast')).toContainText('Signed out');   // wait until the sign-out has finished
  await go('checkout.html'); await expect(page).toHaveURL(/account\.html\?next=checkout\.html/);
  noErrors();
});