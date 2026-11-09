<?php
declare(strict_types=1);
require __DIR__ . '/../lib/bootstrap.php';

only('POST');
require_csrf();
$d = body();
$email = strtolower(text($d, 'email', 3, 190, 'your email address'));
$pw = (string)($d['password'] ?? '');

// Lock an email for 15 minutes after 5 failed attempts (counted whether or not the account exists)
$st = db()->prepare('SELECT COUNT(*) FROM login_attempts WHERE email = ? AND attempted_at > (NOW() - INTERVAL 15 MINUTE)');
$st->execute([$email]);
if ((int)$st->fetchColumn() >= 5) throw new HttpError(429, 'Too many attempts. Try again in a few minutes.');

$st = db()->prepare('SELECT id, password_hash FROM users WHERE email = ?');
$st->execute([$email]);
$u = $st->fetch();

// Always run a hash check so a missing account takes the same time as a wrong password
$ok = password_verify($pw, $u['password_hash'] ?? password_hash('not-a-real-password', PASSWORD_DEFAULT));
if (!$u || !$ok) {
    db()->prepare('INSERT INTO login_attempts (email, ip) VALUES (?, ?)')->execute([$email, substr($_SERVER['REMOTE_ADDR'] ?? '', 0, 45)]);
    throw new HttpError(401, 'Incorrect email or password.');
}

db()->prepare('DELETE FROM login_attempts WHERE email = ?')->execute([$email]);
if (password_needs_rehash($u['password_hash'], PASSWORD_DEFAULT)) {
    db()->prepare('UPDATE users SET password_hash = ? WHERE id = ?')->execute([password_hash($pw, PASSWORD_DEFAULT), $u['id']]);
}

start_session_for((int)$u['id']);
json_out(['user' => current_user(), 'csrf' => $_SESSION['csrf']]);
