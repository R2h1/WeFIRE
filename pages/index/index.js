const storage = require('../../utils/storage')
const fire = require('../../utils/fire')
const chart = require('../../utils/chart')
const reminder = require('../../utils/reminder')

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
    latestSnapshot: null,
    showChart: false,
    chartFirstNetWorth: '',
    chartLastNetWorth: '',
    chartMonthlySavings: ''
  },

  onShow() {
    this.loadData()
    this.checkReminder()
  },

  checkReminder() {
    if (reminder.shouldRemindToday()) {
      wx.showModal({
        title: '📅 本月还没记录',
        content: '今天是本月最后几天，别忘了记录本月的资产和负债数据哦！',
        confirmText: '去记录',
        success: (res) => {
          if (res.confirm) {
            wx.switchTab({ url: '/pages/add/add' })
          }
        }
      })
    }
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

    const chartFirstNetWorth = filled.length > 0 ? fire.formatMoney(filled[0].netWorth) : ''
    const chartLastNetWorth = latest ? fire.formatMoney(latest.netWorth) : ''
    const chartMonthlySavings = fire.formatMoney(monthlySavings)
    const showChart = filled.length > 0

    const dataPoints = filled.map(s => ({
      label: s.month + '月',
      value: s.netWorth
    }))

    this.setData({
      settings,
      hasSettings: true,
      progressPercent: progressPercent,
      isAchieved: netWorth >= targetAmount,
      formatTarget: fire.formatMoney(targetAmount),
      netWorthText: fire.formatMoney(netWorth),
      assetsText: fire.formatMoney(latest ? latest.assets : 0),
      liabilitiesText: fire.formatMoney(latest ? latest.liabilities : 0),
      projectedYears: projectedYears,
      latestSnapshot: lastManual,
      showChart: showChart,
      chartFirstNetWorth: chartFirstNetWorth,
      chartLastNetWorth: chartLastNetWorth,
      chartMonthlySavings: chartMonthlySavings
    }, () => {
      if (dataPoints.length >= 2) {
        setTimeout(() => {
          chart.drawLineChart('homeChart', dataPoints)
        }, 300)
      }
    })
  },

  goToSettings() {
    wx.switchTab({ url: '/pages/history/history' })
  }
})