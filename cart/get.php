<?php
declare(strict_types=1);
require __DIR__ . '/../lib/bootstrap.php';

only('GET');
$u = require_login();
$st = db()->prepare('SELECT product_id, qty, selected, variant FROM cart_items WHERE user_id = ? ORDER BY product_id');
$st->execute([$u['id']]);
json_out(['items' => array_map(fn(array $r): array => [
    'id' => (int)$r['product_id'], 'qty' => (int)$r['qty'], 'selected' => (bool)$r['selected'], 'variant' => $r['variant'],
], $st->fetchAll())]);