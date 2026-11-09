<?php
declare(strict_types=1);
require __DIR__ . '/../lib/bootstrap.php';

only('GET');
$u = require_login();
$st = db()->prepare('SELECT product_id FROM wishlist WHERE user_id = ? ORDER BY created_at, product_id');
$st->execute([$u['id']]);
json_out(['ids' => array_map('intval', $st->fetchAll(PDO::FETCH_COLUMN))]);
