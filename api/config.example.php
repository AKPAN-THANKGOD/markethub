<?php
// Copy this file to config.local.php (it is git-ignored) and put your real values there.
// If config.local.php is missing, these XAMPP defaults are used - fine on your own PC, never on a live server.
return [
    'db' => ['host' => '127.0.0.1', 'port' => 3306, 'name' => 'markethub', 'user' => 'root', 'pass' => ''],
    'debug' => true,            // show real error messages in API responses. MUST be false on a live server
    'allowed_origin' => '',     // leave empty when the website and the API are on the same domain (recommended)

    // Payments (phase 5). Leave the key empty to keep card and transfer orders "pending" (no online payment).
    // Use your TEST secret key (sk_test_...) while building and your LIVE key (sk_live_...) only on the real server.
    'paystack_secret' => '',
    'site_url' => '',           // public address of the website, e.g. 'https://shop.example.com' (no trailing slash). Empty = work it out from the request
    'unpaid_hours' => 24,       // an order that is still unpaid after this many hours is cancelled and its stock goes back (0 = never)

    // Admin page (admin.html): the e-mail addresses of the accounts that may manage orders.
    'admin_emails' => [],       // e.g. ['you@example.com']
];
