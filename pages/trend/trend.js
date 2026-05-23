const storage = require('../../utils/storage')
const fire = require('../../utils/fire')
const chart = require('../../utils/chart')

Page({
  data: {
    firstNetWorth: '',
    lastNetWorth: '',
    monthlySavings: ''
  },

  onShow() {
    this.loadData()
  },

  loadData() {
    const snapshots = storage.getSnapshots()
    const filled = fire.fillMissingMonths(snapshots)

    if (filled.length > 0) {
      const dataPoints = filled.map(s => ({
        label: s.month + '月',
        value: s.netWorth
      }))

      this.setData({
        firstNetWorth: fire.formatMoney(filled[0].netWorth),
        lastNetWorth: fire.formatMoney(filled[filled.length - 1].netWorth),
        monthlySavings: fire.formatMoney(fire.calcMonthlySavings(snapshots))
      }, () => {
        setTimeout(() => {
          chart.drawLineChart('netWorthChart', dataPoints)
        }, 300)
      })
    }
  }
})