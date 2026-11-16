<?php
declare(strict_types=1);
require __DIR__ . '/../lib/bootstrap.php';
require __DIR__ . '/../lib/admin.php';

// Admin: the latest orders, newest first.   orders.php?status=placed&q=MH1234   (status and q are optional; q matches the order number, e-mail or name)
only('GET');
require_admin();
$where = []; $args = [];
$status = query_str('status');
if ($status !== '') {
    if (!in_array($status, ['placed', 'processing', 'shipped', 'delivered', 'cancelled'], true)) throw new HttpError(422, 'Unknown status.');
    $where[] = 'o.status = ?'; $args[] = $status;
}
if (query_str('pay') === 'unpaid') $where[] = "o.payment_status = 'pending' AND o.pay_method <> 'cod' AND o.status <> 'cancelled'";
$q = query_str('q');
if ($q !== '') {
    if (mb_strlen($q) > 100) throw new HttpError(422, 'Search is too long.');
    $like = '%' . addcslashes($q, '%_\\') . '%';
    $where[] = '(o.public_id LIKE ? OR u.email LIKE ? OR o.ship_name LIKE ?)'; array_push($args, $like, $like, $like);
}
$st = db()->prepare('SELECT o.public_id, o.status, o.payment_status, o.pay_method, o.ship_method, o.ship_name, o.ship_city, o.total, UNIX_TIMESTAMP(o.created_at) AS ts, u.email,
                            (SELECT COALESCE(SUM(i.qty), 0) FROM order_items i WHERE i.order_id = o.id) AS units
                     FROM orders o JOIN users u ON u.id = o.user_id'
    . ($where ? ' WHERE ' . implode(' AND ', $where) : '') . ' ORDER BY o.id DESC LIMIT 100');
$st->execute($args);
json_out(['items' => array_map(fn(array $r): array => [
    'id' => $r['public_id'], 'date' => gmdate('c', (int)$r['ts']), 'email' => $r['email'], 'name' => $r['ship_name'], 'city' => $r['ship_city'],
    'status' => $r['status'], 'payStatus' => $r['payment_status'], 'pay' => $r['pay_method'], 'ship' => $r['ship_method'],
    'total' => (int)$r['total'], 'units' => (int)$r['units'],
    'refundDue' => $r['status'] === 'cancelled' && $r['payment_status'] === 'paid',     // cancelled after the money arrived: pay it back from the Paystack dashboard
], $st->fetchAll())]);
