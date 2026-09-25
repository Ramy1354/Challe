/**
 * Challé - Core Application Engine
 */

// Global Storage Keys
const STORAGE_KEY_AUTH = 'challe_auth';
const STORAGE_KEY_PROPERTIES = 'challe_properties';
const STORAGE_KEY_BOOKINGS = 'challe_bookings';
const STORAGE_KEY_SETTINGS = 'challe_settings';

// Default Settings
let settings = {
  currency: 'EGP',
  backupEmail: 'father@example.com'
};

// Initial Data
let properties = [];
let bookings = [];

// Currencies Symbol Dictionary
const CURRENCIES = {
  EGP: { name: 'جنيه مصري', symbol: 'ج.م' },
  SAR: { name: 'ريال سعودي', symbol: 'ر.س' },
  AED: { name: 'درهم إماراتي', symbol: 'د.إ' },
  KWD: { name: 'دينار كويتي', symbol: 'د.ك' },
  QAR: { name: 'ريال قطري', symbol: 'ر.ق' },
  BHD: { name: 'دينار بحريني', symbol: 'د.ب' },
  OMR: { name: 'ريال عماني', symbol: 'ر.ع' },
  JOD: { name: 'دينار أردني', symbol: 'د.أ' },
  USD: { name: 'US Dollar', symbol: '$' },
  EUR: { name: 'Euro', symbol: '€' },
  GBP: { name: 'British Pound', symbol: '£' },
  TRY: { name: 'Turkish Lira', symbol: '₺' }
};

// Duration Names in Arabic
const DURATION_NAMES = {
  FULL_DAY: 'يوم كامل',
  HALF_DAY_MORNING: 'فترة صباحية',
  HALF_DAY_EVENING: 'فترة مسائية',
  HOURLY: 'ساعات محددة'
};

// ================= INITIALIZATION =================
document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) lucide.createIcons();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }

  loadDatabase();
  checkAutoLogin();
  checkNotificationSupport();

  const loginForm = document.getElementById('loginForm');
  if (loginForm) loginForm.addEventListener('submit', handleLogin);

  setInterval(() => {
    updateUrgentAlerts();
    dispatchUpcomingPushNotifications();
  }, 60000);
});

// Load DB from LocalStorage
function loadDatabase() {
  const savedSettings = localStorage.getItem(STORAGE_KEY_SETTINGS);
  if (savedSettings) settings = JSON.parse(savedSettings);

  const savedProps = localStorage.getItem(STORAGE_KEY_PROPERTIES);
  properties = savedProps ? JSON.parse(savedProps) : [
    { id: 'prop-1', name: 'شاليه الياسمين', type: 'شاليه', basePrice: 2000 },
    { id: 'prop-2', name: 'شقة الإطلالة البحرية', type: 'شقة', basePrice: 1500 }
  ];

  const savedBookings = localStorage.getItem(STORAGE_KEY_BOOKINGS);
  bookings = savedBookings ? JSON.parse(savedBookings) : [];

  const currencySel = document.getElementById('currencySelector');
  if (currencySel) currencySel.value = settings.currency || 'EGP';

  const backupInput = document.getElementById('backupEmailInput');
  if (backupInput) backupInput.value = settings.backupEmail || '';
}

function saveDatabase() {
  localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  localStorage.setItem(STORAGE_KEY_PROPERTIES, JSON.stringify(properties));
  localStorage.setItem(STORAGE_KEY_BOOKINGS, JSON.stringify(bookings));
}

// ================= AUTHENTICATION =================
function checkAutoLogin() {
  const auth = JSON.parse(localStorage.getItem(STORAGE_KEY_AUTH) || '{}');
  if (auth && auth.isLoggedIn) {
    unlockApp();
  }
}

function handleLogin(e) {
  e.preventDefault();
  const u = document.getElementById('loginUser').value.trim();
  const p = document.getElementById('loginPass').value.trim();
  const remember = document.getElementById('rememberMe').checked;

  const auth = JSON.parse(localStorage.getItem(STORAGE_KEY_AUTH) || '{"user":"admin","pass":"123456"}');
  const validUser = auth.user || 'admin';
  const validPass = auth.pass || '123456';

  if (u === validUser && p === validPass) {
    if (remember) {
      localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify({ ...auth, isLoggedIn: true }));
    }
    unlockApp();
  } else {
    document.getElementById('loginError').classList.remove('hidden');
  }
}

function quickFillAdmin() {
  document.getElementById('loginUser').value = 'admin';
  document.getElementById('loginPass').value = '123456';
  document.getElementById('loginForm').dispatchEvent(new Event('submit'));
}

function unlockApp() {
  document.getElementById('authView').classList.add('hidden');
  document.getElementById('appView').classList.remove('hidden');
  renderAll();
}

function logoutAdmin() {
  const auth = JSON.parse(localStorage.getItem(STORAGE_KEY_AUTH) || '{}');
  auth.isLoggedIn = false;
  localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(auth));
  document.getElementById('appView').classList.add('hidden');
  document.getElementById('authView').classList.remove('hidden');
}

function saveAdminCredentials() {
  const newU = document.getElementById('newUsername').value.trim();
  const newP = document.getElementById('newPassword').value.trim();
  if (!newU || !newP) {
    alert('من فضلك اكتب اسم المستخدم والرقم السري الجديد');
    return;
  }
  const auth = JSON.parse(localStorage.getItem(STORAGE_KEY_AUTH) || '{}');
  auth.user = newU;
  auth.pass = newP;
  localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(auth));
  alert('تم حفظ بيانات الدخول الجديدة بنجاح!');
  document.getElementById('newUsername').value = '';
  document.getElementById('newPassword').value = '';
}

// ================= CURRENCY HELPERS =================
function formatMoney(amount) {
  const curr = CURRENCIES[settings.currency] || { symbol: settings.currency };
  const num = Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return `${num} ${curr.symbol}`;
}

function updateCurrencySetting(val) {
  settings.currency = val;
  saveDatabase();
  renderAll();
}

function saveBackupEmail() {
  const email = document.getElementById('backupEmailInput').value.trim();
  if (!email) return alert('اكتب بريداً إلكترونياً صحيحاً');
  settings.backupEmail = email;
  saveDatabase();
  alert('تم حفظ إيميل النسخ الاحتياطي بنجاح');
}

// ================= RENDER ENGINE =================
function renderAll() {
  renderProperties();
  renderPropertiesInSelect();
  renderBookings();
  updateStats();
  updateUrgentAlerts();
  if (window.lucide) lucide.createIcons();
}

function switchTab(tabName) {
  ['bookings', 'properties', 'settings'].forEach(t => {
    const el = document.getElementById(`tabContent-${t}`);
    const btn = document.getElementById(`tabBtn-${t}`);
    const mBtn = document.getElementById(`mTab-${t}`);

    if (t === tabName) {
      if (el) el.classList.remove('hidden');
      if (btn) {
        btn.classList.add('bg-emerald-700', 'text-white', 'shadow-md');
        btn.classList.remove('text-slate-600');
      }
      if (mBtn) {
        mBtn.classList.add('text-emerald-700', 'font-black');
        mBtn.classList.remove('text-slate-400', 'font-bold');
      }
    } else {
      if (el) el.classList.add('hidden');
      if (btn) {
        btn.classList.remove('bg-emerald-700', 'text-white', 'shadow-md');
        btn.classList.add('text-slate-600');
      }
      if (mBtn) {
        mBtn.classList.remove('text-emerald-700', 'font-black');
        mBtn.classList.add('text-slate-400', 'font-bold');
      }
    }
  });

  if (window.lucide) lucide.createIcons();
}

// ================= BOOKINGS LOGIC =================
function renderBookings() {
  const container = document.getElementById('bookingsList');
  const query = (document.getElementById('searchInput').value || '').trim().toLowerCase();
  const propFilter = document.getElementById('filterProperty').value;
  const statusFilter = document.getElementById('filterStatus').value;

  const now = new Date();

  const filtered = bookings.filter(b => {
    const matchQuery = !query || b.customerName.toLowerCase().includes(query) || b.customerPhone.includes(query);
    const matchProp = (propFilter === 'ALL') || b.propertyId === propFilter;
    
    let currentStatus = 'UPCOMING';
    const inDate = new Date(b.checkInDate);
    const outDate = new Date(b.checkOutDate);
    if (now >= inDate && now <= outDate) currentStatus = 'ACTIVE';
    else if (now > outDate) currentStatus = 'COMPLETED';

    const matchStatus = (statusFilter === 'ALL') || currentStatus === statusFilter;
    return matchQuery && matchProp && matchStatus;
  });

  filtered.sort((a, b) => new Date(a.checkInDate) - new Date(b.checkInDate));

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
        <div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
          <i data-lucide="calendar-x" class="w-8 h-8"></i>
        </div>
        <h3 class="text-xl font-bold text-slate-700">لا توجد حجوزات مسجلة حالياً</h3>
        <p class="text-slate-400 font-semibold text-sm">اضغط على زر "+ حجز جديد" لإضافة أول حجز بكل سهولة</p>
        <button onclick="openBookingModal()" class="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl shadow transition">
          <i data-lucide="plus" class="w-5 h-5"></i>
          <span>حجز جديد الآن</span>
        </button>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
    return;
  }

  container.innerHTML = filtered.map(b => {
    const prop = properties.find(p => p.id === b.propertyId) || { name: 'منشأة محذوفة' };
    const inDate = new Date(b.checkInDate);
    const outDate = new Date(b.checkOutDate);

    const diffMs = inDate - now;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    let badgeClass = 'bg-blue-50 text-blue-800 border-blue-200';
    let badgeText = `متبقي ${diffDays} يوم`;

    if (now >= inDate && now <= outDate) {
      badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300 animate-pulse';
      badgeText = 'العميل بالمنشأة حالياً';
    } else if (now > outDate) {
      badgeClass = 'bg-slate-100 text-slate-600 border-slate-200';
      badgeText = 'حجز منتهي';
    } else if (diffDays === 0) {
      badgeClass = 'bg-amber-100 text-amber-900 border-amber-300 font-black';
      badgeText = 'الوصول اليوم!';
    } else if (diffDays === 1) {
      badgeClass = 'bg-amber-100 text-amber-900 border-amber-300 font-black';
      badgeText = 'الوصول غداً!';
    }

    return `
      <div class="bg-white rounded-3xl p-5 md:p-6 border border-slate-200 shadow-sm hover:shadow-md transition space-y-4">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <div class="flex items-center gap-2">
            <span class="w-3 h-3 rounded-full ${now >= inDate && now <= outDate ? 'bg-emerald-500 ring-4 ring-emerald-100' : 'bg-slate-300'}"></span>
            <span class="text-base md:text-lg font-black text-slate-800">${prop.name}</span>
            <span class="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg font-bold">${DURATION_NAMES[b.durationType] || b.durationType}</span>
          </div>
          <span class="text-xs font-black px-3 py-1.5 rounded-xl border ${badgeClass}">
            ${badgeText}
          </span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <div>
            <p class="text-xs text-slate-500 font-bold mb-1">بيانات العميل</p>
            <p class="text-lg font-black text-slate-900 flex items-center gap-1.5">
              <i data-lucide="user" class="w-4 h-4 text-emerald-600"></i> ${b.customerName}
            </p>
            <p class="text-sm font-bold text-slate-600 flex items-center gap-1.5 mt-0.5" dir="ltr">
              <i data-lucide="phone" class="w-4 h-4 text-slate-400"></i> ${b.customerPhone}
            </p>
          </div>

          <div>
            <p class="text-xs text-slate-500 font-bold mb-1">مواعيد الدخول والخروج</p>
            <p class="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
              <i data-lucide="calendar" class="w-4 h-4 text-emerald-600"></i>
              دخول: ${inDate.toLocaleDateString('ar-EG', { weekday: 'short', month: 'short', day: 'numeric' })} (${inDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})})
            </p>
            <p class="text-sm font-extrabold text-slate-800 flex items-center gap-1.5 mt-1">
              <i data-lucide="calendar-check" class="w-4 h-4 text-rose-600"></i>
              خروج: ${outDate.toLocaleDateString('ar-EG', { weekday: 'short', month: 'short', day: 'numeric' })} (${outDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})})
            </p>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-2 text-center bg-emerald-50/60 p-3 rounded-2xl border border-emerald-100">
          <div>
            <p class="text-xs font-bold text-slate-500">الإجمالي</p>
            <p class="text-base md:text-lg font-black text-slate-900">${formatMoney(b.totalAmount)}</p>
          </div>
          <div>
            <p class="text-xs font-bold text-teal-700">العربون المدفوع</p>
            <p class="text-base md:text-lg font-black text-teal-800">${formatMoney(b.depositAmount)}</p>
          </div>
          <div>
            <p class="text-xs font-bold text-rose-700">المتبقي للتحصيل</p>
            <p class="text-base md:text-lg font-black text-rose-700">${formatMoney(b.remainingAmount)}</p>
          </div>
        </div>

        ${b.furnitureStatus ? `
          <div class="bg-amber-100/70 p-3 rounded-2xl border border-amber-300 text-sm font-extrabold text-amber-950 flex items-center gap-2">
            <i data-lucide="sofa" class="w-4 h-4 text-amber-800 shrink-0"></i>
            <span>حالة العفش: ${b.furnitureStatus}</span>
          </div>
        ` : ''}

        ${b.notes ? `
          <div class="bg-slate-100 p-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 flex items-start gap-2">
            <i data-lucide="message-square" class="w-4 h-4 text-slate-500 mt-0.5 shrink-0"></i>
            <span>ملاحظات: ${b.notes}</span>
          </div>
        ` : ''}

        <div class="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-slate-100">
          <button onclick="sendWhatsAppReceipt('${b.id}')" class="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-4 py-2.5 rounded-xl shadow-sm transition text-sm">
            <i data-lucide="message-circle" class="w-4 h-4"></i>
            <span>واتساب العميل</span>
          </button>

          <div class="flex items-center gap-2">
            <button onclick="printReceipt('${b.id}')" class="p-2.5 text-slate-500 hover:text-slate-800 bg-slate-100 rounded-xl transition" title="طباعة سند">
              <i data-lucide="printer" class="w-4 h-4"></i>
            </button>
            <button onclick="openBookingModal('${b.id}')" class="p-2.5 text-emerald-700 hover:text-emerald-900 bg-emerald-50 rounded-xl transition" title="تعديل">
              <i data-lucide="pencil" class="w-4 h-4"></i>
            </button>
            <button onclick="deleteBooking('${b.id}')" class="p-2.5 text-rose-600 hover:text-rose-800 bg-rose-50 rounded-xl transition" title="حذف">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons();
}

function calculateRemainingBalance() {
  const tot = parseFloat(document.getElementById('totalAmount').value) || 0;
  const dep = parseFloat(document.getElementById('depositAmount').value) || 0;
  const rem = Math.max(0, tot - dep);
  document.getElementById('remainingAmount').value = rem;
}

function setFurnitureQuickText(text) {
  const el = document.getElementById('furnitureStatus');
  if (el) el.value = text;
}

function openBookingModal(editId = null) {
  const modal = document.getElementById('bookingModal');
  const title = document.getElementById('bookingModalTitle');
  const form = document.getElementById('bookingForm');
  form.reset();

  renderPropertiesInSelect();

  if (editId) {
    const item = bookings.find(b => b.id === editId);
    if (!item) return;
    title.textContent = 'تعديل الحجز';
    document.getElementById('editBookingId').value = item.id;
    document.getElementById('customerName').value = item.customerName;
    document.getElementById('customerPhone').value = item.customerPhone;
    document.getElementById('bookingPropertySelect').value = item.propertyId;
    document.getElementById('bookingDurationType').value = item.durationType;
    document.getElementById('checkInDate').value = item.checkInDate;
    document.getElementById('checkOutDate').value = item.checkOutDate;
    document.getElementById('totalAmount').value = item.totalAmount;
    document.getElementById('depositAmount').value = item.depositAmount;
    document.getElementById('remainingAmount').value = item.remainingAmount;
    document.getElementById('furnitureStatus').value = item.furnitureStatus || '';
    document.getElementById('bookingNotes').value = item.notes || '';
  } else {
    title.textContent = 'إضافة حجز جديد';
    document.getElementById('editBookingId').value = '';
    
    const now = new Date();
    now.setDate(now.getDate() + 1);
    now.setHours(14, 0, 0, 0);
    document.getElementById('checkInDate').value = now.toISOString().slice(0, 16);
    
    now.setDate(now.getDate() + 1);
    now.setHours(12, 0, 0, 0);
    document.getElementById('checkOutDate').value = now.toISOString().slice(0, 16);
    document.getElementById('furnitureStatus').value = '';
  }

  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeBookingModal() {
  const modal = document.getElementById('bookingModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

function handleBookingSubmit(e) {
  e.preventDefault();
  const editId = document.getElementById('editBookingId').value;
  const total = parseFloat(document.getElementById('totalAmount').value) || 0;
  const deposit = parseFloat(document.getElementById('depositAmount').value) || 0;

  const bookingData = {
    id: editId || 'book-' + Date.now(),
    customerName: document.getElementById('customerName').value.trim(),
    customerPhone: document.getElementById('customerPhone').value.trim(),
    propertyId: document.getElementById('bookingPropertySelect').value,
    durationType: document.getElementById('bookingDurationType').value,
    checkInDate: document.getElementById('checkInDate').value,
    checkOutDate: document.getElementById('checkOutDate').value,
    totalAmount: total,
    depositAmount: deposit,
    remainingAmount: Math.max(0, total - deposit),
    furnitureStatus: (document.getElementById('furnitureStatus').value || '').trim(),
    notes: document.getElementById('bookingNotes').value.trim()
  };

  if (editId) {
    const idx = bookings.findIndex(b => b.id === editId);
    if (idx !== -1) bookings[idx] = bookingData;
  } else {
    bookings.push(bookingData);
  }

  saveDatabase();
  closeBookingModal();
  renderAll();
}

function deleteBooking(id) {
  if (confirm('هل أنت متأكد من رغبتك في حذف هذا الحجز تماماً؟')) {
    bookings = bookings.filter(b => b.id !== id);
    saveDatabase();
    renderAll();
  }
}

// ================= PROPERTIES LOGIC =================
function renderProperties() {
  const grid = document.getElementById('propertiesGrid');
  grid.innerHTML = properties.map(p => `
    <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
      <div class="flex items-center justify-between">
        <h4 class="font-black text-lg text-slate-800">${p.name}</h4>
        <span class="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-lg">${p.type}</span>
      </div>
      <p class="text-slate-500 font-bold text-sm">
        السعر المبدئي: <span class="text-slate-900 font-black">${formatMoney(p.basePrice)}</span>
      </p>
      <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
        <button onclick="openPropertyModal('${p.id}')" class="p-2 text-emerald-700 hover:bg-emerald-50 rounded-lg transition" title="تعديل">
          <i data-lucide="pencil" class="w-4 h-4"></i>
        </button>
        <button onclick="deleteProperty('${p.id}')" class="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition" title="حذف">
          <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>
      </div>
    </div>
  `).join('');

  if (window.lucide) lucide.createIcons();
}

function renderPropertiesInSelect() {
  const sel = document.getElementById('bookingPropertySelect');
  const filterSel = document.getElementById('filterProperty');
  
  if (sel) {
    sel.innerHTML = properties.map(p => `<option value="${p.id}">${p.name} (${p.type})</option>`).join('');
  }
  if (filterSel) {
    filterSel.innerHTML = '<option value="ALL">جميع المنشآت</option>' + 
      properties.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
  }
}

function openPropertyModal(id = null) {
  const modal = document.getElementById('propertyModal');
  const title = document.getElementById('propertyModalTitle');
  const form = document.getElementById('propertyForm');
  form.reset();

  if (id) {
    const item = properties.find(p => p.id === id);
    if (!item) return;
    title.textContent = 'تعديل المنشأة';
    document.getElementById('editPropertyId').value = item.id;
    document.getElementById('propName').value = item.name;
    document.getElementById('propType').value = item.type;
    document.getElementById('propBasePrice').value = item.basePrice || 0;
  } else {
    title.textContent = 'إضافة منشأة جديدة';
    document.getElementById('editPropertyId').value = '';
  }

  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closePropertyModal() {
  const modal = document.getElementById('propertyModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

function handlePropertySubmit(e) {
  e.preventDefault();
  const editId = document.getElementById('editPropertyId').value;
  const propData = {
    id: editId || 'prop-' + Date.now(),
    name: document.getElementById('propName').value.trim(),
    type: document.getElementById('propType').value,
    basePrice: parseFloat(document.getElementById('propBasePrice').value) || 0
  };

  if (editId) {
    const idx = properties.findIndex(p => p.id === editId);
    if (idx !== -1) properties[idx] = propData;
  } else {
    properties.push(propData);
  }

  saveDatabase();
  closePropertyModal();
  renderAll();
}

function deleteProperty(id) {
  if (confirm('هل أنت متأكد من رغبتك في حذف هذه المنشأة؟ لن تُحذف الحجوزات المرتبطة بها.')) {
    properties = properties.filter(p => p.id !== id);
    saveDatabase();
    renderAll();
  }
}

// ================= STATS & URGENT ALERTS =================
function updateStats() {
  const now = new Date();
  let active = 0;
  let upcoming = 0;
  let deposits = 0;
  let remaining = 0;

  bookings.forEach(b => {
    const inDate = new Date(b.checkInDate);
    const outDate = new Date(b.checkOutDate);

    deposits += (b.depositAmount || 0);
    remaining += (b.remainingAmount || 0);

    if (now >= inDate && now <= outDate) active++;
    else if (now < inDate) upcoming++;
  });

  document.getElementById('statActiveCount').textContent = active;
  document.getElementById('statUpcomingCount').textContent = upcoming;
  document.getElementById('statDepositsTotal').textContent = formatMoney(deposits);
  document.getElementById('statRemainingTotal').textContent = formatMoney(remaining);
}

function updateUrgentAlerts() {
  const box = document.getElementById('urgentAlertsBox');
  const now = new Date();
  
  const urgent = bookings.filter(b => {
    const inDate = new Date(b.checkInDate);
    const diffHours = (inDate - now) / (1000 * 60 * 60);
    return diffHours >= 0 && diffHours <= 48;
  });

  if (urgent.length === 0) {
    box.classList.add('hidden');
    box.innerHTML = '';
    return;
  }

  box.classList.remove('hidden');
  box.innerHTML = `
    <div class="bg-amber-500/10 border-2 border-amber-500/30 rounded-3xl p-5 text-amber-950 space-y-3">
      <div class="flex items-center gap-2 font-black text-lg text-amber-900">
        <i data-lucide="bell-ring" class="w-6 h-6 text-amber-600 animate-bounce"></i>
        <span>تنبيهات الوصول القريب (خلال 48 ساعة القادمة)</span>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        ${urgent.map(b => {
          const prop = properties.find(p => p.id === b.propertyId) || { name: 'شاليه' };
          const inDate = new Date(b.checkInDate);
          return `
            <div class="bg-white p-4 rounded-2xl border border-amber-200 flex items-center justify-between">
              <div>
                <p class="font-black text-slate-800 text-base">${b.customerName} -${prop.name}</p>
                <p class="text-xs font-bold text-amber-800">
                  تاريخ الوصول: ${inDate.toLocaleDateString('ar-EG')} (${inDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})})
                </p>
                <p class="text-xs font-bold text-rose-600 mt-1">المتبقي للتحصيل عند الباب: ${formatMoney(b.remainingAmount)}</p>
              </div>
              <button onclick="sendWhatsAppReceipt('${b.id}')" class="bg-emerald-600 text-white p-3 rounded-xl shadow hover:bg-emerald-700 transition" title="تواصل واتساب">
                <i data-lucide="message-circle" class="w-5 h-5"></i>
              </button>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  if (window.lucide) lucide.createIcons();
}

// ================= WHATSAPP CONFIRMATION =================
function sendWhatsAppReceipt(bookingId) {
  const b = bookings.find(item => item.id === bookingId);
  if (!b) return;

  const prop = properties.find(p => p.id === b.propertyId) || { name: 'الشاليه' };
  const inDate = new Date(b.checkInDate).toLocaleString('ar-EG');
  const outDate = new Date(b.checkOutDate).toLocaleString('ar-EG');

  let phone = b.customerPhone.replace(/[^0-9]/g, '');
  if (phone.startsWith('01') && phone.length === 11) phone = '2' + phone;
  if (phone.startsWith('05') && phone.length === 10) phone = '966' + phone.substring(1);

  let msg = `مرحباً أستاذ ${b.customerName}،\nتم تأكيد حجزكم في (${prop.name}) بنجاح ✨\n\n📌 المواعيد:\n- موعد الدخول: ${inDate}\n- موعد الخروج: ${outDate}\n\n💰 الحسابات:\n- إجمالي المبلغ: ${formatMoney(b.totalAmount)}\n- العربون المدفوع: ${formatMoney(b.depositAmount)}\n- المتبقي عند الوصول: ${formatMoney(b.remainingAmount)}`;

  if (b.furnitureStatus) {
    msg += `\n\n🛋️ حالة العفش والتسليم:\n${b.furnitureStatus}`;
  }

  msg += `\n\nنتمنى لكم إقامة طيبة وسعيدة دائماً! 🌿`;

  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
}

// ================= BACKUP CENTER =================
function triggerEmailBackup() {
  const recipient = settings.backupEmail || 'father@example.com';
  const now = new Date().toLocaleDateString('ar-EG');

  let body = `تقرير نسخة احتياطية لحجوزات Challé (${now})\n`;
  body += `=========================================\n\n`;
  body += `إجمالي عدد الحجوزات: ${bookings.length}\n`;
  body += `إجمالي عدد المنشآت: ${properties.length}\n\n`;
  body += `تفاصيل الحجوزات:\n`;

  bookings.forEach((b, i) => {
    const prop = properties.find(p => p.id === b.propertyId) || { name: 'منشأة' };
    body += `${i + 1}) العميل: ${b.customerName} (${b.customerPhone})\n`;
    body += `   المنشأة: ${prop.name}\n`;
    body += `   الدخول: ${b.checkInDate} | الخروج: ${b.checkOutDate}\n`;
    body += `   الإجمالي: ${formatMoney(b.totalAmount)} | العربون: ${formatMoney(b.depositAmount)} | المتبقي: ${formatMoney(b.remainingAmount)}\n`;
    if (b.furnitureStatus) body += `   حالة العفش: ${b.furnitureStatus}\n`;
    if (b.notes) body += `   ملاحظة: ${b.notes}\n`;
    body += `-----------------------------------------\n`;
  });

  const mailtoLink = `mailto:${recipient}?subject=${encodeURIComponent(`نسخة احتياطية لحجوزات شاليه (${now})`)}&body=${encodeURIComponent(body)}`;
  window.location.href = mailtoLink;
}

function triggerWhatsAppSelfBackup() {
  if (bookings.length === 0) {
    alert('لا توجد حجوزات مسجلة حالياً لنسخها.');
    return;
  }

  const now = new Date().toLocaleDateString('ar-EG');
  let msg = `📌 *نسخة احتياطية لحجوزات Challé (${now})*\n`;
  msg += `----------------------------------------\n`;
  msg += `📊 إجمالي الحجوزات: ${bookings.length}\n\n`;

  bookings.forEach((b, i) => {
    const prop = properties.find(p => p.id === b.propertyId) || { name: 'منشأة' };
    msg += `*${i + 1}) ${b.customerName}* (${b.customerPhone})\n`;
    msg += `🏠 المنشأة: ${prop.name}\n`;
    msg += `📅 الدخول: ${b.checkInDate.replace('T', ' ')}\n`;
    msg += `💵 الإجمالي: ${formatMoney(b.totalAmount)} | العربون: ${formatMoney(b.depositAmount)} | المتبقي: ${formatMoney(b.remainingAmount)}\n`;
    if (b.furnitureStatus) msg += `🛋️ العفش: ${b.furnitureStatus}\n`;
    if (b.notes) msg += `📝 ملاحظة: ${b.notes}\n`;
    msg += `----------------------------------------\n`;
  });

  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
}

function exportDatabaseJSON() {
  const payload = {
    settings,
    properties,
    bookings,
    exportedAt: new Date().toISOString()
  };
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
  const dl = document.createElement('a');
  dl.setAttribute('href', dataStr);
  dl.setAttribute('download', `challe_backup_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(dl);
  dl.click();
  dl.remove();
}

function restoreDatabase(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(evt) {
    try {
      const data = JSON.parse(evt.target.result);
      if (data.properties && data.bookings) {
        properties = data.properties;
        bookings = data.bookings;
        if (data.settings) settings = data.settings;
        saveDatabase();
        renderAll();
        alert('تمت استعادة النسخة الاحتياطية بنجاح تام!');
      } else {
        alert('الملف غير مطابق لنسخ نظام Challé');
      }
    } catch (err) {
      alert('حدث خطأ أثناء قراءة ملف النسخة');
    }
  };
  reader.readAsText(file);
}

function printReceipt(bookingId) {
  const b = bookings.find(item => item.id === bookingId);
  if (!b) return;
  const prop = properties.find(p => p.id === b.propertyId) || { name: 'المنشأة' };

  const container = document.getElementById('receiptDetails');
  container.innerHTML = `
    <p><strong>اسم العميل:</strong> ${b.customerName}</p>
    <p><strong>رقم الهاتف:</strong> ${b.customerPhone}</p>
    <p><strong>المنشأة المحجوزة:</strong> ${prop.name}</p>
    <p><strong>نوع الإقامة:</strong> ${DURATION_NAMES[b.durationType] || b.durationType}</p>
    <p><strong>تاريخ ووقت الوصول:</strong> ${new Date(b.checkInDate).toLocaleString('ar-EG')}</p>
    <p><strong>تاريخ ووقت المغادرة:</strong> ${new Date(b.checkOutDate).toLocaleString('ar-EG')}</p>
    <hr class="my-2 border-slate-300">
    <p><strong>إجمالي المبلغ:</strong> ${formatMoney(b.totalAmount)}</p>
    <p><strong>العربون المدفوع:</strong> ${formatMoney(b.depositAmount)}</p>
    <p><strong>المبلغ المتبقي للتحصيل:</strong> ${formatMoney(b.remainingAmount)}</p>
    ${b.furnitureStatus ? `<p><strong>حالة العفش:</strong> ${b.furnitureStatus}</p>` : ''}
    ${b.notes ? `<p><strong>ملاحظات:</strong> ${b.notes}</p>` : ''}
  `;

  window.print();
}

// ================= REAL PHONE NOTIFICATIONS =================
function checkNotificationSupport() {
  if (!('Notification' in window)) {
    const btn = document.getElementById('btnEnableNotifs');
    if (btn) btn.style.display = 'none';
    return;
  }

  const statusText = document.getElementById('notifStatusText');
  const btn = document.getElementById('btnEnableNotifs');

  if (Notification.permission === 'granted') {
    if (statusText) statusText.textContent = 'الإشعارات مفعلة وتعمل بنجاح على هذا الجهاز ✅';
    if (btn) {
      btn.textContent = 'مفعلة بالفعل';
      btn.classList.replace('bg-amber-600', 'bg-slate-300');
      btn.classList.replace('text-white', 'text-slate-700');
      btn.disabled = true;
    }
    dispatchUpcomingPushNotifications();
  }
}

function requestNotificationPermission() {
  if (!('Notification' in window)) {
    alert('متصفح هذا الجهاز لا يدعم الإشعارات المباشرة.');
    return;
  }

  Notification.requestPermission().then((permission) => {
    if (permission === 'granted') {
      new Notification('Challé • شاليه', {
        body: 'تم تفعيل التنبيهات بنجاح! سيتم تنبيهك عند اقتراب مواعيد الحجوزات.',
        icon: 'icon.svg'
      });
      checkNotificationSupport();
    }
  });
}

function dispatchUpcomingPushNotifications() {
  if (Notification.permission !== 'granted') return;

  const now = new Date();
  bookings.forEach(b => {
    const inDate = new Date(b.checkInDate);
    const diffHours = (inDate - now) / (1000 * 60 * 60);

    if (diffHours > 0 && diffHours <= 24) {
      const prop = properties.find(p => p.id === b.propertyId) || { name: 'شاليه' };
      if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
        navigator.serviceWorker.ready.then((reg) => {
          reg.showNotification(`وصول عميل اليوم! ⏳`, {
            body: `العميل: ${b.customerName} - المنشأة: ${prop.name}\nالمتبقي تحصيله: ${formatMoney(b.remainingAmount)}`,
            icon: 'icon.svg',
            badge: 'icon.svg',
            vibrate: [200, 100, 200],
            tag: `checkin-${b.id}`
          });
        });
      }
    }
  });
}