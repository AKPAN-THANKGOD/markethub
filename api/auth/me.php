<?php
declare(strict_types=1);
require __DIR__ . '/../lib/bootstrap.php';
require __DIR__ . '/../lib/admin.php';

only('GET');
$user = current_user();
json_out(['user' => $user, 'csrf' => $_SESSION['csrf'], 'admin' => is_admin($user)]);   // 'admin' only decides whether the Admin link is shown; every admin endpoint checks again
