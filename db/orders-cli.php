<?php
declare(strict_types=1);

/* Command-line helper for orders (until the admin tools of phase 6 exist). Run it from the project folder, e.g. on Windows with XAMPP:
     D:\xampp\php\php.exe db\orders-cli.php list
     D:\xampp\php\php.exe db\orders-cli.php status MH12345678 shipped      (placed | processing | shipped | delivered | cancelled)
     D:\xampp\php\php.exe db\orders-cli.php paid MH12345678                (marks the payment as received, e.g. after a bank transfer)
     D:\xampp\php\php.exe db\orders-cli.php restock 20                     (every product with less than 20 in stock goes back up to 20)
   Cancelling an order puts its items back in stock. This file refuses to run from a web request. */
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }

$local = __DIR__ . '/../api/config.local.php';
$cfg = require (is_file($local) ? $local : __DIR__ . '/../api/config.example.php');
$d = $cfg['db'];
$pdo = new PDO("mysql:host={$d['host']};port={$d['port']};dbname={$d['name']};charset=utf8mb4", $d['user'], $d['pass'],
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);

const STATUSES = ['placed', 'processing', 'shipped', 'delivered', 'cancelled'];
$cmd = $argv[1] ?? '';
function fail(string $m): never { fwrite(STDERR, $m . PHP_EOL); exit(1); }
function order_row(PDO $pdo, string $id): array
{
    $st = $pdo->prepare('SELECT id, public_id, status, payment_status FROM orders WHERE public_id = ?');
    $st->execute([strtoupper($id)]);
    return $st->fetch() ?: fail("No order $id");
}

if ($cmd === 'list') {
    foreach ($pdo->query('SELECT o.public_id, o.status, o.payment_status, o.total, o.pay_method, o.created_at, u.email FROM orders o JOIN users u ON u.id = o.user_id ORDER BY o.id DESC LIMIT 30') as $r) {
        echo "{$r['public_id']}  {$r['status']}/{$r['payment_status']}  ₦{$r['total']}  {$r['pay_method']}  {$r['created_at']}  {$r['email']}" . PHP_EOL;
    }
} elseif ($cmd === 'status') {
    $o = order_row($pdo, $argv[2] ?? '');
    $to = $argv[3] ?? '';
    if (!in_array($to, STATUSES, true)) fail('Status must be one of: ' . implode(', ', STATUSES));
    if ($o['status'] === $to) fail("Order {$o['public_id']} is already $to");
    if ($o['status'] === 'cancelled') fail('A cancelled order cannot be reopened; ask the shopper to place a new one.');
    $pdo->beginTransaction();
    $pdo->prepare('UPDATE orders SET status = ? WHERE id = ?')->execute([$to, $o['id']]);
    $pdo->prepare('INSERT INTO order_events (order_id, status) VALUES (?, ?)')->execute([$o['id'], $to]);
    if ($to === 'cancelled') {
        $pdo->prepare('UPDATE products p JOIN order_items i ON i.product_id = p.id SET p.stock = p.stock + i.qty WHERE i.order_id = ?')->execute([$o['id']]);
    }
    $pdo->commit();
    echo "{$o['public_id']}: {$o['status']} -> $to" . PHP_EOL;
} elseif ($cmd === 'paid') {
    $o = order_row($pdo, $argv[2] ?? '');
    $pdo->prepare("UPDATE orders SET payment_status = 'paid' WHERE id = ?")->execute([$o['id']]);
    echo "{$o['public_id']}: payment marked as paid" . PHP_EOL;
} elseif ($cmd === 'restock') {
    $n = (int)($argv[2] ?? 20);
    if ($n < 1 || $n > 10000) fail('Give a number between 1 and 10000');
    $st = $pdo->prepare('UPDATE products SET stock = ? WHERE stock < ?');
    $st->execute([$n, $n]);
    echo $st->rowCount() . " product(s) restocked to $n" . PHP_EOL;
} else {
    fail('Commands: list | status <order> <status> | paid <order> | restock [n]');
}
