<?php
/**
 * get_bookings.php
 * Returns all bookings for a given date as JSON.
 * Also returns court active-status and the current GCash QR.
 *
 * GET params:
 *   date  (YYYY-MM-DD, optional — defaults to today)
 */

header('Content-Type: application/json');

require_once 'db_connection.php';

$date = $_GET['date'] ?? date('Y-m-d');

// Basic date validation
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid date format.']);
    exit;
}

// ── Fetch bookings for the requested date ─────────────────────────────────────

$stmt = $conn->prepare(
    'SELECT id,
            DATE_FORMAT(date, "%Y-%m-%d") AS date,
            TIME_FORMAT(time, "%H:%i")    AS time,
            court,
            user_name  AS name,
            user_email AS email,
            status,
            receipt_path AS receipt
     FROM bookings
     WHERE date = ?
     ORDER BY time, court'
);
$stmt->bind_param('s', $date);
$stmt->execute();
$result   = $stmt->get_result();
$bookings = [];

while ($row = $result->fetch_assoc()) {
    $row['id']    = (int) $row['id'];
    $row['court'] = (int) $row['court'];
    $bookings[]   = $row;
}
$stmt->close();

// ── Fetch court active-status ─────────────────────────────────────────────────

$courts = [];
$res = $conn->query('SELECT court_number, is_active FROM courts ORDER BY court_number');
while ($row = $res->fetch_assoc()) {
    $courts[(int) $row['court_number']] = (bool) $row['is_active'];
}

// ── Fetch GCash QR setting ────────────────────────────────────────────────────

$gcashQr = '';
$res = $conn->query("SELECT setting_value FROM settings WHERE setting_key = 'gcash_qr' LIMIT 1");
if ($row = $res->fetch_assoc()) {
    $gcashQr = $row['setting_value'];
}

$conn->close();

echo json_encode([
    'success'  => true,
    'date'     => $date,
    'bookings' => $bookings,
    'courts'   => $courts,
    'gcash_qr' => $gcashQr,
]);
