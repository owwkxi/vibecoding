<?php
/**
 * approve_booking.php
 * Admin action: mark a booking as 'booked'.
 *
 * POST body (JSON or form-data):
 *   id  (integer booking ID)
 */

header('Content-Type: application/json');

require_once 'db_connection.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
    exit;
}

// Accept both JSON body and form-data
$input = json_decode(file_get_contents('php://input'), true);
$id    = (int) ($input['id'] ?? $_POST['id'] ?? 0);

if ($id <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid booking ID.']);
    exit;
}

$stmt = $conn->prepare("UPDATE bookings SET status = 'booked' WHERE id = ?");
$stmt->bind_param('i', $id);
$stmt->execute();

if ($stmt->affected_rows === 0) {
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'Booking not found or already approved.']);
} else {
    echo json_encode(['success' => true, 'message' => 'Booking approved.']);
}

$stmt->close();
$conn->close();
