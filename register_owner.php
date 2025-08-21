<?php
// C:\xampp\htdocs\Parkmate\register_owner.php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require __DIR__ . '/db.php';

$raw = file_get_contents("php://input");
$data = json_decode($raw, true);
if (!$data) { echo json_encode(["success"=>false,"message"=>"Invalid JSON"]); exit; }

$full_name = trim((string)($data["full_name"] ?? ""));
$username  = trim((string)($data["username"] ?? ""));
$password  = (string)($data["password"] ?? "");
$email     = trim((string)($data["email"] ?? ""));
$nic       = strtoupper(trim((string)($data["nic"] ?? "")));
$phone     = preg_replace('/\D+/', '', (string)($data["phone"] ?? ""));

if ($full_name==="" || $username==="" || $password==="" || $email==="" || $nic==="" || $phone==="") {
  echo json_encode(["success"=>false,"message"=>"All fields are required"]); exit;
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
  echo json_encode(["success"=>false,"message"=>"Invalid email"]); exit;
}
if (strlen($password) < 6) {
  echo json_encode(["success"=>false,"message"=>"Password must be at least 6 characters"]); exit;
}
if (mb_strlen($full_name) < 3 || mb_strlen($full_name) > 150) {
  echo json_encode(["success"=>false,"message"=>"Full name must be 3–150 characters"]); exit;
}

$hash = password_hash($password, PASSWORD_DEFAULT);

$stmt = $mysqli->prepare("INSERT INTO ownerdetails (full_name,username,email,nic,phone,password_hash) VALUES (?,?,?,?,?,?)");
$stmt->bind_param("ssssss", $full_name, $username, $email, $nic, $phone, $hash);

if (!$stmt->execute()) {
  if ($mysqli->errno == 1062) {
    $field = "one of username/email/phone/NIC";
    if (strpos($mysqli->error, "uq_username") !== false) $field = "username";
    elseif (strpos($mysqli->error, "uq_email") !== false) $field = "email";
    elseif (strpos($mysqli->error, "uq_phone") !== false) $field = "phone";
    elseif (strpos($mysqli->error, "uq_nic") !== false) $field = "NIC";
    http_response_code(409);
    echo json_encode(["success"=>false,"message"=>"$field already exists"]); exit;
  }
  http_response_code(400);
  echo json_encode(["success"=>false,"message"=>"Registration failed"]); exit;
}

echo json_encode([
  "success"   => true,
  "message"   => "Registered",
  "owner_id"  => $stmt->insert_id,
  "username"  => $username,
  "full_name" => $full_name
]);
