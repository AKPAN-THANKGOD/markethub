<?php
declare(strict_types=1);

/* Who may use the admin page: the accounts whose e-mail is listed under 'admin_emails' in api/config.local.php. No database change needed. */

function is_admin(?array $user): bool
{
    if (!$user) return false;
    $list = cfg('admin_emails', []);
    if (!is_array($list)) return false;
    return in_array(strtolower($user['email']), array_map(fn($e): string => strtolower((string)$e), $list), true);
}

function require_admin(): array
{
    $u = require_login();
    if (!is_admin($u)) throw new HttpError(403, 'You do not have access to this page.');
    return $u;
}
