const storage = require('../../utils/storage');
const fire = require('../../utils/fire');
const config = require('../../utils/config');
const chart = require('../../utils/chart');

Page({
  data: {
    hasSettings: false,
    hasData: false,
    // Trend chart
    showChart: false,
    chartFirstNetWorth: '',
    chartLastNetWorth: '',
    chartMonthlySavings: '',
    chartDateLabel: '',
    // Composition
    liquidAssetsText: '',
    fixedAssetsText: '',
    shortLiabilitiesText: '',
    longLiabilitiesText: '',
    assetsText: '',
    liabilitiesText: '',
    netWorthText: '',
    // Monthly stats
    monthlyStats: [],
    // History list
    historyList: [],
  },

  onShow() {
    this.loadData();
    this.updateTabBar();
  },

  updateTabBar() {
    const tabBar = typeof this.getTabBar === 'function' && this.getTabBar();
    tabBar && tabBar.setData({ active: 3 });
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

    if (sorted.length === 0) {
      this.setData({ hasSettings: true, hasData: false });
      return;
    }

    const latest = sorted[sorted.length - 1];
    const filled = fire.fillMissingMonths(snapshots);
    const monthlySavings = fire.calcMonthlySavings(snapshots);

    // Chart date label
    let chartDateLabel = '';
    if (latest) {
      if (latest.year) {
        chartDateLabel = latest.year + '.' + String(latest.month).padStart(2, '0');
      } else {
        const parts = latest.month.split('-');
        chartDateLabel = parts[0] + '.' + parts[1];
      }
    }

    // Chart data
    const dataPoints = filled.map((s) => ({
      label: (typeof s.month === 'string' ? parseInt(s.month.split('-')[1]) : s.month) + '月',
      value: s.netWorth,
    }));

    // Composition breakdown
    const liquidAssets = config.calcLiquidAssets(latest);
    const fixedAssets = config.calcFixedAssets(latest);
    const shortLiabilities = config.calcShortLiabilities(latest);
    const longLiabilities = config.calcLongLiabilities(latest);
    const totalAssets = config.calcTotalAssets(latest);
    const totalLiabilities = config.calcTotalLiabilities(latest);

    // Monthly stats (last 6 months of changes)
    const monthlyStats = [];
    for (let i = Math.max(1, sorted.length - 5); i < sorted.length; i++) {
      const curr = sorted[i];
      const prev = sorted[i - 1];
      const change = curr.netWorth - (prev ? prev.netWorth : 0);
      const monthLabel = curr.year
        ? curr.year + '.' + String(curr.month).padStart(2, '0')
        : curr.month;
      monthlyStats.push({
        month: monthLabel,
        netWorth: fire.formatMoney(curr.netWorth),
        change: (change >= 0 ? '+' : '') + fire.formatMoney(change),
        changePos: change >= 0,
      });
    }

    // History list (reverse chronological)
    const historyList = [...sorted].reverse().map((s) => {
      const monthLabel = s.year
        ? s.year + '年' + s.month + '月'
        : s.month.replace('-', '年') + '月';
      return {
        month: monthLabel,
        netWorth: fire.formatMoney(s.netWorth),
        assets: fire.formatMoney(config.calcTotalAssets(s)),
        liabilities: fire.formatMoney(config.calcTotalLiabilities(s)),
      };
    });

    this.setData(
      {
        hasSettings: true,
        hasData: true,
        showChart: filled.length > 0,
        chartFirstNetWorth: filled.length > 0 ? fire.formatMoney(filled[0].netWorth) : '',
        chartLastNetWorth: fire.formatMoney(latest.netWorth),
        chartMonthlySavings: fire.formatMoney(monthlySavings),
        chartDateLabel,
        liquidAssetsText: fire.formatMoney(liquidAssets),
        fixedAssetsText: fire.formatMoney(fixedAssets),
        shortLiabilitiesText: fire.formatMoney(shortLiabilities),
        longLiabilitiesText: fire.formatMoney(longLiabilities),
        assetsText: fire.formatMoney(totalAssets),
        liabilitiesText: fire.formatMoney(totalLiabilities),
        netWorthText: fire.formatMoney(latest.netWorth),
        monthlyStats,
        historyList,
      },
      () => {
        if (dataPoints.length >= 1) {
          setTimeout(() => {
            chart.drawLineChart('chartsTrend', dataPoints);
          }, 300);
        }
      },
    );
  },
});
