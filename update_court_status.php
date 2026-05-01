<?php
/**
 * update_court_status.php
 * Admin action: toggle a court's active/inactive status.
 *
 * POST body (JSON or form-data):
 *   court     (integer 1–8)
 *   is_active (boolean / 0|1)
 */

header('Content-Type: application/json');

require_once 'db_connection.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
    exit;
}

$input    = json_decode(file_get_contents('php://input'), true) ?? [];
$court    = (int)  ($input['court']     ?? $_POST['court']     ?? 0);
$isActive = (bool) ($input['is_active'] ?? $_POST['is_active'] ?? false);

if ($court < 1 || $court > 8) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Court number must be between 1 and 8.']);
    exit;
}

$activeInt = $isActive ? 1 : 0;

$stmt = $conn->prepare('UPDATE courts SET is_active = ? WHERE court_number = ?');
$stmt->bind_param('ii', $activeInt, $court);
$stmt->execute();
$stmt->close();
$conn->close();

echo json_encode([
    'success'   => true,
    'court'     => $court,
    'is_active' => $isActive,
]);
