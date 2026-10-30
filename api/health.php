<?php
declare(strict_types=1);
require __DIR__ . '/lib/bootstrap.php';

only('GET');
$dbOk = true;
try {
    db()->query('SELECT 1');
} catch (Throwable $e) {
    $dbOk = false;
}
json_out(['ok' => $dbOk, 'php' => PHP_VERSION, 'db' => $dbOk], $dbOk ? 200 : 503);