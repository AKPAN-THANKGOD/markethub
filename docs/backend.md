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

## Orders: status, payments and stock
Customers see the real status in **My Orders** and on the **Track Order** page (placed, processing, shipped, delivered, cancelled). Until the admin tools of phase 6 exist, you change it from the command line (run from the project folder):
```
D:\xampp\php\php.exe db\orders-cli.php list
D:\xampp\php\php.exe db\orders-cli.php status MH12345678 shipped
D:\xampp\php\php.exe db\orders-cli.php paid MH12345678
D:\xampp\php\php.exe db\orders-cli.php restock 20
```
- `status` records the change with its date (that is what the timeline shows). Cancelling puts the items back in stock, and a cancelled order cannot be reopened.
- `paid` marks the payment as received (for example after you see a bank transfer arrive). Real card payments come in phase 5; until then card and transfer orders stay **pending**, and the confirmation page says so instead of claiming a payment.
- Stock goes down when an order is placed, so repeated test runs slowly use up the demo stock. `restock 20` tops every product that is below 20 back up.
- The public Track Order lookup needs both the order number and the account email, shows no address or phone, and blocks a visitor after 10 wrong tries in 15 minutes.

**Already have a database from phase 3?** Run `D:\xampp\mysql\bin\mysql.exe -u root < db\schema.sql` again. It is safe to repeat (it only creates what is missing) and adds the new `order_events` table. Do not run `seed.sql` again.

## 4. Run the API tests (no browser needed)
```
set API_BASE=http://localhost:8000
npx playwright test tests/api.spec.js
```
One order test changes an order's status through `db/orders-cli.php`, so it needs the PHP command line. If `php` is not on your PATH, set `PHP_BIN` first (for example `set PHP_BIN=D:\xampp\php\php.exe`); without it that single test is skipped.

## Automatic testing on GitHub
`.github/workflows/test.yml` has two jobs that run on every push: **e2e** (the website in demo mode, in a real browser) and **api** (this backend). The api job starts a fresh MySQL 8 database,
checks every PHP file for syntax errors, loads `db/schema.sql` and `db/seed.sql`, starts PHP, runs `tests/api.spec.js`, and then runs the whole browser journey (`tests/e2e.spec.js`) against the real PHP + MySQL site. If it fails, open the run in the repo's **Actions** tab:
the log shows the failing step and the PHP server log is printed at the end.

## Database login
By default the API uses XAMPP's defaults (`root`, no password). To change that, copy `api/config.example.php` to `api/config.local.php` and edit it. That file is git-ignored, so passwords never reach GitHub.

## Troubleshooting
- **`could not find driver`**: in `D:\xampp\php\php.ini` make sure the line `extension=pdo_mysql` has no `;` in front, then restart the PHP server.
- **`Access denied for user`**: your MySQL user or password differs from the defaults – set them in `api/config.local.php`.
- **MySQL won't start**: another MySQL uses port 3306; stop it or change XAMPP's port and set the same port in `config.local.php`.
- **Health check says `"db":false`**: MySQL isn't running, or the schema wasn't imported (step 2).

## Security notes
- Passwords are hashed with `password_hash()` (bcrypt); queries use prepared statements; sessions use HttpOnly, SameSite cookies; every POST needs a CSRF token; login is rate-limited per email.
- On a live server set `'debug' => false`, serve everything over **HTTPS**, and keep `api/config.local.php` out of the web root if you can.
- The GitHub Pages demo cannot run PHP. It stays a front-end demo; the PHP version needs a PHP + MySQL host (shared hosting works).

## Build plan
| Phase | What | Status |
|---|---|---|
| 1 | Database, API foundation, accounts (register/login/logout), product catalogue | ✅ done |
| 2 | Pages use the API: sign-in, register, profile, password and the product catalogue (automatic demo-mode fallback) | ✅ done |
| 3 | Cart, wishlist and addresses saved on the server (guest cart merges on sign-in) | ✅ done |
| 4 | Orders: create, history, tracking with real status; prices, promo codes, delivery fees and stock handled on the server | ✅ done |
| 5 | Payments through Paystack's hosted checkout (never handle card numbers yourself) | next |
| 6 | Deploy to a PHP + MySQL host over HTTPS; admin tools for orders and sellers | |