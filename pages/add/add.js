const storage = require('../../utils/storage')
const config = require('../../utils/config')
const fire = require('../../utils/fire')

Page({
  data: {
    monthId: '',
    monthLabel: '',
    sections: [],
    activeItems: {},
    singleValues: {},
    multiSummaries: {},
    activeSections: [],
    iconMap: {
      liquidAssets: 'gold-coin-o',
      fixedAssets: 'home-o',
      shortLiabilities: 'bill-o',
      longLiabilities: 'debit-pay'
    },
    loadedFromPrev: false,
    netWorthText: '¥0',
    hasAnyItem: false,
    sectionEmpty: {},
    sectionTotals: {},
    showCategoryPicker: false,
    pickerSection: '',
    pickerCategories: [],
    pickerLabel: ''
  },

  onShow() {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    const monthId = year + '-' + String(month).padStart(2, '0')
    this.setData({
      monthId,
      monthLabel: year + '年' + month + '月',
      sections: config.SECTIONS
    })
    if (!this.loadDraft()) {
      this.loadData()
    }
    this.refreshMultiSummaries()
    this.calcNetWorth()
    this.updateTabBar()
  },

  updateTabBar() {
    const tabBar = typeof this.getTabBar === 'function' && this.getTabBar()
    tabBar && tabBar.setData({ active: 1 })
  },

  loadData() {
    const data = storage.getData()
    const monthId = this.data.monthId
    const snapshot = data.snapshots.find(s => s.month === monthId)

    if (snapshot) {
      this.populateFromSnapshot(snapshot, false)
      this.setData({ loadedFromPrev: false })
    } else {
      this.loadFromPrevious(data, monthId)
    }
    this.calcNetWorth()
  },

  loadFromPrevious(data, monthId) {
    const prev = [...data.snapshots].reverse().find(s => s.month < monthId)
    if (prev) {
      const template = JSON.parse(JSON.stringify(prev))
      template.month = monthId
      this.populateFromSnapshot(template, true)
      this.setData({ loadedFromPrev: true })
    } else {
      this.resetForm()
    }
  },

  populateFromSnapshot(snapshot, isTemplate) {
    const activeItems = {}
    const singleValues = {}
    const multiSummaries = {}

    config.SECTIONS.forEach(section => {
      section.items.forEach(item => {
        const alwaysActive = !!section.itemsStartActive
        const val = config.getSnapshotField(snapshot, section.id, item.key)
        const hasData = item.multi
          ? (Array.isArray(val) && val.length > 0)
          : (parseFloat(val) !== 0 || (isTemplate && val !== undefined))

        activeItems[item.key] = alwaysActive || hasData || false

        if (!item.multi) {
          singleValues[item.key] = activeItems[item.key] ? String(val || 0) : ''
        } else {
          const arr = Array.isArray(val) ? val : []
          let total = 0
          if (item.key === 'wechatAccounts') {
            total = arr.reduce((s, inst) => s + (parseFloat(inst.balance) || 0) + (parseFloat(inst.changeFund) || 0), 0)
          } else {
            const fieldKey = item.fields[0].key
            total = arr.reduce((s, inst) => s + (parseFloat(inst[fieldKey]) || 0), 0)
          }
          multiSummaries[item.key] = {
            count: arr.length,
            total,
            totalText: fire.formatMoney(total)
          }
        }
      })
    })

    this.setData({ activeItems, singleValues, multiSummaries })
    this.updateHasAnyItem()
  },

  resetForm() {
    const activeItems = {}
    const singleValues = {}
    const multiSummaries = {}
    config.SECTIONS.forEach(section => {
      section.items.forEach(item => {
        const alwaysActive = !!section.itemsStartActive
        activeItems[item.key] = alwaysActive
        if (!item.multi) {
          singleValues[item.key] = alwaysActive ? '0' : ''
        } else {
          multiSummaries[item.key] = { count: 0, total: 0, totalText: '¥0' }
        }
      })
    })
    this.setData({
      activeItems,
      singleValues,
      multiSummaries,
      activeSections: [],
      loadedFromPrev: false
    })
    this.updateHasAnyItem()
  },

  // ===== Category Picker =====

  onAddCategory(e) {
    const sectionId = e.currentTarget.dataset.section
    const section = config.SECTIONS.find(s => s.id === sectionId)
    if (!section) return

    const pickerCategories = section.items.map(item => ({
      key: item.key,
      name: item.name,
      active: !!this.data.activeItems[item.key]
    }))

    this.setData({
      showCategoryPicker: true,
      pickerSection: sectionId,
      pickerCategories,
      pickerLabel: section.addText || section.label
    })
  },

  onPickerItemTap(e) {
    const key = e.currentTarget.dataset.key
    const item = config.getItemConfig(key)
    if (!item) return
    const section = config.getSectionByItemKey(key)
    if (!section || !section.addEnabled) return

    const active = !this.data.activeItems[key]
    const activeItems = { ...this.data.activeItems, [key]: active }

    if (!item.multi) {
      const singleValues = { ...this.data.singleValues }
      singleValues[key] = active ? '0' : ''
      this.setData({ activeItems, singleValues })
    } else {
      this.setData({ activeItems })
    }

    const pickerCategories = this.data.pickerCategories.map(pc => ({
      ...pc,
      active: pc.key === key ? active : pc.active
    }))
    this.setData({ pickerCategories })

    this.updateHasAnyItem()
    this.calcNetWorth()
  },

  onPickerClose() {
    this.setData({ showCategoryPicker: false })
  },

  // ===== Section Toggle (van-collapse) =====

  onCollapseChange(e) {
    this.setData({ activeSections: e.detail })
  },

  // ===== Single Input =====

  onSingleInput(e) {
    const key = e.currentTarget.dataset.key
    const val = e.detail
    const singleValues = { ...this.data.singleValues, [key]: val }
    this.setData({ singleValues })
    this.calcNetWorth()
  },

  // ===== Multi Item Management =====

  onManageInstances(e) {
    this.saveDraft()
    const key = e.currentTarget.dataset.key
    wx.navigateTo({
      url: '/pages/instance/instance?category=' + key + '&month=' + this.data.monthId
    })
  },

  refreshMultiSummaries() {
    const data = storage.getData()
    const snapshot = data.snapshots.find(s => s.month === this.data.monthId)
    if (!snapshot) return
    const multiSummaries = { ...this.data.multiSummaries }
    config.SECTIONS.forEach(section => {
      section.items.forEach(item => {
        if (!item.multi) return
        if (!this.data.activeItems[item.key]) return
        const val = config.getSnapshotField(snapshot, section.id, item.key)
        const arr = Array.isArray(val) ? val : []
        let total = 0
        if (item.key === 'wechatAccounts') {
          total = arr.reduce((s, inst) => s + (parseFloat(inst.balance) || 0) + (parseFloat(inst.changeFund) || 0), 0)
        } else {
          const fieldKey = item.fields[0].key
          total = arr.reduce((s, inst) => s + (parseFloat(inst[fieldKey]) || 0), 0)
        }
        multiSummaries[item.key] = {
          count: arr.length,
          total,
          totalText: fire.formatMoney(total)
        }
      })
    })
    this.setData({ multiSummaries })
  },

  // ===== Draft =====

  saveDraft() {
    try {
      wx.setStorageSync('add_draft', {
        monthId: this.data.monthId,
        activeItems: this.data.activeItems,
        singleValues: this.data.singleValues
      })
    } catch (e) {}
  },

  loadDraft() {
    try {
      const draft = wx.getStorageSync('add_draft')
      if (draft && draft.monthId === this.data.monthId) {
        this.setData({
          activeItems: draft.activeItems,
          singleValues: draft.singleValues,
          loadedFromPrev: false
        })
        this.updateHasAnyItem()
        return true
      }
    } catch (e) {}
    return false
  },

  clearDraft() {
    try {
      wx.removeStorageSync('add_draft')
    } catch (e) {}
  },

  // ===== Clear Form =====

  onClearForm() {
    wx.showModal({
      title: '清空重填',
      content: '确定要清空所有已填入的数据吗？',
      success: (res) => {
        if (res.confirm) {
          this.clearDraft()
          this.resetForm()
          this.calcNetWorth()
        }
      }
    })
  },

  // ===== Computations =====

  updateHasAnyItem() {
    const hasAnyItem = Object.values(this.data.activeItems).some(v => v === true)
    const sectionEmpty = {}
    config.SECTIONS.forEach(s => {
      sectionEmpty[s.id] = !s.items.some(i => this.data.activeItems[i.key])
    })
    this.setData({ hasAnyItem, sectionEmpty })
  },

  calcNetWorth() {
    const snapshot = this.buildSnapshot()
    const netWorth = config.calcNetWorth(snapshot)
    const sectionTotals = this.computeSectionTotals()
    this.setData({
      netWorthText: fire.formatMoney(netWorth),
      sectionTotals
    })
  },

  computeSectionTotals() {
    const { activeItems, singleValues, multiSummaries } = this.data
    const sectionTotals = {}
    config.SECTIONS.forEach(section => {
      let total = 0
      section.items.forEach(item => {
        if (!activeItems[item.key]) return
        if (!item.multi) {
          total += parseFloat(singleValues[item.key]) || 0
        } else {
          total += multiSummaries[item.key]?.total || 0
        }
      })
      sectionTotals[section.id] = fire.formatMoney(total)
    })
    return sectionTotals
  },

  buildSnapshot() {
    const snapshot = config.createEmptySnapshot(this.data.monthId)
    const { activeItems, singleValues } = this.data

    config.SECTIONS.forEach(section => {
      section.items.forEach(item => {
        if (!activeItems[item.key]) return
        if (!item.multi) {
          config.setSnapshotField(snapshot, item.key, parseFloat(singleValues[item.key]) || 0)
        }
      })
    })

    return snapshot
  },

  // ===== Submit =====

  onSubmit() {
    if (!this.data.hasAnyItem) {
      wx.showToast({ title: '请先添加资产或负债', icon: 'none' })
      return
    }

    const snapshot = this.buildSnapshot()

    const data = storage.getData()
    const existing = data.snapshots.find(s => s.month === this.data.monthId)
    config.SECTIONS.forEach(section => {
      section.items.forEach(item => {
        if (!item.multi) return
        if (existing) {
          const existingVal = config.getSnapshotField(existing, section.id, item.key)
          if (Array.isArray(existingVal)) {
            config.setSnapshotField(snapshot, item.key, existingVal)
          }
        }
      })
    })

    snapshot.netWorth = config.calcNetWorth(snapshot)
    const netWorthText = fire.formatMoney(snapshot.netWorth)

    wx.showModal({
      title: '确认录入',
      content: '本月净资产：' + netWorthText + '\n确认记录本次数据？',
      success: (res) => {
        if (res.confirm) {
          storage.saveSnapshot(snapshot).then(() => {
            this.clearDraft()
            wx.showToast({ title: '本月记录已保存' })
            wx.switchTab({ url: '/pages/index/index' })
          })
        }
      }
    })
  },

  noop() {}
})