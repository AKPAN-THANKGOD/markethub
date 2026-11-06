<?php
declare(strict_types=1);

/* Helpers for a signed-in shopper's cart, wishlist and addresses. Every query below is limited to the signed-in user's own rows. */

/** A whole number between $min and $max, or null. Accepts 5 and "5", rejects true, 1.5, "abc". */
function int_in(mixed $v, int $min, int $max): ?int
{
    if (is_string($v) && ctype_digit($v)) $v = (int)$v;
    if (!is_int($v) || $v < $min || $v > $max) return null;
    return $v;
}

/** Which of these product ids exist? */
function existing_product_ids(array $ids): array
{
    if (!$ids) return [];
    $st = db()->prepare('SELECT id FROM products WHERE id IN (' . implode(',', array_fill(0, count($ids), '?')) . ')');
    $st->execute(array_values($ids));
    return array_map('intval', $st->fetchAll(PDO::FETCH_COLUMN));
}

function address_list(int $uid): array
{
    $st = db()->prepare('SELECT id, name, phone, street, city, state, zip, is_default FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id');
    $st->execute([$uid]);
    return array_map(fn(array $r): array => [
        'id' => (int)$r['id'], 'name' => $r['name'], 'phone' => $r['phone'], 'street' => $r['street'],
        'city' => $r['city'], 'state' => $r['state'], 'zip' => $r['zip'], 'def' => (bool)$r['is_default'],
    ], $st->fetchAll());
}

/** Validate address fields from a request body. Returns [name, phone, street, city, state, zip]. */
function address_input(array $d): array
{
    $name   = text($d, 'name', 2, 80, 'a name');
    $phone  = text($d, 'phone', 10, 16, 'a phone number');
    $street = text($d, 'street', 3, 200, 'a street address');
    $city   = text($d, 'city', 2, 80, 'a city');
    if (!preg_match('/^[0-9+\s]{10,16}$/', $phone)) throw new HttpError(422, 'Enter a valid phone number.');
    $state = isset($d['state']) && is_string($d['state']) ? trim($d['state']) : '';
    $zip   = isset($d['zip']) && is_string($d['zip']) ? trim($d['zip']) : '';
    if (mb_strlen($state) > 80 || mb_strlen($zip) > 20) throw new HttpError(422, 'State or postcode is too long.');
    return [$name, $phone, $street, $city, $state, $zip];
}

/** 404 unless the address belongs to this user. */
function require_own_address(int $id, int $uid): void
{
    $st = db()->prepare('SELECT 1 FROM addresses WHERE id = ? AND user_id = ?');
    $st->execute([$id, $uid]);
    if (!$st->fetchColumn()) throw new HttpError(404, 'Address not found.');
}