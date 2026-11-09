<?php
declare(strict_types=1);
require __DIR__ . '/../lib/bootstrap.php';
require __DIR__ . '/../lib/products.php';

only('GET');
$id = (int)query_str('id');
$st = db()->prepare(product_select() . ' WHERE p.id = ?');
$st->execute([$id]);
$row = $st->fetch();
if (!$row) throw new HttpError(404, 'Product not found.');
json_out(['item' => product_shape($row)]);
