<?php
declare(strict_types=1);
require __DIR__ . '/../lib/bootstrap.php';
require __DIR__ . '/../lib/userdata.php';

// Create (no "id") or edit (with "id") one of the signed-in user's addresses. Returns the full list.
only('POST');
require_csrf();
$u = require_login();
$d = body();
[$name, $phone, $street, $city, $state, $zip] = address_input($d);
$pdo = db();
$uid = $u['id'];

if (array_key_exists('id', $d)) {
    $id = int_in($d['id'], 1, PHP_INT_MAX);
    if ($id === null) throw new HttpError(422, 'Invalid address.');
    require_own_address($id, $uid);
    $pdo->prepare('UPDATE addresses SET name = ?, phone = ?, street = ?, city = ?, state = ?, zip = ? WHERE id = ? AND user_id = ?')
        ->execute([$name, $phone, $street, $city, $state, $zip, $id, $uid]);
    $status = 200;
} else {
    $st = $pdo->prepare('SELECT COUNT(*) FROM addresses WHERE user_id = ?');
    $st->execute([$uid]);
    $existing = (int)$st->fetchColumn();
    if ($existing >= 20) throw new HttpError(422, 'You can save up to 20 addresses.');
    $pdo->prepare('INSERT INTO addresses (user_id, name, phone, street, city, state, zip, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        ->execute([$uid, $name, $phone, $street, $city, $state, $zip, $existing === 0 ? 1 : 0]);
    $id = (int)$pdo->lastInsertId();
    $status = 201;
}
if (!empty($d['def'])) {
    $pdo->prepare('UPDATE addresses SET is_default = (id = ?) WHERE user_id = ?')->execute([$id, $uid]);
}
json_out(['items' => address_list($uid), 'id' => $id], $status);
