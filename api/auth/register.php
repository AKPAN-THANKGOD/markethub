<?php
declare(strict_types=1);
require __DIR__ . '/../lib/bootstrap.php';

only('POST');
require_csrf();
$d = body();

$name  = text($d, 'name', 2, 80, 'your name');
$email = strtolower(text($d, 'email', 5, 190, 'an email address'));
$phone = text($d, 'phone', 10, 16, 'a phone number');
$pw    = (string)($d['password'] ?? '');

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) throw new HttpError(422, 'Enter a valid email address.');
if (!preg_match('/^[0-9+\s]{10,16}$/', $phone)) throw new HttpError(422, 'Enter a valid phone number.');
if (strlen($pw) < 8 || strlen($pw) > 200 || !preg_match('/[A-Za-z]/', $pw) || !preg_match('/\d/', $pw)) {
    throw new HttpError(422, 'Password needs 8+ characters with letters and numbers.');
}

try {
    $st = db()->prepare('INSERT INTO users (name, email, phone, password_hash) VALUES (?, ?, ?, ?)');
    $st->execute([$name, $email, $phone, password_hash($pw, PASSWORD_DEFAULT)]);
} catch (PDOException $e) {
    if ($e->getCode() === '23000') throw new HttpError(409, 'An account with this email already exists.');
    throw $e;
}

start_session_for((int)db()->lastInsertId());
json_out(['user' => current_user(), 'csrf' => $_SESSION['csrf']], 201);