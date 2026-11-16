<?php
declare(strict_types=1);

/* Order changes shared by the command line (db/orders-cli.php) and the admin page (api/admin/*).
   Plain PDO only: no web, session or HttpError code, so the command line can load it too.
   Problems the operator should see are thrown as InvalidArgumentException with a readable message. */

const ORDER_STATUSES = ['placed', 'processing', 'shipped', 'delivered', 'cancelled'];

/** Move an order to a new status and record it for the tracking timeline. Cancelling puts the items back in stock. Returns the previous status. */
function set_order_status(PDO $pdo, string $publicId, string $to): string
{
    if (!in_array($to, ORDER_STATUSES, true)) throw new InvalidArgumentException('Status must be one of: ' . implode(', ', ORDER_STATUSES));
    $publicId = strtoupper($publicId);
    $pdo->beginTransaction();
    try {
        $st = $pdo->prepare('SELECT id, status FROM orders WHERE public_id = ? FOR UPDATE');
        $st->execute([$publicId]);
        $o = $st->fetch();
        if (!$o) throw new InvalidArgumentException("No order $publicId");
        if ($o['status'] === $to) throw new InvalidArgumentException("Order $publicId is already $to");
        if ($o['status'] === 'cancelled') throw new InvalidArgumentException('A cancelled order cannot be reopened; ask the shopper to place a new one.');
        $pdo->prepare('UPDATE orders SET status = ? WHERE id = ?')->execute([$to, $o['id']]);
        $pdo->prepare('INSERT INTO order_events (order_id, status) VALUES (?, ?)')->execute([$o['id'], $to]);
        if ($to === 'cancelled') {
            $pdo->prepare('UPDATE products p JOIN order_items i ON i.product_id = p.id SET p.stock = p.stock + i.qty WHERE i.order_id = ?')->execute([$o['id']]);
        }
        $pdo->commit();
        return (string)$o['status'];
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }
}

/** Record that the money for an order has arrived (for example a bank transfer seen in the account). */
function mark_order_paid(PDO $pdo, string $publicId): void
{
    $st = $pdo->prepare("UPDATE orders SET payment_status = 'paid' WHERE public_id = ?");
    $st->execute([strtoupper($publicId)]);
    $chk = $pdo->prepare('SELECT 1 FROM orders WHERE public_id = ?');
    $chk->execute([strtoupper($publicId)]);
    if (!$chk->fetchColumn()) throw new InvalidArgumentException("No order $publicId");
}

/** Every product with less than $n in stock goes back up to $n. Returns how many were changed. */
function restock_products(PDO $pdo, int $n): int
{
    if ($n < 1 || $n > 10000) throw new InvalidArgumentException('Give a number between 1 and 10000');
    $st = $pdo->prepare('UPDATE products SET stock = ? WHERE stock < ?');
    $st->execute([$n, $n]);
    return $st->rowCount();
}

/** Cancel card/transfer orders that nobody has paid for within $hours, so their stock is not held forever. Returns how many were cancelled. */
function expire_unpaid_orders(PDO $pdo, int $hours): int
{
    if ($hours < 1) return 0;
    $st = $pdo->prepare("SELECT public_id FROM orders
                         WHERE pay_method IN ('card', 'transfer') AND payment_status = 'pending' AND status = 'placed'
                           AND created_at < (NOW() - INTERVAL ? HOUR)");
    $st->execute([$hours]);
    $n = 0;
    foreach ($st->fetchAll(PDO::FETCH_COLUMN) as $publicId) {
        try {
            set_order_status($pdo, (string)$publicId, 'cancelled');
            $n++;
        } catch (InvalidArgumentException $e) {
            // someone changed it a moment ago (paid, cancelled by hand): leave it alone
        }
    }
    return $n;
}
