<?php
declare(strict_types=1);
require __DIR__ . '/../lib/bootstrap.php';

only('POST');
require_csrf();
$u = require_login();
$d = body();

$old = (string)($d['old'] ?? '');
$new = (string)($d['password'] ?? '');
if (strlen($new) < 8 || strlen($new) > 200 || !preg_match('/[A-Za-z]/', $new) || !preg_match('/\d/', $new)) {
    throw new HttpError(422, 'Password needs 8+ characters with letters and numbers.');
}

$st = db()->prepare('SELECT password_hash FROM users WHERE id = ?');
$st->execute([$u['id']]);
$hash = $st->fetchColumn();
if (!$hash || !password_verify($old, (string)$hash)) throw new HttpError(401, 'Current password is incorrect.');

db()->prepare('UPDATE users SET password_hash = ? WHERE id = ?')->execute([password_hash($new, PASSWORD_DEFAULT), $u['id']]);
session_regenerate_id(true);
json_out(['ok' => true]);