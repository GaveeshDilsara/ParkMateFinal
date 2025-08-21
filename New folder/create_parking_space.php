<?php
// C:\xampp\htdocs\Parkmate\create_parking_space.php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require __DIR__ . '/db.php';

try {
  // Validate required scalar fields from multipart/form-data
  $owner_id     = isset($_POST['owner_id']) ? (int)$_POST['owner_id'] : 0;
  $parking_name = trim((string)($_POST['parking_name'] ?? ''));
  $location     = trim((string)($_POST['location'] ?? ''));
  $availability = trim((string)($_POST['availability'] ?? ''));
  $description  = trim((string)($_POST['description'] ?? ''));
  $price_unit   = trim((string)($_POST['price_unit'] ?? 'hour'));

  // ✅ Lat/Lng required (your UI ensures Verify before submit)
  $lat_raw = trim((string)($_POST['latitude'] ?? ''));
  $lng_raw = trim((string)($_POST['longitude'] ?? ''));
  if ($lat_raw === '' || $lng_raw === '') {
    send_json(["success"=>false, "message"=>"latitude and longitude are required"], 400);
  }
  $latitude  = (float)$lat_raw;
  $longitude = (float)$lng_raw;

  if ($owner_id <= 0 || $parking_name === '' || $location === '') {
    send_json(["success"=>false, "message"=>"Missing required fields"], 400);
  }

  // Pricing (optional but provided by UI)
  $price_cars  = isset($_POST['price_cars'])  ? (int)$_POST['price_cars']  : 0;
  $price_vans  = isset($_POST['price_vans'])  ? (int)$_POST['price_vans']  : 0;
  $price_bikes = isset($_POST['price_bikes']) ? (int)$_POST['price_bikes'] : 0;
  $price_buses = isset($_POST['price_buses']) ? (int)$_POST['price_buses'] : 0;

  // Spaces counts
  $spaces_cars  = isset($_POST['spaces_cars'])  ? (int)$_POST['spaces_cars']  : 0;
  $spaces_vans  = isset($_POST['spaces_vans'])  ? (int)$_POST['spaces_vans']  : 0;
  $spaces_bikes = isset($_POST['spaces_bikes']) ? (int)$_POST['spaces_bikes'] : 0;
  $spaces_buses = isset($_POST['spaces_buses']) ? (int)$_POST['spaces_buses'] : 0;

  // ---- Prepare upload folder ----
  $slug = strtolower(preg_replace('/[^a-z0-9]+/i', '-', $parking_name));
  $relDir = "uploads/owners/{$owner_id}/{$slug}/";
  $absDir = rtrim(__DIR__, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $relDir);
  if (!is_dir($absDir) && !@mkdir($absDir, 0777, true)) {
    send_json(["success"=>false, "message"=>"Failed to create upload directory"], 500);
  }

  // ---- Move Agreement (PDF) if any ----
  $agreement_path = null;
  if (isset($_FILES['agreement']) && is_array($_FILES['agreement']) && $_FILES['agreement']['error'] === UPLOAD_ERR_OK) {
    $ts = time();
    $agreeName = "agreement_{$owner_id}_{$slug}_{$ts}.pdf";
    $dest = $absDir . $agreeName;
    if (!@move_uploaded_file($_FILES['agreement']['tmp_name'], $dest)) {
      send_json(["success"=>false, "message"=>"Failed to save agreement"], 500);
    }
    $agreement_path = $relDir . $agreeName;
  }

  // ---- Move Photos[] if any ----
  $savedPhotos = [];
  if (isset($_FILES['photos']) || isset($_FILES['photos']['name'])) {
    // photos[] arrives as 'photos'
    $names = $_FILES['photos']['name'] ?? [];
    $tmps  = $_FILES['photos']['tmp_name'] ?? [];
    $errs  = $_FILES['photos']['error'] ?? [];
    $count = is_array($names) ? count($names) : 0;

    for ($i = 0; $i < $count; $i++) {
      if ($errs[$i] !== UPLOAD_ERR_OK) { continue; }
      $ext = strtolower(pathinfo($names[$i], PATHINFO_EXTENSION));
      if ($ext === '') { $ext = 'jpg'; }
      $filename = sprintf("photo_%d_%s.%s", $i+1, uniqid(), $ext);
      $dest = $absDir . $filename;
      if (@move_uploaded_file($tmps[$i], $dest)) {
        $savedPhotos[] = $relDir . $filename;
      }
    }
  }

  // ---- Insert into DB ----
  $mysqli->begin_transaction();

  // parking_space
  $sql = "INSERT INTO parking_space
          (owner_id, parking_name, location, availability, status, description, agreement_path, photos_path, latitude, longitude)
          VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?)";
  $stmt = $mysqli->prepare($sql);
  if (!$stmt) {
    $mysqli->rollback();
    send_json(["success"=>false, "message"=>"prepare failed (parking_space)"], 500);
  }
  $photos_path = $relDir; // folder path
  $stmt->bind_param(
    "issssssdd",
    $owner_id,
    $parking_name,
    $location,
    $availability,
    $description,
    $agreement_path,
    $photos_path,
    $latitude,
    $longitude
  );
  if (!$stmt->execute()) {
    $mysqli->rollback();
    send_json(["success"=>false, "message"=>"insert failed (parking_space)"], 500);
  }
  $parking_space_id = $stmt->insert_id;
  $stmt->close();

  // spaces (counts snapshot)
  $sqlSpaces = "INSERT INTO spaces (parking_space_id, cars, vans, bikes, buses) VALUES (?, ?, ?, ?, ?)";
  if ($stmt = $mysqli->prepare($sqlSpaces)) {
    $stmt->bind_param("iiiii", $parking_space_id, $spaces_cars, $spaces_vans, $spaces_bikes, $spaces_buses);
    $stmt->execute();
    $stmt->close();
  }

  // pricing
  $sqlPrice = "INSERT INTO pricing (parking_space_id, price_unit, cars, vans, bikes, buses) VALUES (?, ?, ?, ?, ?, ?)";
  if ($stmt = $mysqli->prepare($sqlPrice)) {
    $stmt->bind_param("isiiii", $parking_space_id, $price_unit, $price_cars, $price_vans, $price_bikes, $price_buses);
    $stmt->execute();
    $stmt->close();
  }

  $mysqli->commit();

  // Build web base
  $scheme  = $_SERVER['REQUEST_SCHEME'] ?? 'http';
  $host    = $_SERVER['HTTP_HOST'] ?? 'localhost';
  $webBase = rtrim($scheme . '://' . $host, '/') . '/Parkmate';

  // Convert saved photos to absolute URLs
  $photos_urls = array_map(function($rel) use ($webBase) {
    $rel = ltrim($rel, '/');
    return $webBase . '/' . $rel;
  }, $savedPhotos);

  send_json([
    "success"          => true,
    "parking_space_id" => $parking_space_id,
    "agreement_path"   => $agreement_path,
    "photos_path"      => $photos_path,
    "photos"           => $photos_urls,
    "latitude"         => $latitude,
    "longitude"        => $longitude
  ]);

} catch (Throwable $e) {
  if ($mysqli && $mysqli->errno) { @$mysqli->rollback(); }
  send_json(["success"=>false, "message"=>"Server error"], 500);
}
