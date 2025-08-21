<?php
// C:\xampp\htdocs\Parkmate\lookup_vehicle.php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require __DIR__ . '/db.php';

function bad($msg, $code = 400) {
  http_response_code($code);
  echo json_encode(["success" => false, "message" => $msg], JSON_UNESCAPED_SLASHES);
  exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') bad("Use POST");

$raw  = file_get_contents("php://input");
$body = json_decode($raw, true);
if (!is_array($body)) $body = [];

$parking_space_id = (int)($body['parking_space_id'] ?? 0);
$vehicle_no       = strtoupper(trim((string)($body['vehicle_no'] ?? $body['vehicleNo'] ?? '')));

if ($parking_space_id <= 0) bad("parking_space_id required");
if ($vehicle_no === '')     bad("vehicle_no required");

/* active 'in' ? */
$stmt = $mysqli->prepare("
  SELECT id, in_time
  FROM vehicles
  WHERE parking_space_id=? AND vehicle_no=? AND status='in'
  ORDER BY id DESC
  LIMIT 1
");
$stmt->bind_param("is", $parking_space_id, $vehicle_no);
$stmt->execute();
$res = $stmt->get_result();
if ($res && $res->num_rows > 0) {
  $row = $res->fetch_assoc();
  $stmt->close();
  echo json_encode([
    "success"     => true,
    "active"      => true,
    "vehicle_id"  => (int)$row['id'],
    "in_time"     => $row['in_time'], // "YYYY-MM-DD HH:MM:SS"
  ], JSON_UNESCAPED_SLASHES);
  exit;
}
$stmt->close();

/* not active: return last record (optional) */
$last = $mysqli->prepare("
  SELECT id, in_time, out_time, status
  FROM vehicles
  WHERE parking_space_id=? AND vehicle_no=?
  ORDER BY id DESC
  LIMIT 1
");
$last->bind_param("is", $parking_space_id, $vehicle_no);
$last->execute();
$lres = $last->get_result();
$payload = ["success" => true, "active" => false];
if ($lres && $lres->num_rows > 0) {
  $r = $lres->fetch_assoc();
  $payload["last_status"] = $r["status"];
  $payload["last_in_time"] = $r["in_time"];
  $payload["last_out_time"] = $r["out_time"];
}
$last->close();

echo json_encode($payload, JSON_UNESCAPED_SLASHES);
