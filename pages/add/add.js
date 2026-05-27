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
    pickerLabel: '',
    showInstancePopup: false,
    instanceCategory: '',
    instanceConfig: null,
    instances: [],
    instanceFields: [],
  },

  _generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
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
    const key = e.currentTarget.dataset.key
    const itemConfig = config.getItemConfig(key)
    if (!itemConfig || !itemConfig.multi) return

    const data = storage.getData()
    const snapshot = data.snapshots.find(s => s.month === this.data.monthId)
    const rawInstances = snapshot ? (config.getSnapshotField(snapshot, '', key) || []) : []
    const instances = JSON.parse(JSON.stringify(rawInstances)).map(inst => {
      const obj = { id: inst.id, name: inst.name || '' }
      itemConfig.fields.forEach((f, fi) => {
        obj['f' + fi] = String(parseFloat(inst[f.key]) || 0)
      })
      return obj
    })

    this._initialInstances = JSON.parse(JSON.stringify(instances))
    this.setData({
      showInstancePopup: true,
      instanceCategory: key,
      instanceConfig: itemConfig,
      instances,
      instanceFields: itemConfig.fields
    })
    this._toggleTabBar(false)
  },

  _toggleTabBar(visible) {
    const tabBar = typeof this.getTabBar === 'function' && this.getTabBar()
    tabBar && tabBar.setData({ hidden: !visible })
  },

  onInstancePopupClose() {
    const changed = JSON.stringify(this.data.instances) !== JSON.stringify(this._initialInstances)
    if (changed) {
      wx.showModal({
        title: '确认取消',
        content: '有未保存的修改，确定放弃吗？',
        success: (res) => {
          if (res.confirm) {
            this.setData({ showInstancePopup: false })
            this._toggleTabBar(true)
          }
        }
      })
    } else {
      this.setData({ showInstancePopup: false })
      this._toggleTabBar(true)
    }
  },

  onInstanceConfirm() {
    this._saveInstanceChanges(this.data.instances)
    this.setData({ showInstancePopup: false })
    this._toggleTabBar(true)
    this.refreshMultiSummaries()
    this.calcNetWorth()
  },

  onInstanceAdd() {
    const { instanceConfig, instances, instanceFields } = this.data
    if (instanceConfig.limit !== -1 && instances.length >= instanceConfig.limit) {
      wx.showToast({ title: '已达到上限' + instanceConfig.limit + '个', icon: 'none' })
      return
    }
    const instance = { id: this._generateId(), name: '', f0: '0' }
    if (instanceFields.length > 1) instance.f1 = '0'
    const newInstances = [...instances, instance]
    this.setData({ instances: newInstances })
  },

  onInstNameInput(e) {
    const index = e.currentTarget.dataset.index
    const val = e.detail
    const newInstances = [...this.data.instances]
    newInstances[index] = { ...newInstances[index], name: val }
    this.setData({ instances: newInstances })
  },

  onInstValueInput(e) {
    const index = e.currentTarget.dataset.index
    const field = e.currentTarget.dataset.field
    const val = e.detail
    const newInstances = [...this.data.instances]
    newInstances[index] = { ...newInstances[index], [field]: val }
    this.setData({ instances: newInstances })
  },

  onInstDelete(e) {
    const index = e.currentTarget.dataset.index
    const name = this.data.instances[index].name || '未命名'
    wx.showModal({
      title: '确认删除',
      content: '删除「' + name + '」？',
      success: (res) => {
        if (res.confirm) {
          const newInstances = [...this.data.instances]
          newInstances.splice(index, 1)
          this.setData({ instances: newInstances })
        }
      }
    })
  },

  _saveInstanceChanges(instances) {
    const fields = this.data.instanceFields || []
    const clean = instances.map(inst => {
      const obj = { id: inst.id, name: inst.name }
      fields.forEach((f, fi) => { obj[f.key] = parseFloat(inst['f' + fi]) || 0 })
      return obj
    })
    const data = storage.getData()
    let snapshot = data.snapshots.find(s => s.month === this.data.monthId)
    if (!snapshot) {
      snapshot = config.createEmptySnapshot(this.data.monthId)
      data.snapshots.push(snapshot)
    }
    config.setSnapshotField(snapshot, this.data.instanceCategory, clean)
    snapshot.netWorth = config.calcNetWorth(snapshot)
    data.snapshots.sort((a, b) => a.month.localeCompare(b.month))
    storage.saveData(data)
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
    const data = storage.getData()
    const existing = data.snapshots.find(s => s.month === this.data.monthId)
    config.SECTIONS.forEach(section => {
      section.items.forEach(item => {
        if (!item.multi) return
        if (existing) {
          const val = config.getSnapshotField(existing, section.id, item.key)
          if (Array.isArray(val)) {
            config.setSnapshotField(snapshot, item.key, val)
          }
        }
      })
    })
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