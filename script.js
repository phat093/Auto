const form = document.getElementById("transactionForm");
const list = document.getElementById("transactionList");
const emptyState = document.getElementById("emptyState");
const clearAllBtn = document.getElementById("clearAll");
const totalIncomeEl = document.getElementById("totalIncome");
const totalExpenseEl = document.getElementById("totalExpense");
const balanceEl = document.getElementById("balance");
const todayLabel = document.getElementById("today");
const filterType = document.getElementById("filterType");
const filterRange = document.getElementById("filterRange");
const template = document.getElementById("transactionTemplate");

const STORAGE_KEY = "thai-ledger-transactions";
let transactions = [];

function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatCurrency(amount) {
  return amount.toLocaleString("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
  });
}

function loadTransactions() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    return [];
  }

  try {
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.map((item) => ({
      ...item,
      date: item.date,
    }));
  } catch (error) {
    console.error("ไม่สามารถอ่านข้อมูลที่บันทึกไว้ได้", error);
    return [];
  }
}

function saveTransactions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

function updateSummary() {
  const { income, expense } = transactions.reduce(
    (acc, transaction) => {
      if (transaction.type === "income") {
        acc.income += Number(transaction.amount);
      } else {
        acc.expense += Number(transaction.amount);
      }
      return acc;
    },
    { income: 0, expense: 0 }
  );

  totalIncomeEl.textContent = formatCurrency(income);
  totalExpenseEl.textContent = formatCurrency(expense);
  balanceEl.textContent = formatCurrency(income - expense);
  updateClearButtonState();
}

function updateClearButtonState() {
  const disabled = transactions.length === 0;
  clearAllBtn.disabled = disabled;
  clearAllBtn.classList.toggle("is-disabled", disabled);
}

function applyFilters() {
  const type = filterType.value;
  const range = filterRange.value;
  const now = new Date();

  return transactions.filter((transaction) => {
    if (type !== "all" && transaction.type !== type) {
      return false;
    }

    if (range === "all") {
      return true;
    }

    const transactionDate = new Date(transaction.date);
    if (Number.isNaN(transactionDate.valueOf())) {
      return false;
    }
    const diffDays = (now - transactionDate) / (1000 * 60 * 60 * 24);

    if (range === "today") {
      return transactionDate.toDateString() === now.toDateString();
    }

    if (range === "week") {
      return diffDays <= 7;
    }

    if (range === "month") {
      return diffDays <= 30;
    }

    return true;
  });
}

function renderTransactions() {
  list.innerHTML = "";
  const filtered = applyFilters();

  if (filtered.length === 0) {
    emptyState.hidden = false;
    return;
  }

  emptyState.hidden = true;

  filtered
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .forEach((transaction) => {
      const node = template.content.cloneNode(true);
      const title = node.querySelector(".transaction__title");
      const meta = node.querySelector(".transaction__meta");
      const amount = node.querySelector(".transaction__amount");
      const removeBtn = node.querySelector(".transaction__delete");

      title.textContent = transaction.title;
      const dateFormatted = new Date(transaction.date).toLocaleDateString(
        "th-TH",
        {
          year: "numeric",
          month: "long",
          day: "numeric",
        }
      );
      meta.textContent = `${dateFormatted} · ${transaction.note || "ไม่มีหมายเหตุ"}`;

      const sign = transaction.type === "income" ? "+" : "-";
      amount.textContent = `${sign}${formatCurrency(Number(transaction.amount))}`;
      amount.classList.add(transaction.type);

      removeBtn.addEventListener("click", () => removeTransaction(transaction.id));
      list.appendChild(node);
    });
}

function removeTransaction(id) {
  transactions = transactions.filter((transaction) => transaction.id !== id);
  saveTransactions();
  updateSummary();
  renderTransactions();
}

function clearAll() {
  if (transactions.length === 0) {
    return;
  }

  if (!confirm("ต้องการล้างข้อมูลทั้งหมดหรือไม่?")) {
    return;
  }

  transactions = [];
  saveTransactions();
  updateSummary();
  renderTransactions();
}

function handleSubmit(event) {
  event.preventDefault();

  const formData = new FormData(form);
  const transaction = {
    id: createId(),
    type: formData.get("type"),
    title: formData.get("title").trim(),
    amount: Number(formData.get("amount")),
    date: formData.get("date"),
    note: formData.get("note").trim(),
  };

  if (
    !transaction.title ||
    !transaction.date ||
    isNaN(transaction.amount) ||
    transaction.amount <= 0
  ) {
    alert("กรุณากรอกข้อมูลให้ครบถ้วน");
    return;
  }

  transactions.push(transaction);
  saveTransactions();
  updateSummary();
  renderTransactions();
  form.reset();
  form.querySelector('input[name="type"][value="income"]').checked = true;
  const dateInput = form.querySelector("#date");
  if (dateInput) {
    dateInput.valueAsDate = new Date();
  }
  form.querySelector("#title").focus();
}

function initDate() {
  const today = new Date();
  todayLabel.textContent = today.toLocaleDateString("th-TH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const dateInput = form.querySelector("#date");
  if (dateInput) {
    dateInput.valueAsDate = today;
  }
}

function init() {
  todayLabel.textContent = "";
  initDate();
  transactions = loadTransactions();
  updateSummary();
  renderTransactions();

  form.addEventListener("submit", handleSubmit);
  clearAllBtn.addEventListener("click", clearAll);
  filterType.addEventListener("change", renderTransactions);
  filterRange.addEventListener("change", renderTransactions);
}

window.addEventListener("DOMContentLoaded", init);
