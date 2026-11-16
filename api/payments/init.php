<?php
declare(strict_types=1);
require __DIR__ . '/../lib/bootstrap.php';
require __DIR__ . '/../lib/orders.php';
require __DIR__ . '/../lib/payments.php';

// Starts (or restarts) the online payment for one of the signed-in shopper's own orders and returns the Paystack page to send them to.
// Body: {"order":"MH12345678"}   ->   {"url":"https://checkout.paystack.com/...","reference":"MH12345678-ab12cd34ef56"}
// The amount is the order's total as stored by the server; nothing about money comes from the browser.
only('POST');
require_csrf();
$u = require_login();
if (!payments_enabled()) throw new HttpError(503, 'Online payment is not available right now.');
$id = strtoupper(text(body(), 'order', 10, 10, 'an order number'));
if (!preg_match('/^MH\d{8}$/', $id)) throw new HttpError(404, 'Order not found.');

$pdo = db();
$st = $pdo->prepare('SELECT id, public_id, pay_method, total, status, payment_status FROM orders WHERE public_id = ? AND user_id = ?');
$st->execute([$id, $u['id']]);
$o = $st->fetch();
if (!$o) throw new HttpError(404, 'Order not found.');
if (!in_array($o['pay_method'], ONLINE_PAY_METHODS, true)) throw new HttpError(422, 'This order is paid on delivery.');
if ($o['status'] === 'cancelled') throw new HttpError(409, 'This order was cancelled. Please place a new one.');
if ($o['payment_status'] !== 'pending') throw new HttpError(409, $o['payment_status'] === 'paid' ? 'This order is already paid.' : 'This order cannot be paid online.');

$total = (int)$o['total'];
if ($total <= 0) {                                              // a promo code covered everything: nothing to charge
    $pdo->prepare("UPDATE orders SET payment_status = 'paid' WHERE id = ? AND payment_status = 'pending'")->execute([$o['id']]);
    json_out(['paid' => true]);
}

$ref = $o['public_id'] . '-' . bin2hex(random_bytes(6));
$pdo->prepare('INSERT INTO payments (order_id, reference, amount_kobo) VALUES (?, ?, ?)')->execute([$o['id'], $ref, $total * 100]);

$res = paystack_call('POST', '/transaction/initialize', [
    'email' => $u['email'],
    'amount' => $total * 100,                                   // Paystack counts in kobo
    'currency' => 'NGN',
    'reference' => $ref,
    'callback_url' => site_url() . '/checkout.html',            // Paystack adds ?reference=...&trxref=... when the shopper comes back
    'channels' => $o['pay_method'] === 'card' ? ['card'] : ['bank_transfer', 'bank'],
    'metadata' => ['order' => $o['public_id']],
]);
$url = $res['data']['authorization_url'] ?? null;
if (empty($res['status']) || !is_string($url) || $url === '') {
    error_log('Paystack initialize refused: ' . json_encode($res));
    $pdo->prepare("UPDATE payments SET status = 'failed' WHERE reference = ?")->execute([$ref]);
    throw new HttpError(502, 'We could not start the payment. Please try again, or pay from My Orders in a moment.');
}
json_out(['url' => $url, 'reference' => $ref]);
