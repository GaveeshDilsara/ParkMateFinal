<?php
// C:\xampp\htdocs\Parkmate\search_nearby_spaces.php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require __DIR__ . '/db.php';

try {
  $data = read_json_body();
  $lat = isset($data['lat']) ? (float)$data['lat'] : null;
  $lng = isset($data['lng']) ? (float)$data['lng'] : null;
  $radius_m = isset($data['radius_m']) ? (int)$data['radius_m'] : 2000;

  if (!is_finite($lat) || !is_finite($lng)) {
    send_json(["success" => false, "message" => "lat/lng required"], 400);
  }
  if ($lat < -90 || $lat > 90 || $lng < -180 || $lng > 180) {
    send_json(["success" => false, "message" => "lat/lng out of range"], 400);
  }

  // clamp to 0.1–20 km
  $radius_km = max(0.1, min(20.0, $radius_m / 1000.0));

  // Join pricing so we can show per-category prices, and include opening hours from availability
  $sql = "
    SELECT
      ps.id,
      ps.parking_name,
      ps.location,
      ps.latitude,
      ps.longitude,
      ps.availability,
      p.price_unit,
      p.cars,
      p.vans,
      p.bikes,
      p.buses,
      (
        6371 * ACOS(
          COS(RADIANS(?)) * COS(RADIANS(ps.latitude)) *
          COS(RADIANS(ps.longitude) - RADIANS(?)) +
          SIN(RADIANS(?)) * SIN(RADIANS(ps.latitude))
        )
      ) AS distance_km
    FROM parking_space ps
    LEFT JOIN pricing p ON p.parking_space_id = ps.id
    WHERE ps.status = 'accept'
      AND ps.latitude IS NOT NULL
      AND ps.longitude IS NOT NULL
    HAVING distance_km <= ?
    ORDER BY distance_km ASC
    LIMIT 200
  ";

  $stmt = $mysqli->prepare($sql);
  if (!$stmt) { send_json(["success" => false, "message" => "prepare failed"], 500); }

  $stmt->bind_param("dddd", $lat, $lng, $lat, $radius_km);
  $stmt->execute();
  $res = $stmt->get_result();

  $spaces = [];
  while ($row = $res->fetch_assoc()) {
    $spaces[] = [
      "id"           => (int)$row["id"],
      "parking_name" => $row["parking_name"],
      "location"     => $row["location"],
      "latitude"     => isset($row["latitude"])  ? (float)$row["latitude"]  : null,
      "longitude"    => isset($row["longitude"]) ? (float)$row["longitude"] : null,
      "availability" => $row["availability"],

      "price_unit"   => $row["price_unit"] ?: null,
      "cars"         => isset($row["cars"])  ? (int)$row["cars"]   : null,
      "vans"         => isset($row["vans"])  ? (int)$row["vans"]   : null,
      "bikes"        => isset($row["bikes"]) ? (int)$row["bikes"]  : null,
      "buses"        => isset($row["buses"]) ? (int)$row["buses"]  : null,

      "distance_km"  => isset($row["distance_km"]) ? (float)$row["distance_km"] : null,
    ];
  }
  $stmt->close();

  send_json(["success" => true, "spaces" => $spaces]);
} catch (Throwable $e) {
  send_json(["success" => false, "message" => "Server error"], 500);
}
