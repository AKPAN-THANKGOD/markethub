<?php
declare(strict_types=1);
require __DIR__ . '/lib/bootstrap.php';
require __DIR__ . '/lib/payments.php';

only('GET');
$dbOk = true;
try {
    db()->query('SELECT 1');
} catch (Throwable $e) {
    $dbOk = false;
}
json_out(['ok' => $dbOk, 'php' => PHP_VERSION, 'db' => $dbOk, 'payments' => payments_enabled()], $dbOk ? 200 : 503);   // 'payments': is online payment (Paystack) switched on?
