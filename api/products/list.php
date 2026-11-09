<?php
declare(strict_types=1);
require __DIR__ . '/../lib/bootstrap.php';
require __DIR__ . '/../lib/products.php';

only('GET');
$where = [];
$args = [];

if (($c = query_str('c')) !== '')       { $where[] = 'c.slug = ?';    $args[] = $c; }
if (($b = query_str('brand')) !== '')   { $where[] = 'p.brand = ?';   $args[] = $b; }
if (($s = query_str('section')) !== '') { $where[] = 'p.section = ?'; $args[] = $s; }
if (query_str('fbt') === '1')           { $where[] = 'p.fbt = 1'; }

if (($ids = query_str('ids')) !== '') {
    $list = array_values(array_filter(array_map('intval', explode(',', $ids)), fn($n) => $n > 0));
    if (!$list) json_out(['items' => [], 'total' => 0]);
    $where[] = 'p.id IN (' . implode(',', array_fill(0, count($list), '?')) . ')';
    array_push($args, ...$list);
}
if (($q = query_str('q')) !== '') {
    foreach (preg_split('/\s+/', mb_strtolower($q)) as $w) {
        $where[] = "LOWER(CONCAT_WS(' ', p.name, p.brand, c.name)) LIKE ?";
        $args[] = '%' . addcslashes($w, '%_\\') . '%';
    }
}

$sql = product_select() . ($where ? ' WHERE ' . implode(' AND ', $where) : '') . ' ORDER BY p.id';
$st = db()->prepare($sql);
$st->execute($args);
$items = array_map('product_shape', $st->fetchAll());
json_out(['items' => $items, 'total' => count($items)]);
