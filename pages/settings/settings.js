const storage = require('../../utils/storage')
const backup = require('../../utils/backup')

Page({
  data: {
    targetAmount: '',
    retirementYear: ''
  },

  onLoad() {
    const settings = storage.getSettings()
    if (settings) {
      this.setData({
        targetAmount: settings.targetAmount ? String(settings.targetAmount) : '',
        retirementYear: settings.retirementYear ? String(settings.retirementYear) : ''
      })
    }
  },

  onTargetInput(e) {
    this.setData({ targetAmount: e.detail.value })
  },

  onYearInput(e) {
    this.setData({ retirementYear: e.detail.value })
  },

  onSave() {
    const { targetAmount, retirementYear } = this.data
    if (!targetAmount || parseFloat(targetAmount) <= 0) {
      wx.showToast({ title: '请输入有效目标金额', icon: 'none' })
      return
    }
    const year = parseInt(retirementYear)
    const currentYear = new Date().getFullYear()
    if (!retirementYear || isNaN(year) || year < currentYear) {
      wx.showToast({ title: '退休年份不能早于' + currentYear, icon: 'none' })
      return
    }
    storage.saveSettings({
      targetAmount: parseFloat(targetAmount),
      retirementYear: year
    }).then(() => {
      wx.showToast({ title: '保存成功' })
      wx.switchTab({ url: '/pages/index/index' })
    })
  },

  onExport() {
    backup.exportData()
  },

  onImport() {
    backup.importData().then(() => {
      const app = getApp()
      if (app.globalData) app.globalData.dataChanged = true
    })
  }
})
