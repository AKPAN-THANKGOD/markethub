<?php
declare(strict_types=1);
require __DIR__ . '/../lib/bootstrap.php';

only('POST');
require_csrf();
$_SESSION = [];
$p = session_get_cookie_params();
setcookie(session_name(), '', ['expires' => time() - 3600, 'path' => $p['path'], 'secure' => $p['secure'], 'httponly' => $p['httponly'], 'samesite' => $p['samesite']]);
session_destroy();
json_out(['ok' => true]);
