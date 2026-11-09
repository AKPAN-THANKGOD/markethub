<?php
declare(strict_types=1);
require __DIR__ . '/../lib/bootstrap.php';
require __DIR__ . '/../lib/userdata.php';

only('POST');
require_csrf();
$u = require_login();
$id = int_in(body()['id'] ?? null, 1, PHP_INT_MAX) ?? throw new HttpError(422, 'Invalid address.');
$uid = $u['id'];
$pdo = db();

$pdo->beginTransaction();
try {
    $st = $pdo->prepare('DELETE FROM addresses WHERE id = ? AND user_id = ?');
    $st->execute([$id, $uid]);
    if ($st->rowCount() === 0) throw new HttpError(404, 'Address not found.');
    $st = $pdo->prepare('SELECT COUNT(*) FROM addresses WHERE user_id = ? AND is_default = 1');
    $st->execute([$uid]);
    if ((int)$st->fetchColumn() === 0) {                 // always keep one default
        $pdo->prepare('UPDATE addresses SET is_default = 1 WHERE user_id = ? ORDER BY id LIMIT 1')->execute([$uid]);
    }
    $pdo->commit();
} catch (Throwable $e) {
    $pdo->rollBack();
    throw $e;
}
json_out(['items' => address_list($uid)]);
