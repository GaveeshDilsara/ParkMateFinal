<?php
// C:\xampp\htdocs\Parkmate\check_out_vehicle.php
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
$out_in           = trim((string)($body['out_time'] ?? $body['endTime'] ?? ''));
$pin              = trim((string)($body['pin'] ?? ''));

if ($parking_space_id <= 0) bad("parking_space_id required");
if ($vehicle_no === '')     bad("vehicle_no required");
if ($pin === '')            bad("pin required"); // PIN is mandatory at checkout

/* normalize out_time */
if ($out_in !== '' && preg_match('/^\d{2}:\d{2}$/', $out_in)) {
  $out_time = date('Y-m-d') . ' ' . $out_in . ':00';
} elseif ($out_in !== '' && preg_match('/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}(:\d{2})?$/', $out_in)) {
  $out_time = preg_match('/:\d{2}$/', $out_in) ? $out_in : ($out_in . ':00');
} else {
  $out_time = date('Y-m-d H:i:s');
}

/* find active 'in' row */
$sel = $mysqli->prepare("
  SELECT id, in_time
  FROM vehicles
  WHERE parking_space_id=? AND vehicle_no=? AND status='in'
  ORDER BY id DESC
  LIMIT 1
");
$sel->bind_param("is", $parking_space_id, $vehicle_no);
$sel->execute();
$res = $sel->get_result();
if (!$res || $res->num_rows === 0) {
  $sel->close();
  bad("Active check-in not found", 404);
}
$row = $res->fetch_assoc();
$vehicle_id = (int)$row['id'];
$sel->close();

/* update -> out (and store pin) */
$upd = $mysqli->prepare("UPDATE vehicles SET status='out', out_time=?, pin=? WHERE id=?");
$upd->bind_param("ssi", $out_time, $pin, $vehicle_id);
if (!$upd->execute()) {
  $msg = "Update failed";
  if ($mysqli->errno) $msg .= " (".$mysqli->errno.")";
  $upd->close();
  bad($msg, 500);
}
$upd->close();

echo json_encode([
  "success" => true,
  "vehicle_id" => $vehicle_id,
  "vehicle_no" => $vehicle_no,
  "out_time" => $out_time,
  "pin" => $pin,
  "status" => "out",
], JSON_UNESCAPED_SLASHES);
