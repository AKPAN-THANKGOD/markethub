<?php
declare(strict_types=1);

/* Orders: server-side pricing, stock checks and the JSON shape the front end expects.
   The prices, delivery fees and discounts below mirror js/cart.js and js/checkout.js, but here the SERVER decides: nothing the browser sends is trusted. */

const DELIVERY_FEE = 2500;                 // per non-official seller (standard delivery)
const EXPRESS_FEE  = 5500;                 // flat, whole order
const COD_MAX      = 300000;               // Pay on Delivery only below this total...
const COD_CITIES   = ['lagos', 'abuja', 'port harcourt'];   // ...and only in these cities
const SHIP_METHODS = ['standard', 'express', 'pickup'];
const PAY_METHODS  = ['card', 'transfer', 'cod'];

/** The signed-in shopper's ticked cart items with current prices and stock. Call inside a transaction with $lock = true to lock the rows. */
function cart_lines(PDO $pdo, int $uid, bool $lock = false): array
{
    $st = $pdo->prepare('SELECT c.product_id, c.qty, c.variant, p.name, p.price, p.stock, s.id AS seller_id, s.is_official
                         FROM cart_items c
                         JOIN products p ON p.id = c.product_id
                         JOIN sellers  s ON s.id = p.seller_id
                         WHERE c.user_id = ? AND c.selected = 1
                         ORDER BY c.product_id' . ($lock ? ' FOR UPDATE' : ''));
    $st->execute([$uid]);
    return $st->fetchAll();
}

/** An active promo code ({type, value}) or null. */
function find_promo(PDO $pdo, string $code): ?array
{
    $st = $pdo->prepare('SELECT type, value FROM promo_codes WHERE code = ? AND active = 1');
    $st->execute([$code]);
    $r = $st->fetch();
    return $r ? ['type' => $r['type'], 'value' => (int)$r['value']] : null;
}

/** Subtotal, delivery fee, discount and total for these cart lines. */
function price_order(array $lines, string $ship, ?array $promo): array
{
    $sub = 0;
    $sellers = [];
    foreach ($lines as $l) {
        $sub += (int)$l['price'] * (int)$l['qty'];
        if (!(int)$l['is_official']) $sellers[(int)$l['seller_id']] = true;
    }
    $fee = $ship === 'express' ? EXPRESS_FEE : ($ship === 'pickup' ? 0 : count($sellers) * DELIVERY_FEE);
    $disc = 0;
    if ($promo && $sub > 0) {
        $disc = min($sub, $promo['type'] === 'flat' ? $promo['value'] : (int)round($sub * $promo['value'] / 100));
    }
    return ['sub' => $sub, 'fee' => $fee, 'disc' => $disc, 'total' => max(0, $sub + $fee - $disc)];
}

function cod_allowed(string $city, int $total): bool
{
    return $total < COD_MAX && in_array(mb_strtolower(trim($city)), COD_CITIES, true);
}

/** Turn order rows into the shape the front end uses. $withPrivate = false leaves out the address, phone and delivery note (used by the public track page). */
function orders_shape(PDO $pdo, array $rows, bool $withPrivate = true): array
{
    if (!$rows) return [];
    $ids = array_map(fn(array $r): int => (int)$r['id'], $rows);
    $in = implode(',', array_fill(0, count($ids), '?'));

    $st = $pdo->prepare("SELECT order_id, product_id, name, price, qty, variant FROM order_items WHERE order_id IN ($in) ORDER BY id");
    $st->execute($ids);
    $items = [];
    foreach ($st->fetchAll() as $r) {
        $items[(int)$r['order_id']][] = ['id' => (int)$r['product_id'], 'name' => $r['name'], 'price' => (int)$r['price'], 'q' => (int)$r['qty'], 'variant' => $r['variant']];
    }
    $st = $pdo->prepare("SELECT order_id, status, UNIX_TIMESTAMP(created_at) AS ts FROM order_events WHERE order_id IN ($in) ORDER BY id");
    $st->execute($ids);
    $events = [];
    foreach ($st->fetchAll() as $r) {
        $events[(int)$r['order_id']][] = ['status' => $r['status'], 'date' => gmdate('c', (int)$r['ts'])];
    }

    return array_map(function (array $r) use ($items, $events, $withPrivate): array {
        $id = (int)$r['id'];
        $o = [
            'id' => $r['public_id'], 'date' => gmdate('c', (int)$r['ts']), 'status' => $r['status'], 'payStatus' => $r['payment_status'],
            'ship' => $r['ship_method'], 'pay' => $r['pay_method'], 'promo' => $r['promo_code'],
            'items' => $items[$id] ?? [], 'events' => $events[$id] ?? [],
            'sub' => (int)$r['subtotal'], 'fee' => (int)$r['delivery_fee'], 'disc' => (int)$r['discount'], 'total' => (int)$r['total'],
        ];
        if ($withPrivate) {
            $o['note'] = $r['note'];
            $o['address'] = ['name' => $r['ship_name'], 'phone' => $r['ship_phone'], 'street' => $r['ship_street'], 'city' => $r['ship_city'], 'state' => $r['ship_state'], 'zip' => $r['ship_zip']];
        }
        return $o;
    }, $rows);
}

function order_select(): string
{
    return 'SELECT id, public_id, ship_name, ship_phone, ship_street, ship_city, ship_state, ship_zip, ship_method, pay_method, note, promo_code,
                   subtotal, delivery_fee, discount, total, status, payment_status, UNIX_TIMESTAMP(created_at) AS ts
            FROM orders';
}
