const transactionStore = require('../../utils/transaction-store');
const categoryData = require('../../utils/categories');
const storage = require('../../utils/storage');
const fire = require('../../utils/fire');
const configModule = require('../../utils/config');

Page({
  data: {
    currentMonthId: '',
    currentMonthLabel: '',
    canGoNext: false,
    isCurrentMonth: true,

    incomeText: '¥0',
    expenseText: '¥0',
    balanceText: '¥0',
    balanceIsPositive: true,

    expenseRankBars: [],

    transactionGroups: [],
    hasTransactions: false,

    showAddModal: false,
    addType: 'expense',
    addCat1Index: 0,
    addCat1List: [],
    addCat2Index: 0,
    addCat2List: [],
    addAmount: '',
    addAccountIndex: -1,
    addAccountList: [],
    addNote: '',
    addDateText: '',
    editingId: null,

    toastShow: false,
    toastMsg: '',

    showImportModal: false,
    importJsonText: '',
  },

  onShow() {
    this.initMonth();
    this.loadData();
    this.updateTabBar();
  },

  updateTabBar() {
    const tabBar = typeof this.getTabBar === 'function' && this.getTabBar();
    tabBar && tabBar.setData({ active: 2 });
  },

  initMonth() {
    const now = new Date();
    const monthId =
      now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    const label = now.getFullYear() + '年' + (now.getMonth() + 1) + '月';
    this.setData({
      currentMonthId: monthId,
      currentMonthLabel: label,
      canGoNext: false,
      isCurrentMonth: true,
    });
  },

  loadData() {
    const monthTxns = transactionStore.getByMonth(this.data.currentMonthId);
    this.calcSummary(monthTxns);
    this.buildExpenseRanks(monthTxns);
    this.buildTransactionGroups(monthTxns);
  },

  calcSummary(monthTxns) {
    let income = 0,
      expense = 0;
    monthTxns.forEach((t) => {
      if (t.type === 'income') {
        if (!t.nonDisposable) income += t.amount;
      } else {
        if (!t.isTransfer) expense += t.amount;
      }
    });
    const balance = income - expense;
    this.setData({
      incomeText: fire.formatMoney(income),
      expenseText: fire.formatMoney(expense),
      balanceText: fire.formatMoney(Math.abs(balance)),
      balanceIsPositive: balance >= 0,
    });
  },

  buildExpenseRanks(monthTxns) {
    const expenseTxns = monthTxns.filter(
      (t) => t.type === 'expense' && !t.isTransfer,
    );
    if (expenseTxns.length === 0) {
      this.setData({ expenseRankBars: [] });
      return;
    }
    const totalExpense = expenseTxns.reduce((s, t) => s + t.amount, 0);
    const byCat = {};
    expenseTxns.forEach((t) => {
      if (!byCat[t.category1])
        byCat[t.category1] = {
          cat1: t.category1,
          emoji: categoryData.getEmoji(t.category1),
          amount: 0,
        };
      byCat[t.category1].amount += t.amount;
    });
    const sorted = Object.values(byCat)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6);
    const maxAmount = sorted[0].amount;
    const bars = sorted.map((item) => ({
      emoji: item.emoji,
      cat1: item.cat1,
      amountText: fire.formatMoney(item.amount),
      pct: Math.round((item.amount / totalExpense) * 100),
      barWidth: Math.max((item.amount / maxAmount) * 100, 4),
    }));
    this.setData({ expenseRankBars: bars });
  },

  buildTransactionGroups(monthTxns) {
    if (monthTxns.length === 0) {
      this.setData({ transactionGroups: [], hasTransactions: false });
      return;
    }
    const byDate = {};
    monthTxns.forEach((t) => {
      if (!byDate[t.date]) byDate[t.date] = [];
      byDate[t.date].push(t);
    });
    const dates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));
    const groups = dates.map((date) => {
      const list = byDate[date];
      let dayIncome = 0,
        dayExpense = 0;
      const items = list.map((t) => {
        if (t.type === 'income') dayIncome += t.amount;
        else dayExpense += t.amount;
        const isExpense = t.type === 'expense';
        const hasAccount = !!(t.account && t.account.trim());
        const hasNote = !!(t.note && t.note.trim());
        let metaText = '';
        if (hasAccount && hasNote) metaText = t.account + ' | ' + t.note;
        else if (hasAccount) metaText = t.account;
        else if (hasNote) metaText = t.note;
        return {
          id: t.id,
          emoji: categoryData.getEmoji(t.category1),
          cat1: t.category1,
          cat2: t.category2,
          amountText: (isExpense ? '-' : '+') + fire.formatMoney(t.amount),
          amountClass: isExpense ? 'expense-amount' : 'income-amount',
          metaText: metaText,
          hasMeta: !!(hasAccount || hasNote),
        };
      });
      const dayParts = date.split('-');
      const dayNum = parseInt(dayParts[2], 10);
      const dayLabel = dayNum + '日 周' + categoryData.getDayOfWeek(date);
      const net = dayIncome - dayExpense;
      let dayTotalText = '';
      let dayTotalClass = '';
      if (dayIncome > 0 && dayExpense > 0) {
        dayTotalText =
          (net >= 0 ? '收' : '支') + ' ' + fire.formatMoney(Math.abs(net));
        dayTotalClass = net >= 0 ? 'income-amount' : 'expense-amount';
      } else if (dayIncome > 0) {
        dayTotalText = '收 ' + fire.formatMoney(dayIncome);
        dayTotalClass = 'income-amount';
      } else if (dayExpense > 0) {
        dayTotalText = '支 ' + fire.formatMoney(dayExpense);
        dayTotalClass = 'expense-amount';
      }
      return {
        dateLabel: dayLabel,
        dateKey: date,
        list: items,
        dayTotalText,
        dayTotalClass,
      };
    });
    this.setData({ transactionGroups: groups, hasTransactions: true });
  },

  onPrevMonth() {
    const parts = this.data.currentMonthId.split('-');
    let y = parseInt(parts[0], 10);
    let m = parseInt(parts[1], 10) - 1;
    if (m < 1) {
      m = 12;
      y--;
    }
    const monthId = y + '-' + String(m).padStart(2, '0');
    const canGoNext = this._computeCanGoNext(monthId);
    const curMonthId =
      new Date().getFullYear() +
      '-' +
      String(new Date().getMonth() + 1).padStart(2, '0');
    this.setData({
      currentMonthId: monthId,
      currentMonthLabel: y + '年' + m + '月',
      canGoNext,
      isCurrentMonth: monthId === curMonthId,
    });
    this.loadData();
  },

  onNextMonth() {
    if (!this.data.canGoNext) return;
    const parts = this.data.currentMonthId.split('-');
    let y = parseInt(parts[0], 10);
    let m = parseInt(parts[1], 10) + 1;
    if (m > 12) {
      m = 1;
      y++;
    }
    const monthId = y + '-' + String(m).padStart(2, '0');
    const canGoNext = this._computeCanGoNext(monthId);
    const curMonthId =
      new Date().getFullYear() +
      '-' +
      String(new Date().getMonth() + 1).padStart(2, '0');
    this.setData({
      currentMonthId: monthId,
      currentMonthLabel: y + '年' + m + '月',
      canGoNext,
      isCurrentMonth: monthId === curMonthId,
    });
    this.loadData();
  },

  // ---- Import ----
  onOpenImport() {
    this.setData({ showImportModal: true, importJsonText: '' });
    this._toggleTabBar(false);
  },

  onImportJsonInput(e) {
    this.setData({ importJsonText: e.detail });
  },

  onImportCancel() {
    this.setData({ showImportModal: false });
    this._toggleTabBar(true);
  },

  onImportConfirm() {
    const json = this.data.importJsonText.trim();
    if (!json) {
      this._showToast('请粘贴JSON数据');
      return;
    }
    let parsed;
    try {
      parsed = JSON.parse(json);
    } catch (e) {
      this._showToast('JSON格式错误');
      return;
    }
    const list = Array.isArray(parsed) ? parsed : parsed.transactions || [];
    if (list.length === 0) {
      this._showToast('未找到有效交易数据');
      return;
    }
    const txns = transactionStore.getTransactions();
    let added = 0;
    list.forEach((item) => {
      if (!item.date || !item.type || !item.category1 || !item.amount) return;
      const cat1List = categoryData.getCat1Options(item.type);
      if (!cat1List.includes(item.category1)) return;
      txns.push({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        date: item.date,
        type: item.type,
        category1: item.category1,
        category2: item.category2 || '其他',
        amount: Math.round(parseFloat(item.amount) * 100) / 100,
        account: item.account || '',
        note: item.note || '',
        isTransfer: categoryData.isTransferCategory(item.type, item.category1),
        nonDisposable: categoryData.isNonDisposable(item.type, item.category1),
      });
      added++;
    });
    if (added === 0) {
      this._showToast('无有效数据可导入');
      return;
    }
    txns.sort((a, b) => b.date.localeCompare(a.date));
    transactionStore.saveTransactions(txns);
    this.setData({ showImportModal: false });
    this.loadData();
    this._showToast('已导入' + added + '条记录');
  },

  // ---- Modal ----
  onTapFAB() {
    this.initAddModal();
    this.setData({ showAddModal: true });
    this._toggleTabBar(false);
  },

  initAddModal() {
    const cat1List = categoryData.getCat1Options('expense');
    const cat2List = categoryData.getCat2Options(cat1List[0]);
    this.setData({
      addType: 'expense',
      addCat1Index: 0,
      addCat1List: cat1List,
      addCat2Index: -1,
      addCat2List: cat2List,
      addAmount: '',
      addAccountIndex: -1,
      addAccountList: this.buildAccountList(),
      addNote: '',
      addDateText: this._buildDateDisplay(),
      editingId: null,
    });
  },

  _buildDateDisplay() {
    const dateStr = this._buildDateString();
    const parts = dateStr.split('-');
    return (
      parseInt(parts[1], 10) +
      '月' +
      parseInt(parts[2], 10) +
      '日 周' +
      categoryData.getDayOfWeek(dateStr)
    );
  },

  buildAccountList() {
    const data = storage.getData();
    if (!data.snapshots || data.snapshots.length === 0) return [];
    const latest = data.snapshots[data.snapshots.length - 1];
    const accounts = [];
    const assets = latest.assets || {};
    if (parseFloat(assets.cash) > 0)
      accounts.push({ name: '现金', value: 'cash' });
    (assets.bankCards || []).forEach((c) =>
      accounts.push({
        name: (c.name || '银行卡') + '(银行)',
        value: c.id || '',
      }),
    );
    (assets.alipayAccounts || []).forEach((a) =>
      accounts.push({
        name: (a.name || '支付宝') + '(支付宝)',
        value: a.id || '',
      }),
    );
    (assets.wechatAccounts || []).forEach((w) =>
      accounts.push({ name: (w.name || '微信') + '(微信)', value: w.id || '' }),
    );
    if (parseFloat(assets.medicalInsurance) > 0)
      accounts.push({ name: '医保', value: 'medicalInsurance' });
    if (parseFloat(assets.housingFund) > 0)
      accounts.push({ name: '公积金', value: 'housingFund' });
    (assets.otherAssets || []).forEach((o) =>
      accounts.push({
        name: (o.name || '其他资产') + '(其他)',
        value: o.id || '',
      }),
    );
    return accounts;
  },

  onSwitchType(e) {
    const type = e.currentTarget.dataset.type;
    if (type === this.data.addType) return;
    const cat1List = categoryData.getCat1Options(type);
    this.setData({
      addType: type,
      addCat1Index: 0,
      addCat1List: cat1List,
      addCat2Index: -1,
      addCat2List: categoryData.getCat2Options(cat1List[0]),
    });
  },

  onSelectCat1(e) {
    const index = parseInt(e.currentTarget.dataset.index, 10);
    const cat1 = this.data.addCat1List[index];
    this.setData({
      addCat1Index: index,
      addCat2Index: 0,
      addCat2List: categoryData.getCat2Options(cat1),
    });
  },

  onSelectCat2(e) {
    const index = parseInt(e.currentTarget.dataset.index, 10);
    this.setData({
      addCat2Index: this.data.addCat2Index === index ? -1 : index,
    });
  },
  onSelectAccount(e) {
    const index = parseInt(e.currentTarget.dataset.index, 10);
    this.setData({
      addAccountIndex: this.data.addAccountIndex === index ? -1 : index,
    });
  },

  onAmountInput(e) {
    this.setData({ addAmount: e.detail.value });
  },
  onNoteInput(e) {
    this.setData({ addNote: e.detail.value });
  },

  onAddCat2() {
    const cat1 = this.data.addCat1List[this.data.addCat1Index];
    const self = this;
    wx.showModal({
      title: '添加二级分类',
      editable: true,
      placeholderText: '输入子分类名称',
      confirmColor: '#ea580c',
      success(res) {
        if (res.confirm && res.content && res.content.trim()) {
          const list = categoryData.addCustomCat2(cat1, res.content.trim());
          self.setData({ addCat2List: list, addCat2Index: list.length - 1 });
        }
      },
    });
  },

  onLongPressCat2(idx) {
    const name = this.data.addCat2List[idx];
    if (!name) return;
    const self = this;
    const cat1 = this.data.addCat1List[this.data.addCat1Index];
    wx.showActionSheet({
      itemList: ['重命名', '删除'],
      success(res) {
        if (res.tapIndex === 0) self._onRenameCat2(name);
        else if (res.tapIndex === 1) self._onDeleteCat2(name, cat1);
      },
    });
  },

  _onRenameCat2(oldName) {
    const self = this;
    const cat1 = this.data.addCat1List[this.data.addCat1Index];
    wx.showModal({
      title: '重命名',
      editable: true,
      placeholderText: oldName,
      content: oldName,
      confirmColor: '#ea580c',
      success(res) {
        if (res.confirm && res.content && res.content.trim()) {
          categoryData.removeCustomCat2(cat1, oldName);
          const list = categoryData.addCustomCat2(cat1, res.content.trim());
          self.setData({
            addCat2List: list,
            addCat2Index: list.indexOf(res.content.trim()),
          });
        }
      },
    });
  },

  _onDeleteCat2(name, cat1) {
    if (this.data.addCat2List.length <= 1) {
      this._showToast('至少保留一个子分类');
      return;
    }
    const self = this;
    wx.showModal({
      title: '删除子分类',
      content: '确定删除「' + name + '」？',
      confirmColor: '#ea580c',
      success(res) {
        if (res.confirm) {
          const list = categoryData.removeCustomCat2(cat1, name);
          if (list) self.setData({ addCat2List: list, addCat2Index: 0 });
        }
      },
    });
  },

  // ---- Transaction Edit/Delete ----
  onTapTransaction(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.showActionSheet({
      itemList: ['修改', '删除'],
      success: (res) => {
        if (res.tapIndex === 0) this.onEditTransaction(id);
        else if (res.tapIndex === 1) this.onDeleteTransaction(id);
      },
    });
  },

  onEditTransaction(id) {
    const txns = transactionStore.getTransactions();
    const txn = txns.find((t) => t.id === id);
    if (!txn) return;
    const cat1List = categoryData.getCat1Options(txn.type);
    const cat1Index = cat1List.indexOf(txn.category1);
    const cat2List = categoryData.getCat2Options(txn.category1);
    const cat2Index = cat2List.indexOf(txn.category2);
    const accountList = this.buildAccountList();
    const accountIndex = txn.account
      ? accountList.findIndex((a) => a.name === txn.account)
      : -1;
    this.setData({
      showAddModal: true,
      editingId: id,
      addType: txn.type,
      addCat1Index: Math.max(0, cat1Index),
      addCat1List: cat1List,
      addCat2Index: Math.max(0, cat2Index),
      addCat2List: cat2List,
      addAmount: String(txn.amount),
      addAccountIndex: accountIndex,
      addAccountList: accountList,
      addNote: txn.note || '',
      addDateText:
        parseInt(txn.date.split('-')[1]) +
        '月' +
        parseInt(txn.date.split('-')[2]) +
        '日 周' +
        categoryData.getDayOfWeek(txn.date),
    });
    this._toggleTabBar(false);
  },

  onDeleteTransaction(id) {
    wx.showModal({
      title: '删除记录',
      content: '确定要删除这条记录吗？',
      confirmColor: '#ea580c',
      success: (res) => {
        if (res.confirm) {
          transactionStore.deleteTransaction(id);
          this.loadData();
          this._showToast('已删除');
        }
      },
    });
  },

  onCancelAdd() {
    this.setData({ showAddModal: false });
    this._toggleTabBar(true);
  },

  onConfirmAdd() {
    const cat1 = this.data.addCat1List[this.data.addCat1Index];
    const cat2 = this.data.addCat2List[this.data.addCat2Index];
    if (!cat2) {
      this._showToast('请选择二级分类');
      return;
    }
    const amount = parseFloat(this.data.addAmount);
    if (!amount || amount <= 0) {
      this._showToast('请输入有效金额');
      return;
    }
    let account = '';
    if (this.data.addAccountIndex >= 0) {
      const acc = this.data.addAccountList[this.data.addAccountIndex];
      account = acc ? acc.name : '';
    }

    const txnData = {
      type: this.data.addType,
      category1: cat1,
      category2: cat2,
      amount: Math.round(amount * 100) / 100,
      account: account,
      note: this.data.addNote.trim(),
      isTransfer: categoryData.isTransferCategory(this.data.addType, cat1),
      nonDisposable: categoryData.isNonDisposable(this.data.addType, cat1),
    };

    if (this.data.editingId) {
      transactionStore.updateTransaction(this.data.editingId, txnData);
    } else {
      txnData.date = this._buildDateString();
      transactionStore.addTransaction(txnData);
    }
    this.onCancelAdd();
    this.loadData();
    this._showToast(this.data.editingId ? '已更新' : '已记录');
  },

  _buildDateString() {
    const now = new Date();
    const curMonthId =
      now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    if (this.data.currentMonthId === curMonthId) {
      return (
        this.data.currentMonthId + '-' + String(now.getDate()).padStart(2, '0')
      );
    }
    return this.data.currentMonthId + '-01';
  },

  _toggleTabBar(visible) {
    const tabBar = typeof this.getTabBar === 'function' && this.getTabBar();
    tabBar && tabBar.setData({ hidden: !visible });
  },

  _showToast(msg) {
    this.setData({ toastShow: true, toastMsg: msg });
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      this.setData({ toastShow: false });
    }, 1600);
  },

  _computeCanGoNext(monthId) {
    const now = new Date();
    const curMonthId =
      now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    return monthId < curMonthId;
  },
});
