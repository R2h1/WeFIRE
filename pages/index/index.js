const storage = require('../../utils/storage');
const fire = require('../../utils/fire');
const config = require('../../utils/config');
const reminder = require('../../utils/reminder');

Page({
  data: {
    hasSettings: false,
    settings: null,
    progressPercent: 0,
    isAchieved: false,
    formatTarget: '',
    netWorthText: '',
    assetsText: '',
    liabilitiesText: '',
    liquidAssetsText: '',
    fixedAssetsText: '',
    shortLiabilitiesText: '',
    longLiabilitiesText: '',
    netWorthChangePct: '',
    netWorthChangePos: true,
    retirementYearText: '',
    currentMonthEntered: false,
    entryLabel: '录入本月数据',
    entryAction: '去录入',
  },

  onShow() {
    this.loadData();
    this.checkReminder();
    this.updateTabBar();
  },

  updateTabBar() {
    const tabBar = typeof this.getTabBar === 'function' && this.getTabBar();
    tabBar && tabBar.setData({ active: 0 });
  },

  checkReminder() {
    if (reminder.shouldRemindToday()) {
      wx.showModal({
        title: '本月还没记录',
        content: '今天是本月最后几天，别忘了记录本月的资产和负债数据哦！',
        confirmText: '去记录',
        success: (res) => {
          if (res.confirm) {
            wx.switchTab({ url: '/pages/add/add' });
          }
        },
      });
    }
  },

  loadData() {
    const settings = storage.getSettings();
    if (!settings || !settings.targetAmount) {
      this.setData({ hasSettings: false });
      return;
    }

    const snapshots = storage.getSnapshots();
    const sorted = [...snapshots].sort((a, b) =>
      (a.id || a.month).localeCompare(b.id || b.month)
    );
    const latest = sorted.length > 0 ? sorted[sorted.length - 1] : null;

    const targetAmount = settings.targetAmount;
    const netWorth = latest ? latest.netWorth : 0;
    const progress = fire.calcProgress(netWorth, targetAmount);
    const progressPercent = Math.round(progress * 100);

    // Net worth change vs previous snapshot
    let netWorthChangePct = '';
    let netWorthChangePos = true;
    if (sorted.length >= 2) {
      const prev = sorted[sorted.length - 2];
      if (prev.netWorth && prev.netWorth !== 0) {
        const change = ((netWorth - prev.netWorth) / Math.abs(prev.netWorth)) * 100;
        netWorthChangePos = change >= 0;
        netWorthChangePct = (netWorthChangePos ? '+' : '') + change.toFixed(1);
      }
    }

    // Check if current month already entered
    const now = new Date();
    const currentMonthId = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    const currentMonthEntered = sorted.some((s) => (s.id || s.month) === currentMonthId);
    const entryLabel = currentMonthEntered ? '本月已记录' : '录入本月数据';
    const entryAction = currentMonthEntered ? '更新' : '去录入';

    // Asset/liability breakdowns
    const liquidAssets = latest ? config.calcLiquidAssets(latest) : 0;
    const fixedAssets = latest ? config.calcFixedAssets(latest) : 0;
    const shortLiabilities = latest ? config.calcShortLiabilities(latest) : 0;
    const longLiabilities = latest ? config.calcLongLiabilities(latest) : 0;

    this.setData({
      settings,
      hasSettings: true,
      progressPercent,
      isAchieved: netWorth >= targetAmount,
      formatTarget: fire.formatMoney(targetAmount),
      netWorthText: fire.formatMoney(netWorth),
      assetsText: latest ? fire.formatMoney(config.calcTotalAssets(latest)) : '¥0',
      liabilitiesText: latest ? fire.formatMoney(config.calcTotalLiabilities(latest)) : '¥0',
      liquidAssetsText: fire.formatMoney(liquidAssets),
      fixedAssetsText: fire.formatMoney(fixedAssets),
      shortLiabilitiesText: fire.formatMoney(shortLiabilities),
      longLiabilitiesText: fire.formatMoney(longLiabilities),
      netWorthChangePct,
      netWorthChangePos,
      currentMonthEntered,
      entryLabel,
      entryAction,
      retirementYearText: settings.retirementYear + '年',
    });
  },

  onTapEmptyState() {
    const app = getApp();
    app.globalData.shouldOpenSettings = true;
    wx.switchTab({ url: '/pages/profile/profile' });
  },

  onTapEntry() {
    wx.switchTab({ url: '/pages/add/add' });
  },

  onTapNetWorth() {
    wx.switchTab({ url: '/pages/charts/charts' });
  },

  onShareAppMessage() {
    const data = this.data;
    return {
      title: data.hasSettings
        ? '我的FIRE进度：' + data.progressPercent + '% · 净资产' + data.netWorthText
        : '我在用FIER时光账追踪财务自由进度',
      path: '/pages/index/index',
    };
  },

  onShareTimeline() {
    const data = this.data;
    return {
      title: data.hasSettings
        ? '我的FIRE进度：' + data.progressPercent + '% · 净资产' + data.netWorthText
        : 'FIER时光账 - 财务自由进度追踪',
    };
  },
});
