const storage = require('../../utils/storage')
const fire = require('../../utils/fire')

Page({
  data: {
    hasSettings: false,
    progressPercent: 0,
    isAchieved: false,
    formatTarget: '',
    netWorthText: '',
    assetsText: '',
    liabilitiesText: '',
    projectedYears: 0,
    latestSnapshot: null
  },

  onShow() {
    this.loadData()
  },

  loadData() {
    const settings = storage.getSettings()
    if (!settings || !settings.targetAmount) {
      this.setData({ hasSettings: false })
      return
    }

    const snapshots = storage.getSnapshots()
    const filled = fire.fillMissingMonths(snapshots)
    const latest = filled.length > 0 ? filled[filled.length - 1] : null

    const targetAmount = settings.targetAmount
    const netWorth = latest ? latest.netWorth : 0
    const progress = fire.calcProgress(netWorth, targetAmount)
    const progressPercent = Math.round(progress * 100)

    const monthlySavings = fire.calcMonthlySavings(snapshots)
    const projectedYears = fire.calcProjectedYears(netWorth, monthlySavings, targetAmount)

    const sorted = [...snapshots].sort((a, b) => a.id.localeCompare(b.id))
    const lastManual = sorted.length > 0 ? sorted[sorted.length - 1] : null

    this.setData({
      hasSettings: true,
      progressPercent: progressPercent,
      isAchieved: netWorth >= targetAmount,
      formatTarget: fire.formatMoney(targetAmount),
      netWorthText: fire.formatMoney(netWorth),
      assetsText: fire.formatMoney(latest ? latest.assets : 0),
      liabilitiesText: fire.formatMoney(latest ? latest.liabilities : 0),
      projectedYears: projectedYears,
      latestSnapshot: lastManual
    })
  },

  goToSettings() {
    wx.navigateTo({ url: '/pages/settings/settings' })
  }
})