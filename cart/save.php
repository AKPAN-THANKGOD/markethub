<?php
declare(strict_types=1);
require __DIR__ . '/../lib/bootstrap.php';
require __DIR__ . '/../lib/userdata.php';

// Replaces the signed-in user's whole cart with the list sent.   Body: {"items":[{"id":205,"qty":2,"selected":true,"variant":"Color: Blue"}]}
only('POST');
require_csrf();
$u = require_login();
$d = body();

$items = $d['items'] ?? null;
if (!is_array($items) || count($items) > 100) throw new HttpError(422, 'Invalid cart.');

$clean = [];
foreach ($items as $it) {
    if (!is_array($it)) throw new HttpError(422, 'Invalid cart item.');
    $id  = int_in($it['id'] ?? null, 1, PHP_INT_MAX);
    $qty = int_in($it['qty'] ?? null, 1, 99);
    if ($id === null || $qty === null) throw new HttpError(422, 'Invalid cart item.');
    $selected = array_key_exists('selected', $it) ? ($it['selected'] ? 1 : 0) : 1;
    $variant = isset($it['variant']) && is_string($it['variant']) ? mb_substr(trim($it['variant']), 0, 120) : '';
    $clean[$id] = [$id, $qty, $selected, $variant === '' ? null : $variant];
}
if (count(existing_product_ids(array_keys($clean))) !== count($clean)) throw new HttpError(422, 'Unknown product in cart.');

$pdo = db();
$pdo->beginTransaction();
try {
    $pdo->prepare('DELETE FROM cart_items WHERE user_id = ?')->execute([$u['id']]);
    $ins = $pdo->prepare('INSERT INTO cart_items (user_id, product_id, qty, selected, variant) VALUES (?, ?, ?, ?, ?)');
    foreach ($clean as $row) $ins->execute([$u['id'], $row[0], $row[1], $row[2], $row[3]]);
    $pdo->commit();
} catch (Throwable $e) {
    $pdo->rollBack();
    throw $e;
}
json_out(['ok' => true, 'count' => count($clean)]);