/* Static pages (Help, FAQ, About, Terms, Privacy, Track, Contact). Each HTML file sets <body data-page="..."> */
const esc = Auth.esc;
const qa = ([q, a]) => `<details class="qa"><summary>${q}</summary><p>${a}</p></details>`;
const hero = (t, s) => `<div class="phero"><h1>${t}</h1><p>${s}</p></div>`;
const legal = (note, secs) => `${hero(note[0], note[1])}<div class="box prose"><p class="warn">⚠️ Template text for development. Have it reviewed by a lawyer before launch.</p>
  ${secs.map(([id, h, body]) => `<h2 id="${id}">${h}</h2>${body.map(p => `<p>${p}</p>`).join('')}`).join('')}</div>`;

/* shared with the checkout / cart rules */
const SHIPPING = [
  ['How much does delivery cost?', 'Standard Delivery is ₦2,500 per seller and takes 2–4 business days. Express Delivery is ₦5,500 and takes 1–2 business days. Pickup Station is free and takes 1 business day. Delivery is free for MarketHub Official items and on orders above ₦25,000 where shown.'],
  ['Why does my order arrive in several parcels?', 'Items sold by different sellers ship separately, so delivery times and fees can vary by seller. You can see this at checkout before you pay.'],
  ['Can I change my delivery address?', 'Yes, until the order is shipped. Open My Account → Orders, or contact support with your order number.']
];
const RETURNS = [
  ['What is the return policy?', 'Most items can be returned within 7 days of delivery if they are unused and in their original packaging. Some categories (for example groceries and personal-care items) are not returnable.'],
  ['How do I start a return?', 'Contact support with your order number and the reason for the return. We will arrange a pickup or tell you where to drop the item off.'],
  ['When will I get my refund?', 'Refunds go back to your original payment method within 5–7 business days after we receive and check the item.']
];
const PAYMENTS = [
  ['Which payment methods can I use?', 'You can pay by debit or credit card (Visa, Mastercard, Verve), by bank transfer to a virtual account, or with Pay on Delivery where available.'],
  ['Where is Pay on Delivery available?', 'Pay on Delivery is available in Lagos, Abuja and Port Harcourt for orders under ₦300,000. Pay with cash or POS when your order arrives.'],
  ['Is my card information safe?', 'Card payments are processed over an encrypted connection. MarketHub does not keep your full card details.']
];
const ACCOUNT = [
  ['How do I create an account?', 'Choose Register at the top of any page, enter your name, email, phone number and a password with at least 8 characters including letters and numbers.'],
  ['I forgot my password.', 'Password reset by email is coming soon. Contact support and we will help you get back in.'],
  ['How do I track my order?', 'Use the Track Order page with your order number and email, or open My Account → Orders to see every order and its status.']
];
const FAQ = [
  ['How do I place an order?', 'Add items to your cart, open the cart, tick the items you want, then choose Proceed to Checkout. Pick an address, a delivery method and a payment method, then place your order.'],
  ['Do I need an account to buy?', 'Yes. An account lets us save your addresses and show your order history.'],
  ...SHIPPING.slice(0, 1), ...PAYMENTS.slice(0, 2), ...RETURNS,
  ['How do I use a promo code?', 'Enter your code in the "Have a promo code?" box in your cart or at checkout, then choose Apply.'],
  ['Are the products genuine?', 'Items marked Official Store come directly from the brand or its authorised store. Every seller on MarketHub is verified.'],
  ['How do I contact support?', 'Call 0700-MARKETHUB any time, or send a message from the Contact Us page.']
];

const STAGES = [['Order placed', 0], ['Processing', 1], ['Shipped', 3], ['Delivered', 6]];   // DEMO timing in minutes – use real status from your backend
const dt = d => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

const PAGES = {
  help: () => `${hero('How can we help?', 'Find quick answers about orders, delivery, payments and returns.')}
    <div class="topics">${[['shipping', '🚚', 'Shipping & Delivery'], ['returns', '🔄', 'Returns & Refunds'], ['payments', '💳', 'Payments'], ['account', '👤', 'Account & Orders']].map(([id, i, t]) => `<a href="#${id}" class="box"><span>${i}</span><b>${t}</b></a>`).join('')}</div>
    ${[['shipping', 'Shipping & Delivery', SHIPPING], ['returns', 'Returns & Refunds', RETURNS], ['payments', 'Payments', PAYMENTS], ['account', 'Account & Orders', ACCOUNT]].map(([id, t, l]) => `<section class="box" id="${id}"><h2>${t}</h2>${l.map(qa).join('')}</section>`).join('')}
    <div class="box cta"><b>Still need help?</b> Call <b>0700-MARKETHUB</b> (24/7) or <a href="page.html?p=contact" class="link">send us a message →</a></div>`,

  faq: () => `${hero('Frequently Asked Questions', 'Search our most common questions.')}
    <input id="faqSearch" class="bigsearch" placeholder="Search questions…" aria-label="Search FAQ"><div id="faqList" class="box">${FAQ.map(qa).join('')}</div><p class="empty" id="faqNone" hidden>No matching questions. <a href="page.html?p=contact" class="link">Ask us →</a></p>`,

  about: () => `${hero('About MarketHub', "Nigeria's marketplace for everything you need.")}
    <div class="box prose"><p>MarketHub connects shoppers with verified sellers and official brand stores, with fair prices, fast delivery and easy returns. From phones and electronics to fashion and home essentials, we want shopping online to feel simple and safe.</p></div>
    <div class="stats">${[['Verified', 'sellers & official stores'], ['7-day', 'easy return policy'], ['24/7', 'customer support']].map(([b, s]) => `<div><b>${b}</b><span>${s}</span></div>`).join('')}</div>
    <div class="box prose"><h2>What we stand for</h2><p><b>Trust.</b> Official stores and verified sellers. <b>Value.</b> Daily deals and flash sales. <b>Convenience.</b> Pay by card, transfer or on delivery.</p></div>
    <div class="box prose" id="careers"><h2>Careers</h2><p>We're not hiring through this site yet. Check back soon, or <a href="page.html?p=contact" class="link">get in touch</a>.</p></div>`,

  terms: () => legal(['Terms & Conditions', 'Last updated: October 2026'], [
    ['use', '1. Using MarketHub', ['By using this site and placing orders you agree to these terms. You must be 18 or older, or have a parent or guardian\'s permission, to create an account.']],
    ['orders', '2. Orders and prices', ['Prices are shown in Naira and include applicable taxes. An order is confirmed once payment is accepted, or for Pay on Delivery once we confirm it with you. We may cancel orders affected by pricing or stock errors and will refund any payment.']],
    ['delivery', '3. Delivery and returns', ['Delivery times are estimates. Returns are accepted within 7 days for eligible items, as described in the Help Center.']],
    ['account', '4. Your account', ['Keep your password private. You are responsible for activity on your account. Tell us straight away if you think it has been misused.']],
    ['law', '5. Changes and governing law', ['We may update these terms from time to time. These terms are governed by the laws of the Federal Republic of Nigeria.']]]),

  privacy: () => legal(['Privacy Policy', 'Last updated: October 2026'], [
    ['collect', '1. Information we collect', ['Account details (name, email, phone), delivery addresses, order history and basic usage information such as pages visited.']],
    ['use', '2. How we use it', ['To process and deliver orders, provide support, prevent fraud and improve the site. We do not sell your personal information.']],
    ['share', '3. Who we share it with', ['Sellers and delivery partners receive only what they need to fulfil your order. Payment providers handle card payments.']],
    ['cookies', '4. Cookies and local storage', ['We use your browser\'s storage to keep you signed in, remember your cart and wishlist, and save preferences. You can clear this at any time in your browser settings.']],
    ['rights', '5. Your choices', ['You can update your details in My Account, or contact us to ask for your data to be corrected or deleted.']]]),

  track: () => `${hero('Track your order', 'Enter your order number and the email you used at checkout.')}
    <form id="trkForm" class="box fgrid center" novalidate><label>Order number<input name="id" placeholder="e.g. MH12345678" autocomplete="off"></label>
      <label>Email address<input name="email" type="email" placeholder="you@example.com"></label><p class="msg redt" id="trkErr"></p><button class="btn big-btn">Track Order</button></form>
    <div id="trkOut"></div>`,

  seller: () => `${hero('Become a Seller', 'Reach shoppers across Nigeria. Tell us about your business and we will be in touch.')}
    <form id="slForm" class="box fgrid center" novalidate><label>Business name<input name="biz"></label><label>Owner's full name<input name="owner"></label>
      <label>Email<input name="email" type="email"></label><label>Phone<input name="phone" inputmode="tel"></label>
      <label>Main category<select name="cat">${CATS.map(c => `<option>${c[1]}</option>`).join('')}</select></label><label>City<input name="city"></label>
      <label>What do you sell?<textarea name="about" rows="4" maxlength="600"></textarea></label>
      <label class="chk"><input type="checkbox" name="terms"> I agree to the <a href="page.html?p=sellerpolicies" class="link" target="_blank" rel="noopener">Seller Policies</a></label>
      <p class="msg redt" id="slErr"></p><button class="btn big-btn">Submit application</button></form>`,
  sellerpolicies: () => legal(['Seller Policies', 'Last updated: October 2026'], [
    ['listing', '1. Listings', ['Products must be genuine, accurately described and legal to sell in Nigeria. Prices are shown in Naira.']],
    ['fulfil', '2. Orders and delivery', ['Sellers must confirm and dispatch orders promptly and use the delivery options shown at checkout.']],
    ['returns', '3. Returns', ['Sellers must accept returns that meet the 7-day return policy.']]]),
  payouts: () => legal(['Payout Info', 'How sellers get paid'], [
    ['schedule', 'Payout schedule', ['Payout timing, fees and commission will be shown in your seller dashboard once seller accounts launch.']]]),
  soon: () => `${hero('Coming soon', "We're still building this page.")}<div class="box empty2"><div class="big">🚧</div><p>Check back soon.</p><a href="index.html" class="btn">Back to Home</a></div>`,
  contact: () => `${hero('Contact us', "We're here to help, 24/7.")}
    <div class="grid2"><form id="ctForm" class="box fgrid" novalidate><label>Your name<input name="name"></label><label>Email<input name="email" type="email"></label>
      <label>Topic<select name="topic"><option>Order or delivery</option><option>Returns & refunds</option><option>Payment</option><option>My account</option><option>Something else</option></select></label>
      <label>Message<textarea name="msg" rows="5" maxlength="1000"></textarea></label><p class="msg redt" id="ctErr"></p><button class="btn big-btn">Send message</button></form>
      <div class="box prose"><h3>Other ways to reach us</h3><p>📞 <b>0700-MARKETHUB</b> (24/7)</p><p>✉️ support@markethub.example <span class="mut">(placeholder)</span></p><p>🕘 Live chat: coming soon</p><p>Looking for quick answers? Try the <a href="page.html?p=faq" class="link">FAQ</a>.</p></div></div>`
};

const TITLES = { help: 'Help Center', faq: 'FAQ', about: 'About Us', terms: 'Terms & Conditions', privacy: 'Privacy Policy', track: 'Track Order', contact: 'Contact Us',
  seller: 'Become a Seller', sellerpolicies: 'Seller Policies', payouts: 'Payout Info', soon: 'Coming Soon' };
const key = PAGES[new URLSearchParams(location.search).get('p')] ? new URLSearchParams(location.search).get('p') : 'help';   // page.html?p=faq
document.title = TITLES[key] + ' – MarketHub'; $('#crumb').textContent = TITLES[key];
$('#page').innerHTML = PAGES[key]();
if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();

/* FAQ search */
$('#faqSearch')?.addEventListener('input', e => {
  const q = e.target.value.toLowerCase().trim(); let n = 0;
  $$('#faqList .qa').forEach(d => { const hit = !q || d.textContent.toLowerCase().includes(q); d.hidden = !hit; n += hit; });
  $('#faqNone').hidden = n > 0;
});

/* Track order: looks the order up in this browser's saved orders (demo) */
$('#trkForm')?.addEventListener('submit', e => {
  e.preventDefault();
  const f = e.target, id = f.elements.namedItem('id').value.trim().toUpperCase(), em = f.elements.namedItem('email').value.trim().toLowerCase();
  const err = $('#trkErr'); err.textContent = ''; $('#trkOut').innerHTML = '';
  if (!id || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) return err.textContent = 'Enter your order number and a valid email.';
  const o = store.get('mh_orders', []).find(x => x.id === id && x.user === em);
  if (!o) return err.textContent = "We couldn't find an order with those details.";
  const m = (Date.now() - new Date(o.date)) / 60000, cur = STAGES.reduce((a, [, t], i) => m >= t ? i : a, 0);
  $('#trkOut').innerHTML = `<div class="box"><div class="oh2"><h2>Order #${esc(o.id)}</h2><span class="st st${cur}">${STAGES[cur][0]}</span></div><p class="mut">Placed on ${dt(o.date)} · ${o.items.reduce((a, i) => a + i.q, 0)} item(s) · ${fmt(o.total)}</p>
    <div class="tl">${STAGES.map(([t, mm], i) => `<div class="${i < cur ? 'done' : i === cur ? 'cur' : ''}"><i>${i < cur ? '✓' : i + 1}</i><b>${t}</b><small>${i <= cur ? dt(+new Date(o.date) + mm * 60000) : 'Pending'}</small></div>`).join('')}</div></div>`;
});
const prefill = new URLSearchParams(location.search).get('id'), me = Auth.user();
if ($('#trkForm')) { if (prefill) $('#trkForm').elements.namedItem('id').value = prefill; if (me) $('#trkForm').elements.namedItem('email').value = me.email; }
if ($('#ctForm') && me) { $('#ctForm').elements.namedItem('name').value = me.name; $('#ctForm').elements.namedItem('email').value = me.email; }

/* Contact form: saved in this browser only (demo) – connect to your backend/email service */
$('#ctForm')?.addEventListener('submit', e => {
  e.preventDefault();
  const f = e.target, v = k => f.elements.namedItem(k).value.trim(), err = $('#ctErr');
  if (v('name').length < 2) return err.textContent = 'Enter your name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v('email'))) return err.textContent = 'Enter a valid email address.';
  if (v('msg').length < 10) return err.textContent = 'Please write a little more (at least 10 characters).';
  store.set('mh_messages', [{ name: v('name'), email: v('email'), topic: v('topic'), msg: v('msg'), date: new Date().toISOString() }, ...store.get('mh_messages', [])]);
  f.outerHTML = '<div class="box empty2"><div class="big">✅</div><h2>Message sent</h2><p>Thanks! Our team will reply by email.</p><a href="index.html" class="btn">Back to Home</a></div>';
});

/* Seller application: saved in this browser only (demo) – send to your backend later */
$('#slForm')?.addEventListener('submit', e => {
  e.preventDefault();
  const f = e.target, v = k => f.elements.namedItem(k).value.trim(), err = $('#slErr');
  if (v('biz').length < 2 || v('owner').length < 2) return err.textContent = 'Enter your business and owner names.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v('email'))) return err.textContent = 'Enter a valid email address.';
  if (!/^[0-9+\s]{10,16}$/.test(v('phone'))) return err.textContent = 'Enter a valid phone number.';
  if (!f.elements.namedItem('terms').checked) return err.textContent = 'Please accept the Seller Policies.';
  store.set('mh_sellers', [{ biz: v('biz'), owner: v('owner'), email: v('email'), phone: v('phone'), cat: v('cat'), city: v('city'), about: v('about'), date: new Date().toISOString() }, ...store.get('mh_sellers', [])]);
  f.outerHTML = '<div class="box empty2"><div class="big">✅</div><h2>Application received</h2><p>Thanks! We will review it and contact you by email.</p><a href="index.html" class="btn">Back to Home</a></div>';
});