<?php
/**
 * submit_booking.php
 * Handles court reservation form submission.
 * Expects a multipart/form-data POST with:
 *   - user_name, user_email, user_phone
 *   - booking_date  (YYYY-MM-DD)
 *   - selected_slots (JSON array of "cX_hY" keys)
 *   - payment_receipt (optional image file)
 */

header('Content-Type: application/json');

require_once 'db_connection.php';

// ── Helpers ──────────────────────────────────────────────────────────────────

function json_error(string $msg, int $code = 400): void {
    http_response_code($code);
    echo json_encode(['success' => false, 'message' => $msg]);
    exit;
}

function sanitize(string $value): string {
    return htmlspecialchars(strip_tags(trim($value)), ENT_QUOTES, 'UTF-8');
}

// ── Validate request method ───────────────────────────────────────────────────

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('Method not allowed', 405);
}

// ── Collect & validate inputs ─────────────────────────────────────────────────

$name  = sanitize($_POST['user_name']  ?? '');
$email = filter_var(trim($_POST['user_email'] ?? ''), FILTER_VALIDATE_EMAIL);
$phone = sanitize($_POST['user_phone'] ?? '');
$date  = sanitize($_POST['booking_date'] ?? '');
$slotsRaw = $_POST['selected_slots'] ?? '';

if (!$name)  json_error('Full name is required.');
if (!$email) json_error('A valid email address is required.');
if (!$phone) json_error('Phone number is required.');
if (!$date || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) json_error('Invalid booking date.');

$slots = json_decode($slotsRaw, true);
if (!is_array($slots) || count($slots) === 0) json_error('No slots selected.');

// Validate each slot key format: cX_hY
foreach ($slots as $slot) {
    if (!preg_match('/^c(\d+)_h(\d+)$/', $slot)) {
        json_error('Invalid slot format: ' . htmlspecialchars($slot));
    }
}

// ── Handle receipt upload ─────────────────────────────────────────────────────

$receiptPath = null;

if (!empty($_FILES['payment_receipt']['tmp_name'])) {
    $file     = $_FILES['payment_receipt'];
    $maxBytes = 10 * 1024 * 1024; // 10 MB

    if ($file['error'] !== UPLOAD_ERR_OK) {
        json_error('File upload error (code ' . $file['error'] . ').');
    }
    if ($file['size'] > $maxBytes) {
        json_error('Receipt image must be under 10 MB.');
    }

    // Verify it is actually an image via MIME sniffing
    $finfo    = new finfo(FILEINFO_MIME_TYPE);
    $mimeType = $finfo->file($file['tmp_name']);
    $allowed  = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    if (!in_array($mimeType, $allowed, true)) {
        json_error('Only JPG, PNG, GIF, or WEBP images are accepted.');
    }

    $uploadDir = __DIR__ . '/uploads/receipts/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }

    $ext         = pathinfo($file['name'], PATHINFO_EXTENSION);
    $safeName    = bin2hex(random_bytes(16)) . '.' . strtolower($ext);
    $destination = $uploadDir . $safeName;

    if (!move_uploaded_file($file['tmp_name'], $destination)) {
        json_error('Could not save the uploaded file.', 500);
    }

    $receiptPath = 'uploads/receipts/' . $safeName;
}

// ── Determine initial status ──────────────────────────────────────────────────

// If a receipt was uploaded → awaiting (admin needs to verify payment)
// Otherwise → pending (no payment proof yet)
$status = $receiptPath ? 'awaiting' : 'pending';

// ── Insert bookings inside a transaction ─────────────────────────────────────

$conn->begin_transaction();

try {
    $stmt = $conn->prepare(
        'INSERT INTO bookings (date, time, court, user_name, user_email, user_phone, status, receipt_path)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );

    $inserted = 0;

    foreach ($slots as $slot) {
        preg_match('/^c(\d+)_h(\d+)$/', $slot, $m);
        $court = (int) $m[1];
        $hour  = (int) $m[2];
        $time  = sprintf('%02d:00:00', $hour);

        // Check the slot is still free (race-condition guard)
        $check = $conn->prepare(
            "SELECT id FROM bookings
             WHERE date = ? AND time = ? AND court = ?
               AND status IN ('pending','awaiting','booked')
             LIMIT 1"
        );
        $check->bind_param('ssi', $date, $time, $court);
        $check->execute();
        $check->store_result();

        if ($check->num_rows > 0) {
            $check->close();
            throw new RuntimeException("Court $court at " . date('g:i A', mktime($hour)) . " is no longer available.");
        }
        $check->close();

        $stmt->bind_param('ssisssss', $date, $time, $court, $name, $email, $phone, $status, $receiptPath);
        $stmt->execute();
        $inserted++;
    }

    $stmt->close();
    $conn->commit();

    echo json_encode([
        'success'  => true,
        'message'  => 'Booking submitted successfully!',
        'status'   => $status,
        'inserted' => $inserted,
    ]);

} catch (RuntimeException $e) {
    $conn->rollback();
    json_error($e->getMessage());
} catch (Exception $e) {
    $conn->rollback();
    error_log('submit_booking error: ' . $e->getMessage());
    json_error('A server error occurred. Please try again.', 500);
}

$conn->close();
