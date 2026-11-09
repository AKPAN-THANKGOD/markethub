<?php
// Copy this file to config.local.php (it is git-ignored) and put your real values there.
// If config.local.php is missing, these XAMPP defaults are used - fine on your own PC, never on a live server.
return [
    'db' => ['host' => '127.0.0.1', 'port' => 3306, 'name' => 'markethub', 'user' => 'root', 'pass' => ''],
    'debug' => true,            // show real error messages in API responses. MUST be false on a live server
    'allowed_origin' => '',     // leave empty when the website and the API are on the same domain (recommended)
];
