<?php
// C:\xampp\htdocs\Parkmate\register_driver.php
require_once __DIR__ . '/db.php';

/**
 * Expected JSON:
 * { "username": "john", "email": "john@mail.com", "password": "secret123" }
 */

try {
  global $mysqli;

  $body     = read_json_body();
  $username = trim((string)($body['username'] ?? $body['name'] ?? ''));
  $email    = trim((string)($body['email'] ?? ''));
  $password = (string)($body['password'] ?? '');

  if ($username === '' || $email === '' || $password === '') {
    send_json(['success' => false, 'message' => 'username, email and password are required'], 422);
  }
  if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    send_json(['success' => false, 'message' => 'Invalid email'], 422);
  }
  if (strlen($password) < 6) {
    send_json(['success' => false, 'message' => 'Password must be at least 6 characters'], 422);
  }

  // Check uniqueness on email and optionally on username (name)
  $stmt = $mysqli->prepare('SELECT id FROM driverdetails WHERE email = ? LIMIT 1');
  $stmt->bind_param('s', $email);
  $stmt->execute();
  $stmt->store_result();
  if ($stmt->num_rows > 0) {
    $stmt->close();
    send_json(['success' => false, 'message' => 'Email already registered'], 409);
  }
  $stmt->close();

  $stmt = $mysqli->prepare('SELECT id FROM driverdetails WHERE name = ? LIMIT 1');
  $stmt->bind_param('s', $username);
  $stmt->execute();
  $stmt->store_result();
  if ($stmt->num_rows > 0) {
    $stmt->close();
    send_json(['success' => false, 'message' => 'Username already taken'], 409);
  }
  $stmt->close();

  $hash = password_hash($password, PASSWORD_BCRYPT);

  $stmt = $mysqli->prepare('INSERT INTO driverdetails (name, email, password) VALUES (?, ?, ?)');
  $stmt->bind_param('sss', $username, $email, $hash);
  if (!$stmt->execute()) {
    $msg = $mysqli->error ?: 'Insert failed';
    $stmt->close();
    send_json(['success' => false, 'message' => $msg], 500);
  }
  $driver_id = $stmt->insert_id;
  $stmt->close();

  send_json([
    'success'   => true,
    'driver_id' => (int)$driver_id,
    'username'  => $username
  ]);
} catch (Throwable $e) {
  send_json(['success' => false, 'message' => 'Server error'], 500);
}
