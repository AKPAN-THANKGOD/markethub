<?php
declare(strict_types=1);

/* Online payments through Paystack's HOSTED checkout (phase 5).
   The shopper pays on Paystack's own page, so card numbers never touch this site or this server.
   Flow: init.php asks Paystack for a payment link -> the shopper pays -> Paystack sends them back to checkout.html and
   (separately) calls webhook.php. Both routes end in settle_payment(), which is safe to run twice for the same payment. */

const ONLINE_PAY_METHODS = ['card', 'transfer'];

function paystack_secret(): string
{
    $k = cfg('paystack_secret', '');
    if (!is_string($k) || $k === '') $k = (string)getenv('PAYSTACK_SECRET_KEY');
    return trim($k);
}

function payments_enabled(): bool
{
    return paystack_secret() !== '';
}

function paystack_base(): string
{
    $b = cfg('paystack_base', '');
    if (!is_string($b) || $b === '') $b = (string)getenv('PAYSTACK_BASE_URL');      // only the automated tests change this (a fake Paystack)
    return rtrim($b !== '' ? $b : 'https://api.paystack.co', '/');
}

/** Call Paystack and return its decoded JSON. Any failure to reach it or understand it becomes a 502. */
function paystack_call(string $method, string $path, ?array $payload = null): array
{
    $url = paystack_base() . $path;
    $headers = ['Authorization: Bearer ' . paystack_secret(), 'Accept: application/json'];
    $json = $payload === null ? null : json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    if ($json !== null) $headers[] = 'Content-Type: application/json';

    $raw = false;
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [CURLOPT_CUSTOMREQUEST => $method, CURLOPT_HTTPHEADER => $headers, CURLOPT_RETURNTRANSFER => true,
                                CURLOPT_CONNECTTIMEOUT => 8, CURLOPT_TIMEOUT => 20]);
        if ($json !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, $json);
        $raw = curl_exec($ch);
        if ($raw === false) error_log('Paystack request failed: ' . curl_error($ch));
        curl_close($ch);
    } else {                                                                          // no curl extension: fall back to PHP streams
        $ctx = stream_context_create(['http' => ['method' => $method, 'header' => implode("\r\n", $headers), 'content' => $json ?? '', 'timeout' => 20, 'ignore_errors' => true]]);
        $raw = @file_get_contents($url, false, $ctx);
    }
    $data = is_string($raw) ? json_decode($raw, true) : null;
    if (!is_array($data)) throw new HttpError(502, 'The payment service did not answer. Please try again in a moment.');
    return $data;
}

/** Where Paystack sends the shopper back to. Set 'site_url' in the config on a live server. */
function site_url(): string
{
    $s = cfg('site_url', '');
    if (is_string($s) && $s !== '') return rtrim($s, '/');
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
    $host = preg_match('/^[A-Za-z0-9.\-]+(:\d{1,5})?$/', (string)($_SERVER['HTTP_HOST'] ?? '')) ? $_SERVER['HTTP_HOST'] : 'localhost';
    $dir = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/api/payments/init.php', 3)), '/');   // .../api/payments/x.php -> the site folder
    return ($https ? 'https://' : 'http://') . $host . $dir;
}

/**
 * Record a confirmed payment. $amountKobo and $currency must come from Paystack (a verified API answer or a signed webhook), never from the browser.
 * Returns 'paid' (just recorded), 'already' (was recorded before), 'mismatch' (wrong amount or currency: NOT recorded) or 'unknown' (not one of our references).
 * Safe to call twice at the same moment: the payment row is locked while it is checked.
 */
function settle_payment(PDO $pdo, string $reference, int $amountKobo, string $currency): string
{
    $pdo->beginTransaction();
    try {
        $st = $pdo->prepare('SELECT p.id, p.order_id, p.amount_kobo, p.status
                             FROM payments p JOIN orders o ON o.id = p.order_id
                             WHERE p.reference = ? FOR UPDATE');
        $st->execute([$reference]);
        $p = $st->fetch();
        if (!$p) { $pdo->rollBack(); return 'unknown'; }
        if ($p['status'] === 'paid') { $pdo->commit(); return 'already'; }
        if (strtoupper($currency) !== 'NGN' || $amountKobo !== (int)$p['amount_kobo']) {
            $pdo->prepare("UPDATE payments SET status = 'mismatch' WHERE id = ?")->execute([$p['id']]);
            $pdo->commit();
            error_log("Payment $reference: expected {$p['amount_kobo']} NGN kobo, Paystack reported $amountKobo $currency. Order NOT marked paid.");
            return 'mismatch';
        }
        $pdo->prepare("UPDATE payments SET status = 'paid', paid_at = NOW() WHERE id = ?")->execute([$p['id']]);
        $pdo->prepare("UPDATE orders SET payment_status = 'paid' WHERE id = ? AND payment_status = 'pending'")->execute([$p['order_id']]);
        $pdo->commit();
        return 'paid';
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }
}
