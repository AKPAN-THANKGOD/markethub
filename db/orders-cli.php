<?php
declare(strict_types=1);

/* Command-line helper for orders. Run it from the project folder, e.g. on Windows with XAMPP:
     D:\xampp\php\php.exe db\orders-cli.php list
     D:\xampp\php\php.exe db\orders-cli.php status MH12345678 shipped      (placed | processing | shipped | delivered | cancelled)
     D:\xampp\php\php.exe db\orders-cli.php paid MH12345678                (marks the payment as received, e.g. after a bank transfer)
     D:\xampp\php\php.exe db\orders-cli.php restock 20                     (every product with less than 20 in stock goes back up to 20)
     D:\xampp\php\php.exe db\orders-cli.php expire 24                      (cancels card/transfer orders still unpaid after 24 hours; run it from a scheduled task)
   Cancelling an order puts its items back in stock. The admin page (admin.html) does the same jobs in the browser.
   This file refuses to run from a web request. */
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }

require __DIR__ . '/../api/lib/order_admin.php';
$local = __DIR__ . '/../api/config.local.php';
$cfg = require (is_file($local) ? $local : __DIR__ . '/../api/config.example.php');
$d = $cfg['db'];
$pdo = new PDO("mysql:host={$d['host']};port={$d['port']};dbname={$d['name']};charset=utf8mb4", $d['user'], $d['pass'],
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);

$cmd = $argv[1] ?? '';
function fail(string $m): never { fwrite(STDERR, $m . PHP_EOL); exit(1); }

try {
    if ($cmd === 'list') {
        foreach ($pdo->query('SELECT o.public_id, o.status, o.payment_status, o.total, o.pay_method, o.created_at, u.email FROM orders o JOIN users u ON u.id = o.user_id ORDER BY o.id DESC LIMIT 30') as $r) {
            echo "{$r['public_id']}  {$r['status']}/{$r['payment_status']}  ₦{$r['total']}  {$r['pay_method']}  {$r['created_at']}  {$r['email']}" . PHP_EOL;
        }
    } elseif ($cmd === 'status') {
        $id = strtoupper($argv[2] ?? '');
        $from = set_order_status($pdo, $id, $argv[3] ?? '');
        echo "$id: $from -> {$argv[3]}" . PHP_EOL;
    } elseif ($cmd === 'paid') {
        $id = strtoupper($argv[2] ?? '');
        mark_order_paid($pdo, $id);
        echo "$id: payment marked as paid" . PHP_EOL;
    } elseif ($cmd === 'restock') {
        echo restock_products($pdo, (int)($argv[2] ?? 20)) . ' product(s) restocked to ' . (int)($argv[2] ?? 20) . PHP_EOL;
    } elseif ($cmd === 'expire') {
        $h = (int)($argv[2] ?? ($cfg['unpaid_hours'] ?? 24));
        if ($h < 1) fail('Give a number of hours, 1 or more');
        echo expire_unpaid_orders($pdo, $h) . " unpaid order(s) older than $h hour(s) cancelled" . PHP_EOL;
    } else {
        fail('Commands: list | status <order> <status> | paid <order> | restock [n] | expire [hours]');
    }
} catch (InvalidArgumentException $e) {
    fail($e->getMessage());
}
