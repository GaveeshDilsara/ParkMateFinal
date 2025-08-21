<?php
// C:\xampp\htdocs\Parkmate\create_payment.php
require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  json_out(["success" => false, "message" => "POST required"], 405);
}

$raw = file_get_contents("php://input");
$payload = json_decode($raw, true);
if (!is_array($payload)) { $payload = []; }

$parking_space_id = isset($payload['parking_space_id']) ? (int)$payload['parking_space_id'] : 0;
$payment          = isset($payload['payment']) ? (float)$payload['payment'] : null;
$pin              = isset($payload['pin']) ? trim((string)$payload['pin']) : '';

if ($parking_space_id <= 0) { json_out(["success"=>false,"message"=>"parking_space_id is required"], 400); }
if ($payment === null || !is_numeric($payment)) { json_out(["success"=>false,"message"=>"payment is required"], 400); }
if ($pin === '') { json_out(["success"=>false,"message"=>"pin is required"], 400); }

// Verify space exists
$check = $mysqli->prepare("SELECT id FROM parking_space WHERE id = ?");
$check->bind_param("i", $parking_space_id);
$check->execute();
$check->store_result();
if ($check->num_rows === 0) {
  $check->close();
  json_out(["success"=>false,"message"=>"parking_space not found"], 404);
}
$check->close();

// 1) Look for an existing identical payment (idempotent)
$find = $mysqli->prepare("SELECT id FROM payments WHERE parking_space_id = ? AND pin = ? AND payment = ? ORDER BY id DESC LIMIT 1");
$find->bind_param("isd", $parking_space_id, $pin, $payment);
$find->execute();
$find->bind_result($existing_id);
if ($find->fetch()) {
  $find->close();
  json_out(["success"=>true,"payment_id"=>$existing_id,"duplicate"=>true], 200);
}
$find->close();

// 2) Insert new if none
$stmt = $mysqli->prepare("INSERT INTO payments (parking_space_id, payment, pin) VALUES (?, ?, ?)");
if (!$stmt) { json_out(["success"=>false,"message"=>"Prepare failed"], 500); }
$stmt->bind_param("ids", $parking_space_id, $payment, $pin);
$ok = $stmt->execute();
if (!$ok) {
  $msg = ($mysqli->errno === 1452) ? "Invalid parking_space_id" : ("DB error ".$mysqli->errno);
  $stmt->close();
  json_out(["success"=>false,"message"=>$msg], 500);
}
$payment_id = $mysqli->insert_id;
$stmt->close();

json_out(["success"=>true,"payment_id"=>$payment_id], 200);
