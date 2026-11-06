<?php
declare(strict_types=1);
require __DIR__ . '/../lib/bootstrap.php';
require __DIR__ . '/../lib/userdata.php';

only('GET');
$u = require_login();
json_out(['items' => address_list($u['id'])]);