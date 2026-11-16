<?php
declare(strict_types=1);
require __DIR__ . '/../lib/bootstrap.php';
require __DIR__ . '/../lib/userdata.php';
require __DIR__ . '/../lib/orders.php';
require __DIR__ . '/../lib/order_admin.php';

// Places an order from the signed-in shopper's TICKED cart items. The items, prices, delivery fee and discount all come from the database, never from the request.
// Body: {"address_id":3,"ship":"standard","pay":"transfer","note":"Call on arrival","promo":"SAVE5"}
only('POST');
require_csrf();
$u = require_login();
$d = body();

$ship = $d['ship'] ?? null;
if (!is_string($ship) || !in_array($ship, SHIP_METHODS, true)) throw new HttpError(422, 'Choose a delivery method.');
$pay = $d['pay'] ?? null;
if (!is_string($pay) || !in_array($pay, PAY_METHODS, true)) throw new HttpError(422, 'Choose a payment method.');
$addrId = int_in($d['address_id'] ?? null, 1, PHP_INT_MAX);
if ($addrId === null) throw new HttpError(422, 'Choose a delivery address.');
$note = isset($d['note']) && is_string($d['note']) ? trim($d['note']) : '';
if (mb_strlen($note) > 500) throw new HttpError(422, 'Delivery instructions are too long (500 characters at most).');
$code = isset($d['promo']) && is_string($d['promo']) ? strtoupper(trim($d['promo'])) : '';
if (mb_strlen($code) > 30) throw new HttpError(422, 'Invalid promo code.');

$pdo = db();
expire_unpaid_orders($pdo, (int)cfg('unpaid_hours', 24));      // first free the stock held by orders nobody paid for
$pdo->beginTransaction();
try {
    $lines = cart_lines($pdo, $u['id'], true);          // locks the cart and product rows, so a double click or two tabs can't order twice or oversell
    if (!$lines) throw new HttpError(422, 'Select at least one item in your cart.');

    $st = $pdo->prepare('SELECT name, phone, street, city, state, zip FROM addresses WHERE id = ? AND user_id = ?');
    $st->execute([$addrId, $u['id']]);
    $addr = $st->fetch();
    if (!$addr) throw new HttpError(422, 'Choose a delivery address.');

    $promo = null;
    if ($code !== '') {
        $promo = find_promo($pdo, $code);
        if (!$promo) throw new HttpError(422, 'Invalid promo code.');
    }

    foreach ($lines as $l) {
        if ((int)$l['stock'] < (int)$l['qty']) {
            throw new HttpError(409, (int)$l['stock'] === 0 ? "{$l['name']} is out of stock." : "{$l['name']} only has {$l['stock']} left. Please lower the quantity in your cart.");
        }
    }

    $t = price_order($lines, $ship, $promo);
    if ($pay === 'cod' && !cod_allowed($addr['city'], $t['total'])) throw new HttpError(422, 'Pay on Delivery is not available for this order.');

    $ins = $pdo->prepare('INSERT INTO orders (public_id, user_id, ship_name, ship_phone, ship_street, ship_city, ship_state, ship_zip, ship_method, pay_method, note, promo_code, subtotal, delivery_fee, discount, total)
                          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    $orderId = 0;
    $publicId = '';
    for ($try = 0; $try < 5 && !$orderId; $try++) {      // the public number is random, so retry in the (very unlikely) case of a clash
        $publicId = 'MH' . random_int(10000000, 99999999);
        try {
            $ins->execute([$publicId, $u['id'], $addr['name'], $addr['phone'], $addr['street'], $addr['city'], $addr['state'], $addr['zip'], $ship, $pay, $note,
                           $promo ? $code : null, $t['sub'], $t['fee'], $t['disc'], $t['total']]);
            $orderId = (int)$pdo->lastInsertId();
        } catch (PDOException $e) {
            if ((int)($e->errorInfo[1] ?? 0) !== 1062) throw $e;
        }
    }
    if (!$orderId) throw new RuntimeException('Could not create an order number.');

    $item = $pdo->prepare('INSERT INTO order_items (order_id, product_id, name, price, qty, variant) VALUES (?, ?, ?, ?, ?, ?)');
    $take = $pdo->prepare('UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?');
    foreach ($lines as $l) {
        $item->execute([$orderId, $l['product_id'], $l['name'], $l['price'], $l['qty'], $l['variant']]);
        $take->execute([$l['qty'], $l['product_id'], $l['qty']]);
        if ($take->rowCount() !== 1) throw new HttpError(409, "{$l['name']} just sold out. Please review your cart.");
    }
    $pdo->prepare("INSERT INTO order_events (order_id, status) VALUES (?, 'placed')")->execute([$orderId]);
    $pdo->prepare('DELETE FROM cart_items WHERE user_id = ? AND selected = 1')->execute([$u['id']]);
    $pdo->commit();
} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    throw $e;
}

$st = $pdo->prepare(order_select() . ' WHERE id = ?');
$st->execute([$orderId]);
json_out(['order' => orders_shape($pdo, [$st->fetch()])[0]], 201);
