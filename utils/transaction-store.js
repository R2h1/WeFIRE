const STORAGE_KEY = 'wefire_transactions';

function getTransactions() {
  try {
    const data = wx.getStorageSync(STORAGE_KEY);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
}

function saveTransactions(txns) {
  return new Promise((resolve, reject) => {
    wx.setStorage({
      key: STORAGE_KEY,
      data: txns,
      success: resolve,
      fail: reject
    });
  });
}

function addTransaction(txn) {
  const txns = getTransactions();
  if (!txn.id) {
    txn.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }
  txns.push(txn);
  txns.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  return saveTransactions(txns);
}

function updateTransaction(id, updates) {
  const txns = getTransactions();
  const idx = txns.findIndex(t => t.id === id);
  if (idx === -1) return Promise.resolve(null);
  txns[idx] = Object.assign({}, txns[idx], updates);
  return saveTransactions(txns);
}

function deleteTransaction(id) {
  const txns = getTransactions();
  const idx = txns.findIndex(t => t.id === id);
  if (idx === -1) return Promise.resolve(false);
  txns.splice(idx, 1);
  return saveTransactions(txns);
}

function getByMonth(monthId, txns) {
  const list = txns || getTransactions();
  return list.filter(t => t.date && t.date.startsWith(monthId + '-'));
}

function getMonthlySummary(monthId) {
  const monthTxns = getByMonth(monthId);
  let income = 0;
  let expense = 0;
  let disposableIncome = 0;
  monthTxns.forEach(t => {
    if (t.type === 'income') {
      income += t.amount;
      if (!t.nonDisposable) disposableIncome += t.amount;
    } else {
      if (!t.isTransfer) expense += t.amount;
    }
  });
  return { income, expense, balance: income - expense, disposableIncome };
}

function getAllMonths() {
  const txns = getTransactions();
  const months = new Set();
  txns.forEach(t => {
    if (t.date) {
      const m = t.date.substring(0, 7);
      if (m) months.add(m);
    }
  });
  return Array.from(months).sort();
}

module.exports = {
  getTransactions,
  saveTransactions,
  addTransaction,
  updateTransaction,
  deleteTransaction,
  getByMonth,
  getMonthlySummary,
  getAllMonths,
};
