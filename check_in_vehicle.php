<?php
// C:\xampp\htdocs\Parkmate\check_in_vehicle.php
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

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  bad("Use POST");
}

$raw  = file_get_contents("php://input");
$body = json_decode($raw, true);
if (!is_array($body)) $body = [];

/* ---- read fields (accept camelCase from app) ---- */
$parking_space_id = (int)($body['parking_space_id'] ?? 0);
$vehicle_no       = strtoupper(trim((string)($body['vehicle_no'] ?? $body['vehicleNo'] ?? '')));
$category         = trim((string)($body['category'] ?? ''));
$phone            = trim((string)($body['phone'] ?? ''));
$in_time_in       = trim((string)($body['in_time'] ?? $body['startTime'] ?? ''));

/* ---- validate ---- */
if ($parking_space_id <= 0) bad("parking_space_id required");
if ($vehicle_no === '')     bad("vehicle_no required");
$allowed = ['cars','vans','bikes','buses'];
if (!in_array($category, $allowed, true)) bad("category must be one of: ".implode(',', $allowed));

/* ---- normalize in_time: accept "HH:MM" or full "YYYY-MM-DD HH:MM(:SS)" ---- */
$in_time = null;
if ($in_time_in !== '' && preg_match('/^\d{2}:\d{2}$/', $in_time_in)) {
  // caller sent "HH:MM" -> combine with today's date in server timezone
  $in_time = date('Y-m-d') . ' ' . $in_time_in . ':00';
} elseif ($in_time_in !== '' && preg_match('/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}(:\d{2})?$/', $in_time_in)) {
  $in_time = preg_match('/:\d{2}$/', $in_time_in) ? $in_time_in : ($in_time_in . ':00');
} else {
  // fallback: now
  $in_time = date('Y-m-d H:i:s');
}

/* ---- verify parking_space exists ---- */
$ps = $mysqli->prepare("SELECT id FROM parking_space WHERE id=? LIMIT 1");
$ps->bind_param("i", $parking_space_id);
$ps->execute();
$psres = $ps->get_result();
if (!$psres || $psres->num_rows === 0) bad("parking_space not found", 404);
$ps->close();

/* ---- prevent duplicate active 'in' for same vehicle ---- */
$chk = $mysqli->prepare("
  SELECT id FROM vehicles
  WHERE parking_space_id=? AND vehicle_no=? AND status='in'
  LIMIT 1
");
$chk->bind_param("is", $parking_space_id, $vehicle_no);
$chk->execute();
$chkres = $chk->get_result();
if ($chkres && $chkres->num_rows > 0) {
  $row = $chkres->fetch_assoc();
  $chk->close();
  bad("This vehicle is already checked-in (id=".$row['id'].")");
}
$chk->close();

/* ---- insert ---- */
$ins = $mysqli->prepare("
  INSERT INTO vehicles (parking_space_id, vehicle_no, category, phone, in_time, status)
  VALUES (?,?,?,?,?, 'in')
");
$ins->bind_param("issss", $parking_space_id, $vehicle_no, $category, $phone, $in_time);
if (!$ins->execute()) {
  $msg = "Insert failed";
  if ($mysqli->errno) $msg .= " (".$mysqli->errno.")";
  $ins->close();
  bad($msg, 500);
}
$vehicle_id = $ins->insert_id;
$ins->close();

echo json_encode([
  "success" => true,
  "vehicle_id" => $vehicle_id,
  "parking_space_id" => $parking_space_id,
  "vehicle_no" => $vehicle_no,
  "category" => $category,
  "phone" => $phone,
  "in_time" => $in_time,
  "status" => "in",
], JSON_UNESCAPED_SLASHES);
