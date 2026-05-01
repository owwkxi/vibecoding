<?php
/**
 * update_qr.php
 * Admin action: replace the GCash QR code image.
 *
 * POST multipart/form-data:
 *   new_gcash_qr  (image file)
 */

header('Content-Type: application/json');

require_once 'db_connection.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
    exit;
}

if (empty($_FILES['new_gcash_qr']['tmp_name'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'No file uploaded.']);
    exit;
}

$file     = $_FILES['new_gcash_qr'];
$maxBytes = 5 * 1024 * 1024; // 5 MB

if ($file['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Upload error (code ' . $file['error'] . ').']);
    exit;
}

if ($file['size'] > $maxBytes) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'File must be under 5 MB.']);
    exit;
}

$finfo    = new finfo(FILEINFO_MIME_TYPE);
$mimeType = $finfo->file($file['tmp_name']);
$allowed  = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

if (!in_array($mimeType, $allowed, true)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Only JPG, PNG, GIF, or WEBP images are accepted.']);
    exit;
}

$uploadDir = __DIR__ . '/uploads/qr/';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

$ext         = pathinfo($file['name'], PATHINFO_EXTENSION);
$safeName    = 'gcash_qr_' . bin2hex(random_bytes(8)) . '.' . strtolower($ext);
$destination = $uploadDir . $safeName;

if (!move_uploaded_file($file['tmp_name'], $destination)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Could not save the file.']);
    exit;
}

$relativePath = 'uploads/qr/' . $safeName;

// Persist the new path in settings
$stmt = $conn->prepare(
    "INSERT INTO settings (setting_key, setting_value) VALUES ('gcash_qr', ?)
     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)"
);
$stmt->bind_param('s', $relativePath);
$stmt->execute();
$stmt->close();
$conn->close();

echo json_encode([
    'success' => true,
    'message' => 'QR code updated.',
    'path'    => $relativePath,
]);
