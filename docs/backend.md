# Backend setup (PHP + MySQL) – Windows

The backend lives in `api/` (PHP) and `db/` (SQL). For local development, PHP's built-in server serves the website **and** the API from one address, so there are no cross-site cookie or CORS problems.

## 1. Install XAMPP (on D:, not C:)
1. Download XAMPP from apachefriends.org (choose a build with **PHP 8.1 or newer**).
2. Install to **`D:\xampp`**. In the components step keep only **MySQL**, **PHP** and **phpMyAdmin**; untick Apache, Perl, Tomcat, Mercury, FileZilla and Webalizer to save space.
3. Open the **XAMPP Control Panel** and click **Start** next to **MySQL**.

> XAMPP's "MySQL" is MariaDB, which is compatible with everything used here.

## 2. Create the database
In Command Prompt, from `D:\PROJECT\markethub`:

```
D:\xampp\mysql\bin\mysql.exe -u root < db\schema.sql
D:\xampp\mysql\bin\mysql.exe -u root markethub < db\seed.sql
```

(If you gave the `root` user a password, add `-p`.) Run the seed **once**. To start over, open phpMyAdmin (http://localhost/phpmyadmin), drop the `markethub` database and repeat both commands.

If you change products in `js/`, regenerate the seed with `node db/build-seed.js`.

## 3. Start the site + API
```
D:\xampp\php\php.exe -S localhost:8000
```
Leave that window open. Then check:

| URL | Expect |
|---|---|
| http://localhost:8000/api/health.php | `{"ok":true,"php":"8.x","db":true}` |
| http://localhost:8000/api/products/list.php | JSON with 56 products |
| http://localhost:8000/api/products/get.php?id=205 | the Oraimo FreePods 4 ANC |
| http://localhost:8000/index.html | the shop, now using the PHP API for accounts and products (see below) |

## How the site picks the backend
Every page first calls `api/health.php`. If PHP and the database answer, the site is in **API mode**: accounts (register, sign in, sign out, profile, password) and the product catalogue come from MySQL. If nothing answers (for example on GitHub Pages), it stays in **demo mode** and uses browser storage, exactly as before. Nothing to configure. To check which mode a page is in, open the browser console and type `MH.mode`.

**Signed in, in API mode**, the cart (with ticked items and chosen colour/style), the wishlist and saved addresses live in your account, so they follow you to any browser or phone. Guests keep using browser storage, and when a guest signs in their cart and wishlist are merged into the account. On sign-out the browser copy is cleared so the next person doesn't see it.

**Orders** (phase 4) are saved in your account too. When a signed-in shopper places an order, the browser sends only the choices (address, delivery, payment, note, promo code). The server builds the order from the **saved cart**, looks up the real prices, works out the delivery fee and discount, checks and takes the stock, and then empties the ticked cart items, all in one database transaction. Nothing the browser says about prices is trusted, and sending the order twice (double click, two tabs) creates only one.

Still in browser storage, even in API mode: "Saved for later" items.

## Online payments (Paystack) – phase 5
Card and bank-transfer orders are paid on **Paystack's own hosted page**, so card numbers never reach this site or your server. Pay on Delivery is unchanged. Online payment is **off until you add a key**; without one, card and transfer orders stay *pending* exactly as in phase 4.

**How it works**
1. The shopper places the order (the server prices it, as before). The browser then asks `api/payments/init.php` for a payment link. The server sends Paystack the order total (in kobo), the shopper's e-mail and a unique reference, and returns Paystack's page address.
2. The shopper pays on Paystack and is sent back to `checkout.html?reference=...`. That page calls `api/payments/verify.php`, which **asks Paystack directly** whether the payment succeeded and whether the amount and currency match the order. Only then is the order marked *paid*. (Nothing in the address bar is trusted.)
3. Separately, Paystack calls `api/payments/webhook.php` when a payment succeeds, so an order is still marked paid if the shopper closes the browser before coming back. Every webhook is checked against the `x-paystack-signature` header (an HMAC of the body made with your secret key). Step 2 and step 3 use the same function, so a payment is never counted twice.
4. A shopper who did not finish can use **Pay now** on the order in My Orders. If the amount Paystack reports ever differs from the order total, the order is **not** marked paid and the attempt is stored as `mismatch` in the `payments` table for you to look at.

**Set it up (test mode first)**
1. Create a free account at paystack.com and, in **Settings > API Keys & Webhooks**, copy your **Test Secret Key** (`sk_test_...`).
2. Copy `api/config.example.php` to `api/config.local.php` (if you have not already) and set `'paystack_secret' => 'sk_test_...'`. Alternatively set the environment variable `PAYSTACK_SECRET_KEY`.
3. If your database came from an earlier phase, run `D:\xampp\mysql\bin\mysql.exe -u root < db\schema.sql` again. It is safe to repeat and adds the new `payments` table. Do not run `seed.sql` again.
4. Restart `php -S`. `http://localhost:8000/api/health.php` should now say `"payments":true`.
5. Place an order with **Card**. On Paystack's test page use their test card (shown in their docs: *Test Payments*) and the order becomes **Paid**.

On `localhost` Paystack cannot reach your webhook, so only step 2 above works while you develop. That is fine: the return page confirms the payment by itself. On a live server also set the **Webhook URL** in the Paystack dashboard to `https://YOUR-SITE/api/payments/webhook.php`.

**Money rules to know**
- Amounts are Naira on the site and kobo on Paystack (x 100). Only NGN is accepted.
- Refunds are done by you in the Paystack dashboard. The admin page flags an order that was **cancelled after it was paid** with "refund on Paystack".
- Unpaid card/transfer orders are cancelled automatically after `unpaid_hours` (default 24) so their stock is not held forever. This runs whenever someone places an order and whenever you run `orders-cli.php expire`. A payment that arrives after the order was cancelled is still recorded, and the admin page flags it for a refund.
- Never put a **live** key (`sk_live_...`) anywhere but the live server's `config.local.php`.

## Admin page – phase 6
Open `admin.html` while signed in as an admin. Admins are the accounts whose e-mail is listed in `api/config.local.php`:
```php
'admin_emails' => ['you@example.com'],
```
Register that e-mail on the site first (or use an existing account), then reload: an **Admin** link appears in the top bar. You can search and filter orders, change an order's status (this feeds the customer's tracking timeline; cancelling returns stock), and mark a bank transfer as paid. The server checks the admin list on **every** request; hiding the link is only cosmetic. The command line (`orders-cli.php`) still works and does the same jobs.

## Orders: status, payments and stock
Customers see the real status in **My Orders** and on the **Track Order** page (placed, processing, shipped, delivered, cancelled). Until the admin tools of phase 6 exist, you change it from the command line (run from the project folder):
```
D:\xampp\php\php.exe db\orders-cli.php list
D:\xampp\php\php.exe db\orders-cli.php status MH12345678 shipped
D:\xampp\php\php.exe db\orders-cli.php paid MH12345678
D:\xampp\php\php.exe db\orders-cli.php restock 20
```
- `status` records the change with its date (that is what the timeline shows). Cancelling puts the items back in stock, and a cancelled order cannot be reopened.
- `paid` marks the payment as received by hand (for example a bank transfer you saw arrive). With Paystack switched on, card and transfer payments are recorded automatically; without a key those orders stay **pending**, and the confirmation page says so instead of claiming a payment.
- `expire 24` cancels card/transfer orders that are still unpaid after 24 hours (see Online payments).
- Stock goes down when an order is placed, so repeated test runs slowly use up the demo stock. `restock 20` tops every product that is below 20 back up.
- The public Track Order lookup needs both the order number and the account email, shows no address or phone, and blocks a visitor after 10 wrong tries in 15 minutes.

**Already have a database from phase 3 or 4?** Run `D:\xampp\mysql\bin\mysql.exe -u root < db\schema.sql` again. It is safe to repeat (it only creates what is missing) and adds the new `order_events` table. Do not run `seed.sql` again.

## 4. Run the API tests
```
set API_BASE=http://localhost:8000
npx playwright test tests/api.spec.js
```
No browser is needed for this file. The **payment tests** (`tests/pay.spec.js`) run against a *fake* Paystack that the test starts itself, so no real key or money is involved. Start PHP with two extra settings, then run them:
```
set PAYSTACK_SECRET_KEY=sk_test_local
set PAYSTACK_BASE_URL=http://127.0.0.1:9911
D:\xampp\php\php.exe -S localhost:8000
```
and in a second window (with the same two `set` lines):
```
set API_BASE=http://localhost:8000
npx playwright test tests/pay.spec.js
```
(One of those tests drives a real browser, so run `npx playwright install chromium` once.) The **admin tests** (`tests/admin.spec.js`) need an admin account: put `'admin_emails' => ['ci-admin@example.com']` in `config.local.php`, then `set ADMIN_EMAIL=ci-admin@example.com` before running them. Without these settings those two files are skipped.
One order test changes an order's status through `db/orders-cli.php`, so it needs the PHP command line. If `php` is not on your PATH, set `PHP_BIN` first (for example `set PHP_BIN=D:\xampp\php\php.exe`); without it that single test is skipped.

## Automatic testing on GitHub
`.github/workflows/test.yml` has two jobs that run on every push: **e2e** (the website in demo mode, in a real browser) and **api** (this backend). The api job starts a fresh MySQL 8 database,
checks every PHP file for syntax errors, loads `db/schema.sql` and `db/seed.sql`, starts PHP **with payments on** (pointed at a fake Paystack) and runs the API, payment and admin tests, then restarts PHP **without** a key and runs the whole browser journey (`tests/e2e.spec.js`) against the real PHP + MySQL site. If it fails, open the run in the repo's **Actions** tab:
the log shows the failing step and the PHP server log is printed at the end.

## Database login
By default the API uses XAMPP's defaults (`root`, no password). To change that, copy `api/config.example.php` to `api/config.local.php` and edit it. That file is git-ignored, so passwords never reach GitHub.

## Troubleshooting
- **`could not find driver`**: in `D:\xampp\php\php.ini` make sure the line `extension=pdo_mysql` has no `;` in front, then restart the PHP server.
- **`Access denied for user`**: your MySQL user or password differs from the defaults – set them in `api/config.local.php`.
- **MySQL won't start**: another MySQL uses port 3306; stop it or change XAMPP's port and set the same port in `config.local.php`.
- **Health check says `"db":false`**: MySQL isn't running, or the schema wasn't imported (step 2).

## Putting it on a real server (deploy)
You need hosting with **PHP 8.1+** (with the `pdo_mysql`, `mbstring` and ideally `curl` extensions), **MySQL or MariaDB**, and **HTTPS**. Ordinary shared hosting with cPanel is enough. The site is plain files, so there is no build step.

1. **Database.** In cPanel create a MySQL database and a user with a strong password, and give the user all privileges on it. In phpMyAdmin open that database and **import `db/schema.sql`**, then **`db/seed.sql`** once. (`schema.sql` begins with `CREATE DATABASE markethub` and `USE markethub`; on shared hosting delete those two lines first, because your database already exists under a different name.)
2. **Upload the files.** Upload the project to the site's folder (usually `public_html`) *without* `.git`, `node_modules` and `tests`. The root `.htaccess` already blocks those and the config files if they do get uploaded.
3. **Configure.** Create `api/config.local.php` on the server (copy `api/config.example.php`) and set:
   - `db`: the host, name, user and password from step 1;
   - `debug` => `false` (so errors never show details to visitors);
   - `site_url` => `'https://your-domain.com'` (where Paystack sends shoppers back);
   - `paystack_secret` => your **live** key (`sk_live_...`) once Paystack has approved your business, or keep the test key while you rehearse;
   - `admin_emails` => your e-mail.
4. **HTTPS.** Install the free certificate from your host (cPanel: *SSL/TLS Status* or *Let's Encrypt*), then uncomment the HTTPS redirect (and optionally the HSTS line) in the root `.htaccess`. Sign-in cookies, payments and the CSRF protection all assume HTTPS on a live site.
5. **Paystack.** In the dashboard set the **Webhook URL** to `https://your-domain.com/api/payments/webhook.php`.
6. **Check it.** Open `https://your-domain.com/api/health.php`: you should see `"ok":true,"db":true,"payments":true`. Then place a real small order with a real card and refund it from the Paystack dashboard.
7. **Scheduled clean-up.** Add a cron job (cPanel: *Cron Jobs*) that runs hourly: `php /home/YOUR-USER/public_html/db/orders-cli.php expire 24`. (The website also does this whenever an order is placed, so the cron job is optional.) `db/.htaccess` stops the file being opened from the web.
8. **Backups.** Turn on your host's automatic backups, or export the database from phpMyAdmin regularly. The database holds every order.

Things that are still **your** job before real customers arrive: the Terms and Privacy pages are templates and need legal review; order e-mails and password reset by e-mail are not built yet (the site shows messages on screen only); Paystack needs to approve your business before live payments work.

## Security notes
- Passwords are hashed with `password_hash()` (bcrypt); queries use prepared statements; sessions use HttpOnly, SameSite cookies; every POST needs a CSRF token; login is rate-limited per email.
- Payments: card details are typed on Paystack's page, never here. The amount charged is always the order total stored by the server; a payment is only accepted after the server has asked Paystack (or checked a signed webhook) and the amount and currency match. The Paystack secret key lives only in `config.local.php` or an environment variable, never in the browser or the repository.
- On a live server set `'debug' => false`, serve everything over **HTTPS**, and keep `api/config.local.php` out of the web root if you can.
- The GitHub Pages demo cannot run PHP. It stays a front-end demo; the PHP version needs a PHP + MySQL host (shared hosting works).

## Build plan
| Phase | What | Status |
|---|---|---|
| 1 | Database, API foundation, accounts (register/login/logout), product catalogue | ✅ done |
| 2 | Pages use the API: sign-in, register, profile, password and the product catalogue (automatic demo-mode fallback) | ✅ done |
| 3 | Cart, wishlist and addresses saved on the server (guest cart merges on sign-in) | ✅ done |
| 4 | Orders: create, history, tracking with real status; prices, promo codes, delivery fees and stock handled on the server | ✅ done |
| 5 | Payments through Paystack's hosted checkout (never handle card numbers yourself), verified on the server and by signed webhook | ✅ done |
| 6 | Admin page for orders, unpaid-order clean-up, deployment guide and server hardening | ✅ done |
| Later | E-mail (order confirmations, password reset), seller dashboard, product photos | ideas |