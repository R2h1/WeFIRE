const storage = require('../../utils/storage');
const fire = require('../../utils/fire');
const backup = require('../../utils/backup');
const reminder = require('../../utils/reminder');

Page({
  data: {
    settings: null,
    targetAmountText: '',
    showModal: false,
    showYearPicker: false,
    showImportModal: false,
    importJsonText: '',
    editTarget: '',
    editYear: null,
    yearRange: [],
  },

  onShow() {
    this.initYearRange();
    this.loadData();
    this.updateTabBar();

    const app = getApp();
    if (app.globalData.shouldOpenSettings) {
      app.globalData.shouldOpenSettings = false;
      setTimeout(() => {
        this.openSettingsModal();
      }, 300);
    }
  },

  updateTabBar() {
    const tabBar = typeof this.getTabBar === 'function' && this.getTabBar();
    tabBar && tabBar.setData({ active: 4 });
  },

  initYearRange() {
    const current = new Date().getFullYear();
    const years = [];
    for (let y = current; y <= current + 60; y++) {
      years.push(String(y));
    }
    this.setData({ yearRange: years, baseYear: current });
  },

  loadData() {
    const data = storage.getData();
    const settings = data.fireTarget ? { targetAmount: data.fireTarget, retirementYear: data.fireYear } : null;
    this.setData({
      settings,
      targetAmountText: settings ? fire.formatMoney(settings.targetAmount) : '',
    });
  },

  openSettingsModal() {
    const s = this.data.settings;
    this.setData({
      showModal: true,
      editTarget: s ? String(s.targetAmount) : '',
      editYear: s ? String(s.retirementYear) : '',
    });
  },

  hideModal() {
    this.setData({ showModal: false });
  },

  onEditTargetInput(e) {
    this.setData({ editTarget: e.detail });
  },

  onOpenYearPicker() {
    const idx = Math.max(0, this.data.yearRange.indexOf(this.data.editYear));
    this.setData({
      showYearPicker: true,
      yearPickerIndex: idx,
    });
  },

  onCloseYearPicker() {
    this.setData({ showYearPicker: false, showModal: true });
  },

  onPickerConfirm(e) {
    const year = e.detail.value;
    this.setData({ editYear: year, showYearPicker: false, showModal: true });
  },

  onLoad() {
    this.setData({
      beforeCloseHandler: (action) => this._handleBeforeClose(action),
    });
  },

  _handleBeforeClose(action) {
    if (action !== 'confirm') return true;

    const { editTarget, editYear } = this.data;
    if (!editTarget || parseFloat(editTarget) <= 0) {
      wx.showToast({ title: '请输入有效目标金额', icon: 'none' });
      return false;
    }
    const year = editYear;
    const currentYear = new Date().getFullYear();
    if (!editYear || isNaN(year) || year < currentYear) {
      wx.showToast({ title: '退休年份不能早于' + currentYear, icon: 'none' });
      return false;
    }

    storage
      .saveData({
        ...storage.getData(),
        fireTarget: parseFloat(editTarget),
        fireYear: year
      })
      .then(() => {
        wx.showToast({ title: '保存成功' });
        this.loadData();
        this.hideModal();
      });

    return false;
  },

  onSubscribe() {
    const config = reminder.getReminderConfig();
    const tid = reminder.getTemplateId();
    if (config.subscribed) {
      wx.showToast({ title: '已订阅提醒', icon: 'none' });
      return;
    }
    if (!tid || tid === 'YOUR_TEMPLATE_ID_HERE') {
      wx.showModal({
        title: '模板 ID 未配置',
        content:
          '请先在 utils/reminder.js 中将 SUBSCRIBE_TEMPLATE_ID 替换为你的真实模板 ID',
        showCancel: false,
        confirmText: '知道了',
      });
      return;
    }
    wx.showModal({
      title: '订阅提醒',
      content: '订阅后每月最后一天将收到消息提醒，通知你记录资产数据',
      success: (res) => {
        if (res.confirm) {
          reminder.requestSubscribe().then((result) => {
            if (result.accepted) {
              wx.showToast({ title: '订阅成功' });
            } else {
              wx.showToast({ title: '订阅失败', icon: 'none' });
            }
          });
        }
      },
    });
  },

  onExport() {
    backup.exportData();
  },

  onImport() {
    this.setData({ showImportModal: true, importJsonText: '' });
  },

  onImportJsonInput(e) {
    this.setData({ importJsonText: e.detail });
  },

  onImportCancel() {
    this.setData({ showImportModal: false });
  },

  onImportConfirm() {
    const json = this.data.importJsonText;
    if (!json || !json.trim()) {
      wx.showToast({ title: '请粘贴备份数据', icon: 'none' });
      return;
    }
    backup.importData(json.trim()).then(() => {
      this.setData({ showImportModal: false });
      this.loadData();
    });
  },

  noop() {},

  onClearData() {
    wx.showModal({
      title: '清除所有数据',
      content: '确定要清除所有数据吗？此操作不可恢复。',
      success: (res) => {
        if (res.confirm) {
          wx.showModal({
            title: '再次确认',
            content: '所有 FIRE 目标和月度记录将被永久删除，确定继续？',
            success: (res2) => {
              if (res2.confirm) {
                wx.clearStorageSync();
                this.setData({ settings: null, targetAmountText: '' });
                wx.showToast({ title: '已清除' });
              }
            },
          });
        }
      },
    });
  },
});
