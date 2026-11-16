<?php
declare(strict_types=1);
require __DIR__ . '/../lib/bootstrap.php';
require __DIR__ . '/../lib/orders.php';
require __DIR__ . '/../lib/payments.php';

// Called when the shopper comes back from Paystack:  verify.php?reference=MH12345678-ab12cd34ef56
// Asks Paystack directly whether that payment really succeeded (the address bar is not proof) and records it.
// Returns {"state":"paid"|"pending"|"failed","order":{...}}
only('GET');
$u = require_login();
if (!payments_enabled()) throw new HttpError(503, 'Online payment is not available right now.');
$ref = query_str('reference');
if (!preg_match('/^MH\d{8}-[0-9a-f]{12}$/', $ref)) throw new HttpError(404, 'Payment not found.');

$pdo = db();
$st = $pdo->prepare('SELECT p.status AS pay_status, o.id AS order_id FROM payments p JOIN orders o ON o.id = p.order_id WHERE p.reference = ? AND o.user_id = ?');
$st->execute([$ref, $u['id']]);
$row = $st->fetch();
if (!$row) throw new HttpError(404, 'Payment not found.');   // someone else's payment looks exactly like one that does not exist

$state = 'pending';
if ($row['pay_status'] === 'paid') {
    $state = 'paid';
} else {
    $res = paystack_call('GET', '/transaction/verify/' . rawurlencode($ref));
    $d = $res['data'] ?? null;
    if (!empty($res['status']) && is_array($d)) {
        $status = (string)($d['status'] ?? '');
        if ($status === 'success') {
            $r = settle_payment($pdo, $ref, (int)($d['amount'] ?? 0), (string)($d['currency'] ?? ''));
            $state = in_array($r, ['paid', 'already'], true) ? 'paid' : 'failed';
        } elseif ($status === 'failed' || $status === 'reversed') {
            $pdo->prepare("UPDATE payments SET status = 'failed' WHERE reference = ? AND status = 'pending'")->execute([$ref]);
            $state = 'failed';
        }                                                       // 'abandoned', 'pending', 'ongoing', 'queued': still waiting
    }
}

$st = $pdo->prepare(order_select() . ' WHERE id = ?');
$st->execute([$row['order_id']]);
json_out(['state' => $state, 'order' => orders_shape($pdo, [$st->fetch()])[0]]);
