# MarketHub

A responsive e-commerce storefront for the Nigerian market, built with plain **HTML, CSS and JavaScript** (no frameworks, no build step).
Browse products, search and filter, manage a cart, check out, track orders and manage an account.

> **Demo status:** this is a front-end project. Accounts, carts, orders and wishlists are saved in the browser (`localStorage`),
> and **no real payments are processed**. See [Roadmap](#roadmap) for the planned backend.

**Live demo:** _add your GitHub Pages link here_

![Home page](docs/screenshots/home.png)

## Features

- **Home:** rotating hero slider, flash sales with countdown, category tiles, top-selling and recommended products
- **Catalogue:** one listing page for every category, search and brand, with filters (category, price, brand, rating, discount, seller, delivery), sorting, grid/list view and pagination
- **Product page:** gallery, colour/style options, quantity, offers, specifications, sample reviews, similar and recently viewed products
- **Cart:** items grouped by seller, quantity controls, save for later, promo codes, live totals
- **Checkout:** saved addresses, delivery methods, card / bank transfer / pay on delivery, validation, order confirmation
- **Accounts:** register and sign in, order history with tracking timeline and reorder, addresses, wishlist, profile and password change
- **Info pages:** help centre, FAQ, track order, contact, about, terms, privacy and a seller application form
- Responsive layout, keyboard-friendly (skip link, focus styles), respects reduced-motion settings

## Tech stack

HTML5 · CSS3 (custom properties, grid, flexbox) · vanilla JavaScript (ES2020) · `localStorage` for demo persistence

## Getting started

No install needed. Serve the folder over HTTP (sign-in hashing needs `localhost` or `https`, so opening the file directly won't work):

```bash
# Option 1: VS Code → install "Live Server" → right-click index.html → Open with Live Server
# Option 2: Python
python -m http.server 5500
# then open http://localhost:5500
```

## Testing

An automated end-to-end suite ([Playwright](https://playwright.dev)) walks through the whole shopping journey in a real browser:
register, sign in, search and filter, product options, cart and promo codes, checkout, orders and tracking, addresses, wishlist, profile,
info pages, phone-width layout and keyboard access. It also fails on any JavaScript error or broken request.

```bash
npm install
npx playwright install chromium   # one-time browser download
npm test                          # runs headless and starts a local server for you
npm run test:headed               # watch the browser do it
npm run test:report               # open the HTML report after a run
```

Requires Node 18+. The tests run in order and share one browser session, so don't run a single test on its own.

## Project structure

```
markethub/
├─ index.html        Home
├─ category.html     Category / search / brand listing   (?c=phones  ?q=earbuds  ?brand=Apple)
├─ product.html      Product details                     (?id=205)
├─ cart.html         Shopping cart
├─ checkout.html     Checkout
├─ account.html      Sign in / register, and My Account
├─ page.html         Info pages                          (?p=help | faq | about | terms | privacy | track | contact | seller)
├─ css/style.css     Shared styles
├─ js/
│  ├─ app.js         Shared: header/footer, cart, wishlist, auth, home page
│  ├─ phones.js, accessories.js   Product data
│  └─ category.js, product.js, cart.js, checkout.js, account.js, login.js, pages.js   Page logic
├─ images/products/  Optional product photos (see README inside)
├─ tests/e2e.spec.js End-to-end tests (Playwright), config in playwright.config.js
└─ docs/screenshots/ README images
```

## Adding products

Add rows to `js/phones.js` / `js/accessories.js`, or to the `PRODUCTS` array in `js/app.js`. Product photos: drop `images/products/<id>.jpg` files in and set `USE_PHOTOS = true` in `js/app.js`.

## Demo limitations

- Data lives in each visitor's browser only, so nothing is shared between devices.
- Passwords are salted and hashed (PBKDF2) in the browser, which is **not** a substitute for server-side authentication.
- Card details are validated but never stored or sent; order tracking is simulated.
- Terms and Privacy pages are templates and need legal review before any real launch.

## Roadmap

- [ ] Backend (PHP + MySQL): users, products, orders, server-side sessions
- [ ] Payments via a hosted provider (e.g. Paystack)
- [ ] Real order status, password reset by email, seller dashboard
- [ ] Product photos and image optimisation
- [ ] Automated tests

## License

[MIT](LICENSE)
