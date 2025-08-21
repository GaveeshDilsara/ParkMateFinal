<?php
// C:\xampp\htdocs\Parkmate\login_driver.php
require_once __DIR__ . '/db.php';

/**
 * Expected JSON:
 * { "identifier": "john OR john@mail.com", "password": "secret123" }
 */

try {
  global $mysqli;

  $body       = read_json_body();
  $identifier = trim((string)($body['identifier'] ?? ''));
  $password   = (string)($body['password'] ?? '');

  if ($identifier === '' || $password === '') {
    send_json(['success' => false, 'message' => 'identifier and password are required'], 422);
  }

  // Try by email first, then by username (name)
  $stmt = $mysqli->prepare('SELECT id, name, email, password FROM driverdetails WHERE email = ? LIMIT 1');
  $stmt->bind_param('s', $identifier);
  $stmt->execute();
  $res = $stmt->get_result();
  $row = $res->fetch_assoc();
  $stmt->close();

  if (!$row) {
    $stmt = $mysqli->prepare('SELECT id, name, email, password FROM driverdetails WHERE name = ? LIMIT 1');
    $stmt->bind_param('s', $identifier);
    $stmt->execute();
    $res = $stmt->get_result();
    $row = $res->fetch_assoc();
    $stmt->close();
  }

  if (!$row) {
    send_json(['success' => false, 'message' => 'Account not found'], 404);
  }

  if (!password_verify($password, $row['password'])) {
    send_json(['success' => false, 'message' => 'Invalid credentials'], 401);
  }

  $driver = [
    'id'    => (int)$row['id'],
    'name'  => $row['name'],
    'email' => $row['email'],
  ];

  send_json(['success' => true, 'driver' => $driver]);
} catch (Throwable $e) {
  send_json(['success' => false, 'message' => 'Server error'], 500);
}
