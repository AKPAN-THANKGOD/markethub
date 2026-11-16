<?php
declare(strict_types=1);
require __DIR__ . '/../lib/bootstrap.php';
require __DIR__ . '/../lib/orders.php';

// The signed-in shopper's orders, newest first (with items and status history).
only('GET');
$u = require_login();
$st = db()->prepare(order_select() . ' WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 100');
$st->execute([$u['id']]);
json_out(['items' => orders_shape(db(), $st->fetchAll())]);
