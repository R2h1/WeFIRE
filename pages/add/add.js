const storage = require('../../utils/storage')
const fire = require('../../utils/fire')
const { getPresetsByType, getPreset } = require('../../utils/categories')

Page({
  data: {
    currentYear: 0,
    currentMonth: 0,
    monthId: '',
    assetEntries: [],
    liabilityEntries: [],
    netWorthText: '',
    showPicker: false,
    pickerType: 'assets',
    availablePresets: [],
    showLabelInput: false,
    selectedPresetId: '',
    selectedPresetName: '',
    labelInput: '',
    trackedItems: [],
    snapshots: [],
    snapshotsFormatted: []
  },

  onShow() {
    const now = new Date()
    const monthId = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0')
    this.setData({
      currentYear: now.getFullYear(),
      currentMonth: now.getMonth() + 1,
      monthId: monthId
    })
    this.loadData()
    this.loadHistory()
    this.updateTabBar()
  },

  updateTabBar() {
    const tabBar = typeof this.getTabBar === 'function' && this.getTabBar();
    tabBar && tabBar.setData({ active: 1 });
  },

  loadData() {
    const trackedItems = storage.getTrackedItems()
    const saved = storage.getMonthlyEntries(this.data.monthId)

    const assetEntries = []
    const liabilityEntries = []

    trackedItems.forEach(ti => {
      const preset = getPreset(ti.presetId)
      if (!preset) return
      const savedEntry = saved.find(e => e.itemId === ti.itemId)
      const entry = {
        itemId: ti.itemId,
        presetId: ti.presetId,
        name: preset.name,
        icon: preset.icon,
        type: ti.type,
        label: ti.label,
        amount: savedEntry ? String(savedEntry.amount) : ''
      }
      if (ti.type === 'assets') {
        assetEntries.push(entry)
      } else {
        liabilityEntries.push(entry)
      }
    })

    this.setData({ trackedItems, assetEntries, liabilityEntries })
    this.calcNetWorth()
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

  calcNetWorth() {
    let totalAssets = 0
    let totalLiabilities = 0
    this.data.assetEntries.forEach(e => {
      totalAssets += parseFloat(e.amount) || 0
    })
    this.data.liabilityEntries.forEach(e => {
      totalLiabilities += parseFloat(e.amount) || 0
    })
    const netWorth = totalAssets - totalLiabilities
    this.setData({ netWorthText: fire.formatMoney(netWorth) })
  },

  onAmountInput(e) {
    const itemId = e.currentTarget.dataset.itemid
    const val = e.detail.value
    const assetEntries = [...this.data.assetEntries]
    const liabilityEntries = [...this.data.liabilityEntries]
    const entry = [...assetEntries, ...liabilityEntries].find(en => en.itemId === itemId)
    if (entry) {
      entry.amount = val
    }
    this.setData({ assetEntries, liabilityEntries })
    this.calcNetWorth()
  },

  onAddItem(e) {
    const type = e.currentTarget.dataset.type || 'assets'
    const tracked = this.data.trackedItems.filter(t => t.type === type)
    const usedPresetIds = tracked.map(t => t.presetId)
    const available = getPresetsByType(type).filter(p => !usedPresetIds.includes(p.id))
    this.setData({ showPicker: true, pickerType: type, availablePresets: available })
  },

  hidePicker() {
    this.setData({ showPicker: false })
  },

  onSelectPreset(e) {
    const presetId = e.currentTarget.dataset.preset
    const preset = getPreset(presetId)
    this.setData({
      showPicker: false,
      showLabelInput: true,
      selectedPresetId: presetId,
      selectedPresetName: preset ? preset.name : '',
      labelInput: ''
    })
  },

  hideLabelInput() {
    this.setData({ showLabelInput: false })
  },

  onLabelInput(e) {
    this.setData({ labelInput: e.detail })
  },

  onConfirmLabel() {
    this.addTrackedItem(this.data.selectedPresetId, this.data.labelInput)
    this.setData({ showLabelInput: false })
  },

  addTrackedItem(presetId, label) {
    const preset = getPreset(presetId)
    if (!preset) return
    const trackedItems = storage.getTrackedItems()
    const itemId = presetId + '_' + Date.now()
    trackedItems.push({
      itemId: itemId,
      presetId: presetId,
      type: preset.type,
      label: label || ''
    })
    storage.saveTrackedItems(trackedItems).then(() => {
      this.loadData()
    })
  },

  onRemoveEntry(e) {
    const itemId = e.currentTarget.dataset.itemid
    wx.showModal({
      title: '移除此分类？',
      content: '移除后不会影响已保存的历史记录',
      success: (res) => {
        if (res.confirm) {
          let trackedItems = storage.getTrackedItems()
          trackedItems = trackedItems.filter(t => t.itemId !== itemId)
          storage.saveTrackedItems(trackedItems).then(() => {
            this.loadData()
          })
        }
      }
    })
  },

  onSubmit() {
    const assetEntries = this.data.assetEntries
    const liabilityEntries = this.data.liabilityEntries

    if (assetEntries.length === 0 && liabilityEntries.length === 0) {
      wx.showToast({ title: '请先添加分类并填写金额', icon: 'none' })
      return
    }

    let totalAssets = 0
    let totalLiabilities = 0
    const allEntries = []

    assetEntries.forEach(e => {
      const amt = parseFloat(e.amount) || 0
      totalAssets += amt
      allEntries.push({ itemId: e.itemId, presetId: e.presetId, amount: amt })
    })
    liabilityEntries.forEach(e => {
      const amt = parseFloat(e.amount) || 0
      totalLiabilities += amt
      allEntries.push({ itemId: e.itemId, presetId: e.presetId, amount: amt })
    })

    const netWorth = totalAssets - totalLiabilities
    const { currentYear, currentMonth, monthId } = this.data

    wx.showModal({
      title: '确认录入',
      content: '本月净资产：' + fire.formatMoney(netWorth) + '\n确认记录本次数据？',
      success: (res) => {
        if (res.confirm) {
          storage.saveMonthlyEntries(monthId, allEntries).then(() => {
            const snapshot = {
              id: monthId,
              year: currentYear,
              month: currentMonth,
              assets: totalAssets,
              liabilities: totalLiabilities,
              netWorth: netWorth,
              createdAt: new Date().toISOString()
            }
            storage.addSnapshot(snapshot).then(() => {
              wx.showToast({ title: '记录成功' })
              wx.switchTab({ url: '/pages/index/index' })
            })
          })
        }
      }
    })
  },

  noop() {}
})
