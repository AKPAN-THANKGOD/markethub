<?php
declare(strict_types=1);
require __DIR__ . '/../lib/bootstrap.php';
require __DIR__ . '/../lib/orders.php';

// Public "Track my order" lookup:  track.php?id=MH12345678&email=you@example.com
// Needs BOTH the order number and the email on the account. Returns status and items only: no address, phone or note.
only('GET');
$id = strtoupper(query_str('id'));
$email = strtolower(query_str('email'));
$key = 'track:' . substr($_SERVER['REMOTE_ADDR'] ?? '', 0, 45);     // reuses the login throttle table, keyed per visitor address

$st = db()->prepare('SELECT COUNT(*) FROM login_attempts WHERE email = ? AND attempted_at > (NOW() - INTERVAL 15 MINUTE)');
$st->execute([$key]);
if ((int)$st->fetchColumn() >= 10) throw new HttpError(429, 'Too many attempts. Try again in a few minutes.');

$row = null;
if (preg_match('/^MH\d{8}$/', $id) && $email !== '' && mb_strlen($email) <= 190) {
    $st = db()->prepare('SELECT o.id, o.public_id, o.ship_name, o.ship_phone, o.ship_street, o.ship_city, o.ship_state, o.ship_zip, o.ship_method, o.pay_method, o.note, o.promo_code,
                                o.subtotal, o.delivery_fee, o.discount, o.total, o.status, o.payment_status, UNIX_TIMESTAMP(o.created_at) AS ts
                         FROM orders o JOIN users u ON u.id = o.user_id WHERE o.public_id = ? AND u.email = ?');
    $st->execute([$id, $email]);
    $row = $st->fetch() ?: null;
}
if (!$row) {
    db()->prepare('INSERT INTO login_attempts (email, ip) VALUES (?, ?)')->execute([$key, substr($_SERVER['REMOTE_ADDR'] ?? '', 0, 45)]);
    throw new HttpError(404, "We couldn't find an order with those details.");
}
json_out(['order' => orders_shape(db(), [$row], false)[0]]);
