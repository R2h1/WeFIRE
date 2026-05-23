const storage = require('../../utils/storage')
const fire = require('../../utils/fire')

Page({
  data: {
    currentYear: 0,
    currentMonth: 0,
    assets: '',
    liabilities: '',
    netWorthText: '',
    snapshots: [],
    snapshotsFormatted: []
  },

  onShow() {
    const now = new Date()
    this.setData({
      currentYear: now.getFullYear(),
      currentMonth: now.getMonth() + 1,
      assets: '',
      liabilities: '',
      netWorthText: ''
    })
    this.loadHistory()
  },

  loadHistory() {
    const snapshots = storage.getSnapshots()
    snapshots.sort((a, b) => b.id.localeCompare(a.id))
    const snapshotsFormatted = snapshots.map(s => ({
      ...s,
      netWorthText: fire.formatMoney(s.netWorth),
      label: s.year + '.' + String(s.month).padStart(2, '0')
    }))
    this.setData({ snapshots, snapshotsFormatted })
  },

  onAssetsInput(e) {
    const assets = e.detail.value
    this.setData({ assets })
    this.updatePreview()
  },

  onLiabilitiesInput(e) {
    const liabilities = e.detail.value
    this.setData({ liabilities })
    this.updatePreview()
  },

  updatePreview() {
    const assets = parseFloat(this.data.assets) || 0
    const liabilities = parseFloat(this.data.liabilities) || 0
    const netWorth = fire.calcNetWorth(assets, liabilities)
    this.setData({ netWorthText: fire.formatMoney(netWorth) })
  },

  onSubmit() {
    const assets = parseFloat(this.data.assets)
    const liabilities = parseFloat(this.data.liabilities)
    if (isNaN(assets) || assets < 0) {
      wx.showToast({ title: '请输入有效资产', icon: 'none' })
      return
    }
    if (isNaN(liabilities) || liabilities < 0) {
      wx.showToast({ title: '请输入有效负债', icon: 'none' })
      return
    }
    const netWorth = fire.calcNetWorth(assets, liabilities)
    const { currentYear, currentMonth } = this.data
    const id = currentYear + '-' + String(currentMonth).padStart(2, '0')

    wx.showModal({
      title: '确认录入',
      content: '本月净资产：' + fire.formatMoney(netWorth) + '\n确认记录本次数据？',
      success: (res) => {
        if (res.confirm) {
          const snapshot = {
            id: id,
            year: currentYear,
            month: currentMonth,
            assets: assets,
            liabilities: liabilities,
            netWorth: netWorth,
            createdAt: new Date().toISOString()
          }
          storage.addSnapshot(snapshot).then(() => {
            wx.showToast({ title: '记录成功' })
            wx.switchTab({ url: '/pages/index/index' })
          })
        }
      }
    })
  }
})
