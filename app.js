/**
 * PicklePro — Court Reservation System
 * Full interactive frontend logic
 * PHP-compatible: all inputs have id and name attributes
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
};

// =============================================
// MOCK DATA — simulates PHP backend responses
// =============================================
const mockBookings = [
  { id: 1, date: getTodayStr(), time: '08:00', court: 2, email: 'mario@email.com', name: 'Mario Reyes', status: 'booked',   receipt: 'https://placehold.co/300x500/1a5c2e/white?text=GCash+Receipt' },
  { id: 2, date: getTodayStr(), time: '09:00', court: 2, email: 'mario@email.com', name: 'Mario Reyes', status: 'booked',   receipt: 'https://placehold.co/300x500/1a5c2e/white?text=GCash+Receipt' },
  { id: 3, date: getTodayStr(), time: '10:00', court: 5, email: 'ana@email.com',   name: 'Ana Santos',  status: 'awaiting', receipt: 'https://placehold.co/300x500/c9963a/black?text=GCash+Receipt' },
  { id: 4, date: getTodayStr(), time: '13:00', court: 1, email: 'ben@email.com',   name: 'Ben Cruz',    status: 'pending',  receipt: null },
  { id: 5, date: getTodayStr(), time: '14:00', court: 3, email: 'cora@email.com',  name: 'Cora Lim',   status: 'booked',   receipt: 'https://placehold.co/300x500/1a5c2e/white?text=GCash+Receipt' },
  { id: 6, date: getTodayStr(), time: '16:00', court: 7, email: 'dante@email.com', name: 'Dante Go',   status: 'awaiting', receipt: 'https://placehold.co/300x500/c9963a/black?text=GCash+Receipt' },
];

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
  const booking = mockBookings.find(b =>
    b.date === document.getElementById('booking_date').value &&
    b.court === court &&
    parseInt(b.time.split(':')[0]) === hour
  );
  if (!booking) return 'available';
  return booking.status;
}

function getBookingName(court, hour) {
  const booking = mockBookings.find(b =>
    b.date === document.getElementById('booking_date').value &&
    b.court === court &&
    parseInt(b.time.split(':')[0]) === hour
  );
  return booking ? booking.name : null;
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
  const booking = mockBookings.find(b => b.id === id);
  if (booking) {
    booking.status = 'booked';
    buildAdminTable();
    showToast('Booking approved!', 'success');
  }
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
// COURT TOGGLES (Settings)
// =============================================
function buildCourtToggles() {
  const container = document.querySelector('.court-toggles');
  if (!container) return;
  let html = '';
  for (let i = 1; i <= CONFIG.courts; i++) {
    html += `
      <div class="court-toggle-row">
        <span class="toggle-name">Court ${i}</span>
        <label class="toggle-switch">
          <input type="checkbox" name="court_${i}_active" id="court_${i}_active" checked>
          <span class="toggle-slider"></span>
        </label>
      </div>`;
  }
  container.innerHTML = html;
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
    buildScheduleGrid();
    showToast(`Showing courts for ${dateInput.value}`);
  });
}

// =============================================
// FORM SUBMISSION (Demo — no real PHP yet)
// =============================================
function initBookingForm() {
  document.getElementById('bookingForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('user_name').value;
    const email = document.getElementById('user_email').value;
    const phone = document.getElementById('user_phone').value;

    if (!name || !email || !phone) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    // Add to mock bookings
    state.selectedSlots.forEach(key => {
      const { court, hour } = parseSlotKey(key);
      mockBookings.push({
        id: Date.now() + Math.random(),
        date: document.getElementById('booking_date').value,
        time: `${String(hour).padStart(2,'0')}:00`,
        court,
        email,
        name,
        status: 'pending',
        receipt: document.getElementById('receiptPreview').src || null,
      });
    });

    closeModal('bookingModal');
    state.selectedSlots.clear();
    updateBookingBar();
    buildScheduleGrid();
    showToast('🎉 Booking submitted! Awaiting confirmation.', 'success');

    document.getElementById('bookingForm').reset();
    document.getElementById('receiptPreview').classList.add('hidden');
    document.getElementById('uploadPlaceholder').classList.remove('hidden');
  });
}

// Admin QR upload preview
function initAdminQrUpload() {
  const qrInput = document.getElementById('new_gcash_qr');
  const qrPreview = document.getElementById('adminQrPreview');
  if (!qrInput) return;

  qrInput.addEventListener('change', () => {
    const file = qrInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = qrPreview.querySelector('.qr-img');
      if (img) img.src = e.target.result;
      // Also update the modal QR
      const modalQr = document.getElementById('gcashQr');
      if (modalQr) modalQr.src = e.target.result;
      showToast('QR preview updated', 'success');
    };
    reader.readAsDataURL(file);
  });
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
