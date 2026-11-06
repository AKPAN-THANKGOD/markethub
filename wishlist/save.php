<?php
declare(strict_types=1);
require __DIR__ . '/../lib/bootstrap.php';
require __DIR__ . '/../lib/userdata.php';

// Replaces the signed-in user's whole wishlist.   Body: {"ids":[2,15]}
only('POST');
require_csrf();
$u = require_login();
$d = body();

$ids = $d['ids'] ?? null;
if (!is_array($ids) || count($ids) > 500) throw new HttpError(422, 'Invalid wishlist.');
$clean = [];
foreach ($ids as $v) {
    $n = int_in($v, 1, PHP_INT_MAX);
    if ($n === null) throw new HttpError(422, 'Invalid product id.');
    $clean[$n] = $n;
}
$clean = array_values($clean);
if (count(existing_product_ids($clean)) !== count($clean)) throw new HttpError(422, 'Unknown product in wishlist.');

$pdo = db();
$pdo->beginTransaction();
try {
    $pdo->prepare('DELETE FROM wishlist WHERE user_id = ?')->execute([$u['id']]);
    $ins = $pdo->prepare('INSERT INTO wishlist (user_id, product_id) VALUES (?, ?)');
    foreach ($clean as $pid) $ins->execute([$u['id'], $pid]);
    $pdo->commit();
} catch (Throwable $e) {
    $pdo->rollBack();
    throw $e;
}
json_out(['ok' => true, 'count' => count($clean)]);