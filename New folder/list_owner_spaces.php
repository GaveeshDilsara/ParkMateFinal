<?php
// C:\xampp\htdocs\Parkmate\list_owner_spaces.php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require __DIR__ . '/db.php';

$raw = file_get_contents("php://input");
$data = json_decode($raw, true);
$owner_id = intval($data["owner_id"] ?? 0);
if ($owner_id <= 0) {
  http_response_code(400);
  echo json_encode(["success"=>false,"message"=>"owner_id required"]); exit;
}

$sql = "
  SELECT
    ps.id,
    ps.parking_name,
    ps.location,
    ps.availability,
    ps.status,
    ps.photos_path,
    ps.latitude,
    ps.longitude
  FROM parking_space ps
  WHERE ps.owner_id = ?
  ORDER BY ps.id DESC
";
$stmt = $mysqli->prepare($sql);
if (!$stmt) {
  http_response_code(500);
  echo json_encode(["success"=>false,"message"=>"prepare failed"]); exit;
}
$stmt->bind_param("i", $owner_id);
$stmt->execute();
$res = $stmt->get_result();

$spaces = [];

// Build web base once: http(s)://host/Parkmate
$scheme  = $_SERVER['REQUEST_SCHEME'] ?? 'http';
$host    = $_SERVER['HTTP_HOST'] ?? 'localhost';
$webBase = rtrim($scheme . '://' . $host, '/') . '/Parkmate';

// Absolute project root on disk, e.g. C:\xampp\htdocs\Parkmate
$projectRoot = realpath(__DIR__);

while ($row = $res->fetch_assoc()) {
  $space_id = (int)$row["id"];

  // counts (latest row)
  $counts = ["cars"=>0,"vans"=>0,"bikes"=>0,"buses"=>0];
  if ($cstmt = $mysqli->prepare("
    SELECT cars,vans,bikes,buses
    FROM spaces
    WHERE parking_space_id = ?
    ORDER BY id DESC
    LIMIT 1
  ")) {
    $cstmt->bind_param("i", $space_id);
    $cstmt->execute();
    $cres = $cstmt->get_result();
    if ($cres && $cres->num_rows > 0) {
      $c = $cres->fetch_assoc();
      $counts = [
        "cars"  => (int)$c["cars"],
        "vans"  => (int)$c["vans"],
        "bikes" => (int)$c["bikes"],
        "buses" => (int)$c["buses"],
      ];
    }
    $cstmt->close();
  }

  // pricing (optional)
  $price = null;
  if ($pstmt = $mysqli->prepare("
    SELECT price_unit,cars,vans,bikes,buses
    FROM pricing
    WHERE parking_space_id = ?
    LIMIT 1
  ")) {
    $pstmt->bind_param("i", $space_id);
    $pstmt->execute();
    $pres = $pstmt->get_result();
    if ($pres && $pres->num_rows > 0) {
      $p = $pres->fetch_assoc();
      $price = [
        "unit"  => $p["price_unit"],
        "cars"  => (int)$p["cars"],
        "vans"  => (int)$p["vans"],
        "bikes" => (int)$p["bikes"],
        "buses" => (int)$p["buses"],
      ];
    }
    $pstmt->close();
  }

  // photos (all) + preview (first)
  $preview = null;
  $photos  = [];
  $photosPath = trim((string)($row["photos_path"] ?? ""));
  if ($photosPath !== "" && $projectRoot !== false) {
    $relDir = ltrim($photosPath, "/\\"); // e.g. uploads/owners/7/pasindu/
    $absDir = rtrim($projectRoot, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . $relDir;

    if (is_dir($absDir)) {
      $pattern = rtrim($absDir, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . '*.{jpg,jpeg,png,webp,gif,JPG,JPEG,PNG,WEBP,GIF}';
      $files = glob($pattern, GLOB_BRACE) ?: [];
      natcasesort($files);
      foreach ($files as $f) {
        $abs = realpath($f);
        if ($abs !== false) {
          $rel = substr($abs, strlen($projectRoot));
          $rel = str_replace('\\', '/', $rel);
          if ($rel === '' || $rel[0] !== '/') $rel = '/' . $rel;
          $photos[] = $webBase . $rel; // http://host/Parkmate/uploads/...
        }
      }
      if (!empty($photos)) $preview = $photos[0];
    }
  }

  $spaces[] = [
    "id"            => $space_id,
    "parking_name"  => $row["parking_name"],
    "location"      => $row["location"],
    "availability"  => $row["availability"],
    "status"        => $row["status"],
    "counts"        => $counts,
    "price"         => $price,
    "preview_url"   => $preview,
    "photos"        => $photos,
    // ✅ include lat/lng
    "latitude"      => isset($row["latitude"]) ? (float)$row["latitude"] : null,
    "longitude"     => isset($row["longitude"]) ? (float)$row["longitude"] : null,
  ];
}

echo json_encode(["success"=>true, "spaces"=>$spaces], JSON_UNESCAPED_SLASHES);
