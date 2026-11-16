<?php
declare(strict_types=1);
require __DIR__ . '/../lib/bootstrap.php';
require __DIR__ . '/../lib/orders.php';

// One of the signed-in shopper's own orders:  get.php?id=MH12345678   (someone else's order looks exactly like one that doesn't exist)
only('GET');
$u = require_login();
$id = strtoupper(query_str('id'));
if (!preg_match('/^MH\d{8}$/', $id)) throw new HttpError(404, 'Order not found.');
$st = db()->prepare(order_select() . ' WHERE public_id = ? AND user_id = ?');
$st->execute([$id, $u['id']]);
$row = $st->fetch();
if (!$row) throw new HttpError(404, 'Order not found.');
json_out(['order' => orders_shape(db(), [$row])[0]]);
