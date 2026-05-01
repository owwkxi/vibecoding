/**
 * PicklePro — Court Reservation System
 * Full interactive frontend logic — PHP backend edition
 */

// =============================================
// CONFIG
// =============================================
const CONFIG = {
  courts: 8,
  startHour: 7,   // 7 AM
  endHour: 22,    // 10 PM
  slotDuration: 60, // minutes per slot
  pricePerHour: 300,  // ₱ per court per hour
};

// =============================================
// STATE
// =============================================
const state = {
  selectedSlots: new Set(),
  currentView: 'booking',
  bookings: [],       // loaded from PHP
  courts: {},         // court_number → is_active (from PHP)
};

// =============================================
// UTILITY HELPERS
// =============================================
function getTodayStr() {
  return new Date().toISOString().split('T')[0];
}

function formatTime(hour) {
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${h}:00 ${ampm}`;
}

function formatSlotKey(court, hour) {
  return `c${court}_h${hour}`;
}

function parseSlotKey(key) {
  const [c, h] = key.split('_');
  return { court: parseInt(c.substring(1)), hour: parseInt(h.substring(1)) };
}

function getSlotStatus(court, hour) {
  // If the court is disabled, treat it as booked (unavailable)
  if (state.courts[court] === false) return 'booked';

  const booking = state.bookings.find(b =>
    b.court === court &&
    parseInt(b.time.split(':')[0]) === hour
  );
  if (!booking) return 'available';
  return booking.status;
}

function getBookingName(court, hour) {
  const booking = state.bookings.find(b =>
    b.court === court &&
    parseInt(b.time.split(':')[0]) === hour
  );
  return booking ? booking.name : null;
}

// =============================================
// PHP API CALLS
// =============================================

/**
 * Load bookings for the selected date from the PHP backend.
 * Updates state.bookings and state.courts, then rebuilds the grid.
 */
async function loadBookings(date) {
  try {
    const res  = await fetch(`get_bookings.php?date=${encodeURIComponent(date)}`);
    const data = await res.json();

    if (!data.success) {
      showToast('Could not load bookings: ' + data.message, 'error');
      return;
    }

    state.bookings = data.bookings;

    // Convert courts object keys to integers
    state.courts = {};
    for (const [num, active] of Object.entries(data.courts)) {
      state.courts[parseInt(num)] = active;
    }

    // Update GCash QR if provided
    if (data.gcash_qr) {
      const qrEls = document.querySelectorAll('#gcashQr, .qr-img');
      qrEls.forEach(el => { el.src = data.gcash_qr; });
    }

    buildScheduleGrid();
    buildAdminTable();
  } catch (err) {
    console.error('loadBookings error:', err);
    showToast('Network error loading bookings.', 'error');
  }
}

function currencyFormat(amount) {
  return '₱ ' + amount.toLocaleString('en-PH', { minimumFractionDigits: 2 });
}

// =============================================
// SCHEDULE GRID BUILDER
// =============================================
function buildScheduleGrid() {
  const grid = document.getElementById('scheduleGrid');

  // Clear only slot rows (keep headers)
  const headers = Array.from(grid.querySelectorAll('.grid-header'));
  grid.innerHTML = '';
  headers.forEach(h => grid.appendChild(h));

  const totalHours = CONFIG.endHour - CONFIG.startHour;

  for (let h = 0; h < totalHours; h++) {
    const hour = CONFIG.startHour + h;
    const timeLabel = document.createElement('div');
    timeLabel.className = 'time-label';
    timeLabel.textContent = formatTime(hour);
    grid.appendChild(timeLabel);

    for (let c = 1; c <= CONFIG.courts; c++) {
      const status = getSlotStatus(c, hour);
      const key = formatSlotKey(c, hour);
      const isSelected = state.selectedSlots.has(key);

      const card = document.createElement('div');
      card.className = `slot-card status-${isSelected ? 'selected' : status}`;
      card.dataset.court = c;
      card.dataset.hour = hour;
      card.dataset.key = key;
      card.dataset.status = status;

      const dot = document.createElement('div');
      dot.className = 'slot-dot';

      const label = document.createElement('div');
      label.className = 'slot-label';

      const sub = document.createElement('div');
      sub.className = 'slot-sub';

      if (isSelected) {
        label.textContent = 'Selected';
        sub.textContent = '✓ Tap to deselect';
      } else if (status === 'available') {
        label.textContent = 'Available';
        sub.textContent = `₱${CONFIG.pricePerHour}/hr`;
      } else if (status === 'booked') {
        label.textContent = 'Booked';
        sub.textContent = getBookingName(c, hour) || 'Reserved';
      } else if (status === 'pending') {
        label.textContent = 'Pending';
        sub.textContent = 'Processing…';
      } else if (status === 'awaiting') {
        label.textContent = 'Awaiting';
        sub.textContent = 'Payment check';
      }

      card.appendChild(dot);
      card.appendChild(label);
      card.appendChild(sub);

      if (status === 'available') {
        card.addEventListener('click', () => toggleSlot(key, card));
      }

      grid.appendChild(card);
    }
  }
}

// =============================================
// SLOT SELECTION
// =============================================
function toggleSlot(key, card) {
  if (state.selectedSlots.has(key)) {
    state.selectedSlots.delete(key);
    card.className = 'slot-card status-available';
    card.querySelector('.slot-label').textContent = 'Available';
    card.querySelector('.slot-sub').textContent = `₱${CONFIG.pricePerHour}/hr`;
  } else {
    state.selectedSlots.add(key);
    card.className = 'slot-card status-selected';
    card.querySelector('.slot-label').textContent = 'Selected';
    card.querySelector('.slot-sub').textContent = '✓ Tap to deselect';
  }
  updateBookingBar();
}

function updateBookingBar() {
  const count = state.selectedSlots.size;
  const bar = document.getElementById('bookingBar');
  const countEl = document.getElementById('selectionCount');
  const detailEl = document.getElementById('selectionDetail');
  const btnConfirm = document.getElementById('btnConfirm');

  if (count > 0) {
    bar.classList.add('visible');
    countEl.textContent = `${count} slot${count > 1 ? 's' : ''} selected`;
    const total = count * CONFIG.pricePerHour;
    detailEl.textContent = `Total: ${currencyFormat(total)}`;
    btnConfirm.disabled = false;
  } else {
    bar.classList.remove('visible');
    countEl.textContent = '0 slots selected';
    detailEl.textContent = 'Click available slots to select';
    btnConfirm.disabled = true;
  }
}

// =============================================
// MODAL MANAGEMENT
// =============================================
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.remove('open');
  document.body.style.overflow = '';
}

function openBookingModal() {
  populateBookingSummary();
  openModal('bookingModal');
}

function populateBookingSummary() {
  const summaryEl = document.getElementById('bookingSummary');
  const amountEl = document.getElementById('gcashAmount');
  const slotsInput = document.getElementById('selected_slots');
  const dateInput = document.getElementById('booking_date_field');

  // Group slots by court
  const byCourt = {};
  state.selectedSlots.forEach(key => {
    const { court, hour } = parseSlotKey(key);
    if (!byCourt[court]) byCourt[court] = [];
    byCourt[court].push(hour);
  });

  const total = state.selectedSlots.size * CONFIG.pricePerHour;
  const dateVal = document.getElementById('booking_date').value;

  let html = `
    <div class="summary-row">
      <span class="summary-label">Date</span>
      <span class="summary-value">${dateVal || getTodayStr()}</span>
    </div>
    <div class="summary-row">
      <span class="summary-label">Courts</span>
      <span class="summary-value">`;

  Object.keys(byCourt).sort((a,b) => a-b).forEach(court => {
    html += `<span class="summary-tag">Court ${court}</span>`;
  });

  html += `</span></div><div class="summary-row"><span class="summary-label">Time Slots</span><span class="summary-value">`;

  Object.entries(byCourt).forEach(([court, hours]) => {
    hours.sort((a,b) => a-b).forEach(hour => {
      html += `<span class="summary-tag">${formatTime(hour)}</span>`;
    });
  });

  html += `</span></div>
    <div class="summary-row">
      <span class="summary-label">Total</span>
      <span class="summary-value" style="color:var(--forest);font-size:1.05rem">${currencyFormat(total)}</span>
    </div>`;

  summaryEl.innerHTML = html;
  amountEl.textContent = currencyFormat(total);
  slotsInput.value = JSON.stringify(Array.from(state.selectedSlots));
  dateInput.value = dateVal;
}

// =============================================
// RECEIPT UPLOAD HANDLER
// =============================================
function initUploadZone() {
  const zone = document.getElementById('uploadZone');
  const fileInput = document.getElementById('payment_receipt');
  const placeholder = document.getElementById('uploadPlaceholder');
  const preview = document.getElementById('receiptPreview');

  zone.addEventListener('click', () => fileInput.click());

  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('dragover');
  });

  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));

  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) previewReceipt(file);
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) previewReceipt(fileInput.files[0]);
  });

  function previewReceipt(file) {
    if (!file.type.startsWith('image/')) {
      showToast('Please upload an image file', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      preview.src = e.target.result;
      preview.classList.remove('hidden');
      placeholder.classList.add('hidden');
    };
    reader.readAsDataURL(file);
  }
}

// =============================================
// VIEW SWITCHING
// =============================================
function switchView(view) {
  state.currentView = view;
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  document.getElementById(`view-${view}`).classList.add('active');
  document.querySelector(`[data-view="${view}"]`).classList.add('active');

  if (view === 'admin') buildAdminTable();
}

// =============================================
// ADMIN TABLE
// =============================================
function buildAdminTable() {
  const tbody = document.getElementById('adminTableBody');
  const rows = mockBookings.map(b => `
    <tr>
      <td>${b.date}</td>
      <td>${b.time}</td>
      <td>Court ${b.court}</td>
      <td>${b.email}</td>
      <td>${b.name}</td>
      <td>
        <span class="status-badge badge-${b.status}">
          <span class="badge-dot"></span>
          ${b.status.charAt(0).toUpperCase() + b.status.slice(1)}
        </span>
      </td>
      <td>
        ${b.receipt
          ? `<button class="btn-view-receipt" onclick="viewReceipt('${b.receipt}', '${b.name}', '${b.date}', '${b.time}', ${b.court})">View Receipt</button>`
          : '<span style="color:var(--grey-400);font-size:0.78rem">No receipt</span>'}
        ${b.status === 'awaiting'
          ? `<button class="btn-approve" onclick="approveBooking(${b.id})">Approve</button>`
          : ''}
      </td>
    </tr>
  `).join('');
  tbody.innerHTML = rows;
}

function viewReceipt(src, name, date, time, court) {
  document.getElementById('receiptModalImg').src = src;
  document.getElementById('receiptMeta').innerHTML =
    `<strong>${name}</strong> · Court ${court} · ${date} · ${time}`;
  openModal('receiptModal');
}

function approveBooking(id) {
  fetch('approve_booking.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  })
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        // Update local state so the table refreshes immediately
        const booking = state.bookings.find(b => b.id === id);
        if (booking) booking.status = 'booked';
        buildAdminTable();
        showToast('Booking approved!', 'success');
      } else {
        showToast(data.message || 'Could not approve booking.', 'error');
      }
    })
    .catch(() => showToast('Network error.', 'error'));
}

// =============================================
// ADMIN SEARCH & FILTER
// =============================================
function initAdminFilters() {
  const search = document.getElementById('adminSearch');
  const filter = document.getElementById('statusFilter');

  function filterTable() {
    const query = search.value.toLowerCase();
    const status = filter.value;
    const rows = document.querySelectorAll('#adminTableBody tr');
    rows.forEach(row => {
      const text = row.textContent.toLowerCase();
      const hasQuery = text.includes(query);
      const hasStatus = !status || text.includes(status);
      row.style.display = hasQuery && hasStatus ? '' : 'none';
    });
  }

  search.addEventListener('input', filterTable);
  filter.addEventListener('change', filterTable);
}

// =============================================
// ADMIN TABS
// =============================================
function initAdminTabs() {
  document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const id = tab.dataset.tab;
      document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`tab-${id}`).classList.add('active');
    });
  });
}

// =============================================
// COURT TOGGLES (Settings) — synced to PHP
// =============================================
function buildCourtToggles() {
  const container = document.querySelector('.court-toggles');
  if (!container) return;
  let html = '';
  for (let i = 1; i <= CONFIG.courts; i++) {
    const isActive = state.courts[i] !== false; // default true
    html += `
      <div class="court-toggle-row">
        <span class="toggle-name">Court ${i}</span>
        <label class="toggle-switch">
          <input type="checkbox" name="court_${i}_active" id="court_${i}_active"
                 data-court="${i}" ${isActive ? 'checked' : ''}>
          <span class="toggle-slider"></span>
        </label>
      </div>`;
  }
  container.innerHTML = html;

  // Attach change listeners
  container.querySelectorAll('input[type="checkbox"]').forEach(toggle => {
    toggle.addEventListener('change', async () => {
      const court    = parseInt(toggle.dataset.court);
      const isActive = toggle.checked;

      try {
        const res  = await fetch('update_court_status.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ court, is_active: isActive }),
        });
        const data = await res.json();
        if (data.success) {
          state.courts[court] = isActive;
          buildScheduleGrid();
          showToast(`Court ${court} ${isActive ? 'enabled' : 'disabled'}.`, 'success');
        } else {
          toggle.checked = !isActive; // revert
          showToast(data.message || 'Could not update court.', 'error');
        }
      } catch {
        toggle.checked = !isActive;
        showToast('Network error.', 'error');
      }
    });
  });
}

// =============================================
// TOAST NOTIFICATION
// =============================================
function showToast(msg, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast${type ? ' ' + type : ''} show`;
  setTimeout(() => { toast.className = 'toast'; }, 3000);
}

// =============================================
// DATE PICKER
// =============================================
function initDatePicker() {
  const dateInput = document.getElementById('booking_date');
  dateInput.value = getTodayStr();
  dateInput.addEventListener('change', () => {
    loadBookings(dateInput.value);
    showToast(`Showing courts for ${dateInput.value}`);
  });
}

// =============================================
// ADMIN TABLE — uses state.bookings
// =============================================
function buildAdminTable() {
  const tbody = document.getElementById('adminTableBody');
  const rows = state.bookings.map(b => `
    <tr>
      <td>${b.date}</td>
      <td>${b.time}</td>
      <td>Court ${b.court}</td>
      <td>${b.email}</td>
      <td>${b.name}</td>
      <td>
        <span class="status-badge badge-${b.status}">
          <span class="badge-dot"></span>
          ${b.status.charAt(0).toUpperCase() + b.status.slice(1)}
        </span>
      </td>
      <td>
        ${b.receipt
          ? `<button class="btn-view-receipt" onclick="viewReceipt('${b.receipt}', '${b.name}', '${b.date}', '${b.time}', ${b.court})">View Receipt</button>`
          : '<span style="color:var(--grey-400);font-size:0.78rem">No receipt</span>'}
        ${b.status === 'awaiting'
          ? `<button class="btn-approve" onclick="approveBooking(${b.id})">Approve</button>`
          : ''}
      </td>
    </tr>
  `).join('');
  tbody.innerHTML = rows || '<tr><td colspan="7" style="text-align:center;color:var(--grey-400);padding:24px">No bookings for this date.</td></tr>';
}

// =============================================
// FORM SUBMISSION — real PHP backend
// =============================================
function initBookingForm() {
  document.getElementById('bookingForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const name  = document.getElementById('user_name').value.trim();
    const email = document.getElementById('user_email').value.trim();
    const phone = document.getElementById('user_phone').value.trim();

    if (!name || !email || !phone) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    const formData = new FormData(document.getElementById('bookingForm'));
    // Ensure the hidden fields are current
    formData.set('selected_slots', JSON.stringify(Array.from(state.selectedSlots)));
    formData.set('booking_date',   document.getElementById('booking_date').value);

    // Attach the receipt file if one was chosen
    const receiptFile = document.getElementById('payment_receipt').files[0];
    if (receiptFile) {
      formData.set('payment_receipt', receiptFile);
    }

    const submitBtn = document.querySelector('#bookingForm .btn-primary');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting…';

    try {
      const res  = await fetch('submit_booking.php', { method: 'POST', body: formData });
      const data = await res.json();

      if (data.success) {
        closeModal('bookingModal');
        state.selectedSlots.clear();
        updateBookingBar();

        // Reload bookings from server so the grid reflects the new entries
        await loadBookings(document.getElementById('booking_date').value);

        showToast('🎉 Booking submitted! Awaiting confirmation.', 'success');

        document.getElementById('bookingForm').reset();
        document.getElementById('receiptPreview').classList.add('hidden');
        document.getElementById('uploadPlaceholder').classList.remove('hidden');
      } else {
        showToast(data.message || 'Submission failed.', 'error');
      }
    } catch (err) {
      console.error('submit_booking error:', err);
      showToast('Network error. Please try again.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16"><polyline points="20 6 9 17 4 12"/></svg>
        Submit Booking`;
    }
  });
}

// Admin QR upload — posts to update_qr.php
function initAdminQrUpload() {
  const qrInput = document.getElementById('new_gcash_qr');
  const qrPreview = document.getElementById('adminQrPreview');
  if (!qrInput) return;

  // Live preview before save
  qrInput.addEventListener('change', () => {
    const file = qrInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = qrPreview.querySelector('.qr-img');
      if (img) img.src = e.target.result;
      const modalQr = document.getElementById('gcashQr');
      if (modalQr) modalQr.src = e.target.result;
      showToast('QR preview updated — click "Update QR Code" to save.', 'success');
    };
    reader.readAsDataURL(file);
  });

  // Handle the settings form submit
  const settingsForm = qrInput.closest('form');
  if (settingsForm) {
    settingsForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!qrInput.files[0]) {
        showToast('Please choose a QR image first.', 'error');
        return;
      }

      const formData = new FormData();
      formData.append('new_gcash_qr', qrInput.files[0]);

      try {
        const res  = await fetch('update_qr.php', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success) {
          showToast('GCash QR code saved!', 'success');
        } else {
          showToast(data.message || 'Could not save QR.', 'error');
        }
      } catch {
        showToast('Network error saving QR.', 'error');
      }
    });
  }
}

// =============================================
// EVENT LISTENERS INIT
// =============================================
function initEventListeners() {
  // Nav view switching
  document.querySelectorAll('.nav-link[data-view]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      switchView(link.dataset.view);
    });
  });

  // Confirm booking button
  document.getElementById('btnConfirm').addEventListener('click', openBookingModal);

  // Modal closes
  document.getElementById('modalClose').addEventListener('click', () => closeModal('bookingModal'));
  document.getElementById('btnCancel').addEventListener('click', () => closeModal('bookingModal'));
  document.getElementById('receiptModalClose').addEventListener('click', () => closeModal('receiptModal'));

  // Close on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });

  // Keyboard ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.open').forEach(m => closeModal(m.id));
    }
  });
}

// =============================================
// INIT
// =============================================
document.addEventListener('DOMContentLoaded', () => {
  initDatePicker();
  buildScheduleGrid();
  buildCourtToggles();
  initUploadZone();
  initEventListeners();
  initAdminTabs();
  initAdminFilters();
  initBookingForm();
  initAdminQrUpload();
  buildAdminTable();
});
