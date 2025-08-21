<?php
// C:\xampp\htdocs\Parkmate\login_owner.php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require __DIR__ . '/db.php';

$raw = file_get_contents("php://input");
$data = json_decode($raw, true);
if (!$data) { echo json_encode(["success"=>false,"message"=>"Invalid JSON"]); exit; }

$identifier = trim($data["identifier"] ?? ""); // username OR email (no phone)
$password   = (string)($data["password"] ?? "");

if ($identifier==="" || $password==="") {
  echo json_encode(["success"=>false,"message"=>"identifier and password required"]); exit;
}

// Only match by username OR email (phone removed)
$stmt = $mysqli->prepare("
  SELECT id, username, email, nic, phone, password_hash
  FROM ownerdetails
  WHERE username = ? OR email = ?
  LIMIT 1
");
$stmt->bind_param("ss", $identifier, $identifier);
$stmt->execute();
$res = $stmt->get_result();

if (!$res || $res->num_rows === 0) {
  http_response_code(401);
  echo json_encode(["success"=>false,"message"=>"Invalid credentials"]); exit;
}
$row = $res->fetch_assoc();

if (!password_verify($password, $row["password_hash"])) {
  http_response_code(401);
  echo json_encode(["success"=>false,"message"=>"Invalid credentials"]); exit;
}

unset($row["password_hash"]);
echo json_encode(["success"=>true,"message"=>"Logged in","owner"=>$row]);
