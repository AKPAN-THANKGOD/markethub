<?php
declare(strict_types=1);
require __DIR__ . '/../lib/bootstrap.php';
require __DIR__ . '/../lib/payments.php';

// Paystack calls this address itself when a payment succeeds, even if the shopper closed the browser before coming back.
// Set it in the Paystack dashboard (Settings > API Keys & Webhooks) to:  https://YOUR-SITE/api/payments/webhook.php
// Every call is checked against the "x-paystack-signature" header, which only Paystack (who knows your secret key) can produce.
only('POST');
if (!payments_enabled()) throw new HttpError(503, 'Online payment is not available right now.');
$raw = file_get_contents('php://input');
$raw = $raw === false ? '' : $raw;
$sent = $_SERVER['HTTP_X_PAYSTACK_SIGNATURE'] ?? '';
if (!is_string($sent) || $sent === '' || !hash_equals(hash_hmac('sha512', $raw, paystack_secret()), strtolower($sent))) {
    throw new HttpError(401, 'Bad signature.');
}

$event = json_decode($raw, true);
$result = 'ignored';
if (is_array($event) && ($event['event'] ?? '') === 'charge.success' && is_array($event['data'] ?? null)) {
    $d = $event['data'];
    if (($d['status'] ?? '') === 'success' && is_string($d['reference'] ?? null)) {
        $result = settle_payment(db(), $d['reference'], (int)($d['amount'] ?? 0), (string)($d['currency'] ?? ''));
    }
}
json_out(['ok' => true, 'result' => $result]);     // always 200 for a genuine call, otherwise Paystack keeps retrying
