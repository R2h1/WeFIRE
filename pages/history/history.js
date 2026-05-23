const storage = require('../../utils/storage')
const fire = require('../../utils/fire')
const backup = require('../../utils/backup')

Page({
  data: {
    settings: null,
    targetAmountText: '',
    showModal: false,
    editTarget: '',
    editYear: ''
  },

  onShow() {
    this.loadData()
  },

  loadData() {
    const settings = storage.getSettings()
    this.setData({
      settings,
      targetAmountText: settings ? fire.formatMoney(settings.targetAmount) : ''
    })
  },

  openSettingsModal() {
    const s = this.data.settings
    this.setData({
      showModal: true,
      editTarget: s ? String(s.targetAmount) : '',
      editYear: s ? String(s.retirementYear) : ''
    })
  },

  hideModal() {
    this.setData({ showModal: false })
  },

  onEditTargetInput(e) {
    this.setData({ editTarget: e.detail.value })
  },

  onEditYearInput(e) {
    this.setData({ editYear: e.detail.value })
  },

  onSaveSettings() {
    const { editTarget, editYear } = this.data
    if (!editTarget || parseFloat(editTarget) <= 0) {
      wx.showToast({ title: '请输入有效目标金额', icon: 'none' })
      return
    }
    const year = parseInt(editYear)
    const currentYear = new Date().getFullYear()
    if (!editYear || isNaN(year) || year < currentYear) {
      wx.showToast({ title: '退休年份不能早于' + currentYear, icon: 'none' })
      return
    }
    storage.saveSettings({
      targetAmount: parseFloat(editTarget),
      retirementYear: year
    }).then(() => {
      wx.showToast({ title: '保存成功' })
      this.setData({ showModal: false })
      this.loadData()
    })
  },

  onExport() {
    backup.exportData()
  },

  onImport() {
    backup.importData().then(() => {
      this.loadData()
    })
  },

  noop() {
  },

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
                wx.clearStorageSync()
                this.setData({ settings: null, targetAmountText: '' })
                wx.showToast({ title: '已清除' })
              }
            }
          })
        }
      }
    })
  }
})