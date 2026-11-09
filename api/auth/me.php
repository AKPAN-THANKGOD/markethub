<?php
declare(strict_types=1);
require __DIR__ . '/../lib/bootstrap.php';

only('GET');
json_out(['user' => current_user(), 'csrf' => $_SESSION['csrf']]);
