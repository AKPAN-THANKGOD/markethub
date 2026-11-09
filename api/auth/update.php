<?php
declare(strict_types=1);
require __DIR__ . '/../lib/bootstrap.php';

only('POST');
require_csrf();
$u = require_login();
$d = body();

$name  = text($d, 'name', 2, 80, 'your name');
$phone = text($d, 'phone', 10, 16, 'a phone number');
if (!preg_match('/^[0-9+\s]{10,16}$/', $phone)) throw new HttpError(422, 'Enter a valid phone number.');

db()->prepare('UPDATE users SET name = ?, phone = ? WHERE id = ?')->execute([$name, $phone, $u['id']]);
json_out(['user' => current_user()]);
