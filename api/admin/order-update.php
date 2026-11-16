<?php
declare(strict_types=1);
require __DIR__ . '/../lib/bootstrap.php';
require __DIR__ . '/../lib/admin.php';
require __DIR__ . '/../lib/order_admin.php';

// Admin: change one order.   {"id":"MH12345678","action":"status","status":"shipped"}   or   {"id":"MH12345678","action":"paid"}
only('POST');
require_csrf();
require_admin();
$d = body();
$id = strtoupper(text($d, 'id', 10, 10, 'an order number'));
$action = $d['action'] ?? '';
try {
    if ($action === 'status') {
        $to = $d['status'] ?? '';
        if (!is_string($to)) throw new InvalidArgumentException('Choose a status.');
        set_order_status(db(), $id, $to);
    } elseif ($action === 'paid') {
        mark_order_paid(db(), $id);
    } else {
        throw new InvalidArgumentException('Unknown action.');
    }
} catch (InvalidArgumentException $e) {
    throw new HttpError(422, $e->getMessage());
}
json_out(['ok' => true]);
