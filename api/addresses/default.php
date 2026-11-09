<?php
declare(strict_types=1);
require __DIR__ . '/../lib/bootstrap.php';
require __DIR__ . '/../lib/userdata.php';

only('POST');
require_csrf();
$u = require_login();
$id = int_in(body()['id'] ?? null, 1, PHP_INT_MAX) ?? throw new HttpError(422, 'Invalid address.');
require_own_address($id, $u['id']);
db()->prepare('UPDATE addresses SET is_default = (id = ?) WHERE user_id = ?')->execute([$id, $u['id']]);
json_out(['items' => address_list($u['id'])]);
