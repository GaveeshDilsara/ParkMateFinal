<?php
// C:\xampp\htdocs\Parkmate\db.php

/* -------- CORS -------- */
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit;
}

/* -------- Error handling -------- */
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/php-error.log');

/* -------- Output buffering (strip stray bytes/BOM) -------- */
if (!ob_get_level()) { ob_start(); }

/* -------- DB connection -------- */
$mysqli = @new mysqli("127.0.0.1", "root", "", "parkmatefinal");
if ($mysqli->connect_errno) {
  while (ob_get_level() > 0) { ob_end_clean(); }
  http_response_code(500);
  header("Content-Type: application/json; charset=UTF-8");
  echo json_encode(["success" => false, "message" => "DB connection failed"]);
  exit;
}
$mysqli->set_charset("utf8mb4");

/* -------- Helpers -------- */
function send_json($data, int $code = 200): void {
  while (ob_get_level() > 0) { ob_end_clean(); }
  http_response_code($code);
  header("Content-Type: application/json; charset=UTF-8");
  echo json_encode($data, JSON_UNESCAPED_UNICODE);
  exit;
}

/**
 * Read JSON body safely. Returns array.
 * On invalid JSON, responds 400.
 */
function read_json_body(): array {
  $raw = file_get_contents('php://input');
  if ($raw === false) { $raw = ''; }
  // Trim BOM & stray bytes
  $raw = preg_replace('/^\xEF\xBB\xBF/', '', $raw ?? '');
  $raw = trim($raw ?? '');

  if ($raw === '') { return []; }

  $data = json_decode($raw, true);
  if (json_last_error() !== JSON_ERROR_NONE) {
    send_json(['success' => false, 'message' => 'Invalid JSON body'], 400);
  }
  return is_array($data) ? $data : [];
}
