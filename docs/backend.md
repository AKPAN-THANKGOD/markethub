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
| http://localhost:8000/index.html | the shop (still using browser storage for now) |

## 4. Run the API tests (no browser needed)
```
set API_BASE=http://localhost:8000
npx playwright test tests/api.spec.js
```

## Automatic testing on GitHub
`.github/workflows/test.yml` has two jobs that run on every push: **e2e** (the website in a real browser) and **api** (this backend). The api job starts a fresh MySQL 8 database,
checks every PHP file for syntax errors, loads `db/schema.sql` and `db/seed.sql`, starts PHP, and runs `tests/api.spec.js`. If it fails, open the run in the repo's **Actions** tab:
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
| 2 | Connect the pages: sign-in and products read from the API (with a switch back to demo mode) | next |
| 3 | Addresses, wishlist and cart saved on the server | |
| 4 | Orders: create, history, tracking with real status; promo codes checked on the server | |
| 5 | Payments through Paystack's hosted checkout (never handle card numbers yourself) | |
| 6 | Deploy to a PHP + MySQL host over HTTPS; admin tools for orders and sellers | |