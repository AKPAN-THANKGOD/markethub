<?php
declare(strict_types=1);

/* Shared setup for every API endpoint: config, JSON output, errors, session, CSRF, database. */

final class HttpError extends Exception
{
    public function __construct(public int $status, string $message)
    {
        parent::__construct($message);
    }
}

function cfg(string $key, mixed $default = null): mixed
{
    static $c = null;
    if ($c === null) {
        $local = __DIR__ . '/../config.local.php';
        $c = require (is_file($local) ? $local : __DIR__ . '/../config.example.php');
    }
    return $c[$key] ?? $default;
}

function json_out(mixed $data, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    exit;
}

ini_set('display_errors', '0');                       // never print PHP errors into the JSON
set_error_handler(function (int $no, string $str, string $file, int $line): bool {
    if (!(error_reporting() & $no)) return false;
    throw new ErrorException($str, 0, $no, $file, $line);
});
set_exception_handler(function (Throwable $e): void {
    $status = $e instanceof HttpError ? $e->status : 500;
    if ($status === 500) error_log((string)$e);
    $msg = ($e instanceof HttpError || cfg('debug')) ? $e->getMessage() : 'Something went wrong. Please try again.';
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => $msg], JSON_UNESCAPED_UNICODE);
});

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

$origin = (string)cfg('allowed_origin', '');
if ($origin !== '' && ($_SERVER['HTTP_ORIGIN'] ?? '') === $origin) {
    header("Access-Control-Allow-Origin: $origin");
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Headers: Content-Type, X-CSRF-Token');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Vary: Origin');
}
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
session_name('mh_session');
session_set_cookie_params([
    'lifetime' => 0, 'path' => '/', 'secure' => $https, 'httponly' => true,
    'samesite' => $origin !== '' ? 'None' : 'Lax',    // 'None' (cross-site) only works over https
]);
session_start();
$_SESSION['csrf'] ??= bin2hex(random_bytes(32));

function db(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $d = cfg('db');
        $pdo = new PDO(
            "mysql:host={$d['host']};port={$d['port']};dbname={$d['name']};charset=utf8mb4",
            $d['user'], $d['pass'],
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC, PDO::ATTR_EMULATE_PREPARES => false]
        );
    }
    return $pdo;
}

function only(string $method): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== $method) {
        header('Allow: ' . $method);
        throw new HttpError(405, 'Method not allowed');
    }
}

function body(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === '' || $raw === false) return [];
    $data = json_decode($raw, true);
    if (!is_array($data)) throw new HttpError(400, 'Invalid JSON body');
    return $data;
}

function require_csrf(): void
{
    $sent = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if (!is_string($sent) || !hash_equals($_SESSION['csrf'], $sent)) throw new HttpError(403, 'Invalid or missing CSRF token');
}

function text(array $d, string $key, int $min, int $max, string $label): string
{
    $v = $d[$key] ?? '';
    if (!is_string($v)) throw new HttpError(422, "Enter $label.");
    $v = trim($v);
    $len = mb_strlen($v);
    if ($len < $min || $len > $max) throw new HttpError(422, "Enter $label.");
    return $v;
}

function query_str(string $key): string
{
    $v = $_GET[$key] ?? '';
    return is_string($v) ? trim($v) : '';
}

function current_user(): ?array
{
    $id = $_SESSION['uid'] ?? null;
    if (!$id) return null;
    $st = db()->prepare('SELECT id, name, email, phone FROM users WHERE id = ?');
    $st->execute([$id]);
    $u = $st->fetch();
    return $u ? ['id' => (int)$u['id'], 'name' => $u['name'], 'email' => $u['email'], 'phone' => $u['phone']] : null;
}

function require_login(): array
{
    $u = current_user();
    if (!$u) throw new HttpError(401, 'Please sign in.');
    return $u;
}

function start_session_for(int $userId): void
{
    session_regenerate_id(true);                       // prevents session fixation
    $_SESSION['uid'] = $userId;
    $_SESSION['csrf'] = bin2hex(random_bytes(32));
}
