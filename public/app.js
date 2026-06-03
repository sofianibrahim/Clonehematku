// ==========================================
// HEMATKU PREMIUM JAVASCRIPT CONTROLLER
// ==========================================

// Global state
let currentExpenses = [];
let categoryChartInstance = null;
let trendChartInstance = null;

// DOM Elements
const currentDisplayDate = document.getElementById('current-date-display');
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const openAddModalBtn = document.getElementById('open-add-modal-btn');
const closeModalBtn = document.getElementById('close-modal-btn');
const cancelModalBtn = document.getElementById('cancel-modal-btn');
const transactionModal = document.getElementById('transaction-modal');
const transactionForm = document.getElementById('transaction-form');
const modalTitle = document.getElementById('modal-title');

// Stats DOM Elements
const todayExpenseVal = document.getElementById('today-expense-val');
const monthExpenseVal = document.getElementById('month-expense-val');
const totalExpenseVal = document.getElementById('total-expense-val');

// Filter & Search DOM Elements
const searchInput = document.getElementById('search-input');
const categoryFilter = document.getElementById('category-filter');
const toggleAdvancedFilters = document.getElementById('toggle-advanced-filters');
const advancedFilters = document.getElementById('advanced-filters');
const startDateInput = document.getElementById('start-date-input');
const endDateInput = document.getElementById('end-date-input');
const clearDateFilter = document.getElementById('clear-date-filter');
const recordCountBadge = document.getElementById('record-count');
const expensesList = document.getElementById('expenses-list');

// Toast Container
const toastContainer = document.getElementById('toast-container');

// Predefined Category Colors (Matching style.css)
const categoryColors = {
  'Makanan': '#3b82f6',
  'Transportasi': '#eab308',
  'Kebutuhan Rumah': '#10b981',
  'Tagihan': '#ec4899',
  'Hiburan': '#8b5cf6',
  'Lainnya': '#6b7280'
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  // Set current date in header
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  currentDisplayDate.innerHTML = `<i class="fa-regular fa-calendar-days"></i> ${new Date().toLocaleDateString('id-ID', options)}`;
  
  // Set default dates for form date-picker to today
  document.getElementById('expense-date').value = getLocalDateString(new Date());

  // Load theme preference
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);

  // Fetch initial data
  loadDashboardData();
  
  // Setup Event Listeners
  setupEventListeners();
});

// Setup All UI Event Listeners
function setupEventListeners() {
  // Theme Toggle
  themeToggleBtn.addEventListener('click', toggleTheme);

  // Modals
  openAddModalBtn.addEventListener('click', () => openModal());
  closeModalBtn.addEventListener('click', closeModal);
  cancelModalBtn.addEventListener('click', closeModal);
  
  // Close modal when clicking outside the modal container
  transactionModal.addEventListener('click', (e) => {
    if (e.target === transactionModal) closeModal();
  });

  // Form submit
  transactionForm.addEventListener('click', handleCardGlowEffect); // Add click interaction to trace coordinates if needed
  transactionForm.addEventListener('submit', handleFormSubmit);

  // Filtering & Search
  searchInput.addEventListener('input', debounce(() => fetchExpensesList(), 300));
  categoryFilter.addEventListener('change', () => fetchExpensesList());
  
  toggleAdvancedFilters.addEventListener('click', () => {
    advancedFilters.classList.toggle('hidden');
  });

  startDateInput.addEventListener('change', () => fetchExpensesList());
  endDateInput.addEventListener('change', () => fetchExpensesList());
  
  clearDateFilter.addEventListener('click', () => {
    startDateInput.value = '';
    endDateInput.value = '';
    fetchExpensesList();
  });
}

// Utility: Format Date to YYYY-MM-DD
function getLocalDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Utility: Rupiah Currency Formatter
function formatRupiah(value) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

// Utility: Friendly Date Formatter (e.g. 3 Juni 2026)
function formatDate(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Utility: Debounce for Search Box
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Theme Handling
function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  updateThemeIcon(newTheme);
  
  // Re-render charts with appropriate theme styling
  loadDashboardStats();
}

function updateThemeIcon(theme) {
  const icon = themeToggleBtn.querySelector('i');
  if (theme === 'dark') {
    icon.className = 'fa-solid fa-sun';
  } else {
    icon.className = 'fa-solid fa-moon';
  }
}

// Custom Interactive Glowing Effect for Cards
function handleCardGlowEffect(e) {
  const cards = document.querySelectorAll('.stat-card');
  cards.forEach(card => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.setProperty('--x', `${x}px`);
    card.style.setProperty('--y', `${y}px`);
  });
}

// Notification System (Toast)
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const icon = type === 'success' 
    ? '<i class="fa-solid fa-circle-check"></i>' 
    : '<i class="fa-solid fa-circle-exclamation"></i>';
    
  toast.innerHTML = `${icon} <span>${message}</span>`;
  toastContainer.appendChild(toast);
  
  // Remove toast after animation completes
  setTimeout(() => {
    toast.style.animation = 'fade-out 0.3s ease forwards';
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3500);
}

// Fetch all dashboard data
async function loadDashboardData() {
  await Promise.all([
    fetchExpensesList(),
    loadDashboardStats()
  ]);
}

// Fetch lists of expenses
async function fetchExpensesList() {
  try {
    const search = searchInput.value;
    const category = categoryFilter.value;
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;

    let queryParams = new URLSearchParams();
    if (search) queryParams.append('search', search);
    if (category) queryParams.append('category', category);
    if (startDate) queryParams.append('startDate', startDate);
    if (endDate) queryParams.append('endDate', endDate);

    const response = await fetch(`/api/expenses?${queryParams.toString()}`);
    if (!response.ok) throw new Error('API error');
    
    currentExpenses = await response.json();
    renderExpensesTable(currentExpenses);
  } catch (err) {
    console.error('Error fetching expenses:', err);
    showToast('Gagal mengambil daftar pengeluaran', 'error');
  }
}

// Render expenses rows into DOM
function renderExpensesTable(expenses) {
  recordCountBadge.textContent = `${expenses.length} Transaksi`;
  
  if (expenses.length === 0) {
    expensesList.innerHTML = `
      <tr>
        <td colspan="5" class="table-empty">
          <i class="fa-solid fa-receipt"></i>
          <span>Tidak ada catatan pengeluaran ditemukan</span>
        </td>
      </tr>
    `;
    return;
  }

  expensesList.innerHTML = expenses.map(item => {
    const categoryClass = item.category.toLowerCase().replace(/\s+/g, '-');
    const descSubText = item.description 
      ? `<span class="expense-desc-subtext">${escapeHTML(item.description)}</span>` 
      : '';
      
    return `
      <tr id="row-${item.id}">
        <td>
          <span class="expense-title-cell">${escapeHTML(item.title)}</span>
          ${descSubText}
        </td>
        <td>
          <span class="category-badge ${categoryClass}">
            <i class="${getCategoryIcon(item.category)}"></i> ${item.category}
          </span>
        </td>
        <td>${formatDate(item.date)}</td>
        <td class="expense-amount-cell">${formatRupiah(item.amount)}</td>
        <td class="actions-cell">
          <button class="edit-btn" onclick="editExpense(${item.id})" title="Edit">
            <i class="fa-regular fa-pen-to-square"></i>
          </button>
          <button class="delete-btn" onclick="deleteExpense(${item.id})" title="Hapus">
            <i class="fa-regular fa-trash-can"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// Utility: Escape HTML string to prevent XSS
function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

// Helper: Get Icon based on category
function getCategoryIcon(cat) {
  switch (cat) {
    case 'Makanan': return 'fa-solid fa-bowl-food';
    case 'Transportasi': return 'fa-solid fa-car';
    case 'Kebutuhan Rumah': return 'fa-solid fa-house';
    case 'Tagihan': return 'fa-solid fa-file-invoice-dollar';
    case 'Hiburan': return 'fa-solid fa-gamepad';
    default: return 'fa-solid fa-coins';
  }
}

// Load stats and charts data
async function loadDashboardStats() {
  try {
    const response = await fetch('/api/expenses/stats');
    if (!response.ok) throw new Error('API error');
    
    const stats = await response.json();
    
    // Update summary values
    animateValue(todayExpenseVal, parseFloat(todayExpenseVal.textContent.replace(/[^0-9]/g, '')) || 0, stats.todayExpense, 500, formatRupiah);
    animateValue(monthExpenseVal, parseFloat(monthExpenseVal.textContent.replace(/[^0-9]/g, '')) || 0, stats.monthExpense, 500, formatRupiah);
    animateValue(totalExpenseVal, parseFloat(totalExpenseVal.textContent.replace(/[^0-9]/g, '')) || 0, stats.totalExpense, 500, formatRupiah);
    
    // Update Charts
    updateCategoryChart(stats.categoryData);
    updateTrendChart(stats.trendData);
  } catch (err) {
    console.error('Error fetching stats:', err);
    showToast('Gagal memuat statistik pengeluaran', 'error');
  }
}

// Value Counter Animation helper
function animateValue(obj, start, end, duration, formatter) {
  if (start === end) {
    obj.textContent = formatter ? formatter(end) : end;
    return;
  }
  let startTimestamp = null;
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    const value = Math.floor(progress * (end - start) + start);
    obj.textContent = formatter ? formatter(value) : value;
    if (progress < 1) {
      window.requestAnimationFrame(step);
    } else {
      obj.textContent = formatter ? formatter(end) : end;
    }
  };
  window.requestAnimationFrame(step);
}

// Chart 1: Update Category Breakdown Chart
function updateCategoryChart(categoryData) {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const textColor = isDark ? '#9ca3af' : '#4b5563';
  const canvas = document.getElementById('categoryChart');
  const noDataPlaceholder = document.getElementById('no-category-data');

  if (categoryData.length === 0) {
    canvas.classList.add('hidden');
    noDataPlaceholder.classList.remove('hidden');
    if (categoryChartInstance) {
      categoryChartInstance.destroy();
      categoryChartInstance = null;
    }
    return;
  }

  canvas.classList.remove('hidden');
  noDataPlaceholder.classList.add('hidden');

  const labels = categoryData.map(d => d.category);
  const dataValues = categoryData.map(d => d.total);
  const backgroundColors = labels.map(label => categoryColors[label] || '#6b7280');

  if (categoryChartInstance) {
    categoryChartInstance.destroy();
  }

  categoryChartInstance = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: dataValues,
        backgroundColor: backgroundColors,
        borderWidth: isDark ? 2 : 1,
        borderColor: isDark ? '#111827' : '#ffffff',
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: textColor,
            font: { family: 'Outfit', size: 12, weight: '500' },
            padding: 15,
            usePointStyle: true,
            pointStyle: 'circle'
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return ` ${context.label}: ${formatRupiah(context.raw)}`;
            }
          }
        }
      },
      cutout: '70%'
    }
  });
}

// Chart 2: Update 30-Day Trend Chart
function updateTrendChart(trendData) {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const textColor = isDark ? '#9ca3af' : '#4b5563';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
  const canvas = document.getElementById('trendChart');
  const noDataPlaceholder = document.getElementById('no-trend-data');

  if (trendData.length === 0) {
    canvas.classList.add('hidden');
    noDataPlaceholder.classList.remove('hidden');
    if (trendChartInstance) {
      trendChartInstance.destroy();
      trendChartInstance = null;
    }
    return;
  }

  canvas.classList.remove('hidden');
  noDataPlaceholder.classList.add('hidden');

  // Format label tanggal (e.g. 03 Jun)
  const labels = trendData.map(d => {
    const parts = d.date.split('-');
    if (parts.length < 3) return d.date;
    const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
    return dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  });
  const dataValues = trendData.map(d => d.total);

  if (trendChartInstance) {
    trendChartInstance.destroy();
  }

  // Create gradient background for line chart
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 220);
  gradient.addColorStop(0, isDark ? 'rgba(99, 102, 241, 0.25)' : 'rgba(79, 70, 229, 0.2)');
  gradient.addColorStop(1, 'rgba(99, 102, 241, 0.0)');

  trendChartInstance = new Chart(canvas, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Pengeluaran',
        data: dataValues,
        borderColor: isDark ? '#6366f1' : '#4f46e5',
        borderWidth: 3,
        pointBackgroundColor: isDark ? '#6366f1' : '#4f46e5',
        pointBorderColor: isDark ? '#111827' : '#ffffff',
        pointHoverRadius: 7,
        pointRadius: 4,
        tension: 0.35,
        fill: true,
        backgroundColor: gradient
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(context) {
              return ` Total: ${formatRupiah(context.raw)}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: textColor,
            font: { family: 'Outfit', size: 10 }
          }
        },
        y: {
          grid: { color: gridColor },
          ticks: {
            color: textColor,
            font: { family: 'Outfit', size: 10 },
            callback: function(value) {
              if (value >= 1000000) return 'Rp ' + (value / 1000000) + 'jt';
              if (value >= 1000) return 'Rp ' + (value / 1000) + 'rb';
              return 'Rp ' + value;
            }
          }
        }
      }
    }
  });
}

// Modal Windows Operations
function openModal(expense = null) {
  transactionModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden'; // Lock background scroll
  
  if (expense) {
    modalTitle.innerHTML = `<i class="fa-regular fa-pen-to-square"></i> Edit Pengeluaran`;
    document.getElementById('expense-id').value = expense.id;
    document.getElementById('expense-title').value = expense.title;
    document.getElementById('expense-amount').value = expense.amount;
    document.getElementById('expense-category').value = expense.category;
    // Format date value correctly
    const rawDate = expense.date.split('T')[0];
    document.getElementById('expense-date').value = rawDate;
    document.getElementById('expense-description').value = expense.description || '';
    document.getElementById('save-transaction-btn').textContent = 'Perbarui Transaksi';
  } else {
    modalTitle.innerHTML = `<i class="fa-solid fa-plus"></i> Tambah Pengeluaran`;
    transactionForm.reset();
    document.getElementById('expense-id').value = '';
    document.getElementById('expense-date').value = getLocalDateString(new Date());
    document.getElementById('save-transaction-btn').textContent = 'Simpan Transaksi';
  }
}

function closeModal() {
  transactionModal.classList.add('hidden');
  document.body.style.overflow = ''; // Unlock background scroll
}

// Form Submission (Add/Edit)
async function handleFormSubmit(e) {
  e.preventDefault();
  
  const id = document.getElementById('expense-id').value;
  const title = document.getElementById('expense-title').value;
  const amount = document.getElementById('expense-amount').value;
  const category = document.getElementById('expense-category').value;
  const date = document.getElementById('expense-date').value;
  const description = document.getElementById('expense-description').value;

  const payload = { title, amount, category, date, description };
  const isEdit = !!id;
  const url = isEdit ? `/api/expenses/${id}` : '/api/expenses';
  const method = isEdit ? 'PUT' : 'POST';

  try {
    const response = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Server error');
    }

    showToast(isEdit ? 'Transaksi berhasil diperbarui' : 'Transaksi berhasil ditambahkan');
    closeModal();
    loadDashboardData();
  } catch (err) {
    console.error('Error submitting form:', err);
    showToast(err.message || 'Gagal menyimpan transaksi', 'error');
  }
}

// Edit Button Trigger
window.editExpense = function(id) {
  const expense = currentExpenses.find(e => e.id === id);
  if (expense) {
    openModal(expense);
  } else {
    showToast('Transaksi tidak ditemukan', 'error');
  }
};

// Delete Button Trigger
window.deleteExpense = async function(id) {
  const expense = currentExpenses.find(e => e.id === id);
  if (!expense) return;
  
  const confirmed = confirm(`Apakah Anda yakin ingin menghapus "${expense.title}"?`);
  if (!confirmed) return;

  try {
    const response = await fetch(`/api/expenses/${id}`, {
      method: 'DELETE'
    });

    if (!response.ok) throw new Error('API error');

    showToast('Transaksi berhasil dihapus');
    
    // Add slide-out visual animation to row before refetching
    const row = document.getElementById(`row-${id}`);
    if (row) {
      row.style.transform = 'translateX(-30px)';
      row.style.opacity = '0';
      row.style.transition = 'all 0.3s ease';
      setTimeout(() => {
        loadDashboardData();
      }, 300);
    } else {
      loadDashboardData();
    }
  } catch (err) {
    console.error('Error deleting expense:', err);
    showToast('Gagal menghapus transaksi', 'error');
  }
};
