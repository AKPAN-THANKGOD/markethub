<?php
declare(strict_types=1);

function product_select(): string
{
    return 'SELECT p.id, p.name, p.brand, p.price, p.old_price, p.rating, p.rv, p.stock, p.free_delivery, p.emoji, p.image, p.section, p.fbt, p.details,
                   c.slug AS cat, s.name AS seller, s.is_official
            FROM products p
            JOIN categories c ON c.id = p.category_id
            JOIN sellers s ON s.id = p.seller_id';
}

/** Same field names the front end already uses (id, name, price, old, r, rv, cat, e, seller, official, free ...). */
function product_shape(array $r): array
{
    return [
        'id' => (int)$r['id'], 'name' => $r['name'], 'brand' => $r['brand'], 'price' => (int)$r['price'], 'old' => (int)$r['old_price'],
        'r' => (int)$r['rating'], 'rv' => $r['rv'], 'cat' => $r['cat'], 'e' => $r['emoji'], 'img' => $r['image'],
        'seller' => $r['seller'], 'official' => (bool)$r['is_official'], 'free' => (bool)$r['free_delivery'],
        'stock' => (int)$r['stock'], 'low' => (int)$r['stock'] <= 2, 'sec' => $r['section'], 'fbt' => (bool)$r['fbt'],
        'detail' => $r['details'] !== null ? json_decode($r['details'], true) : null,
    ];
}
