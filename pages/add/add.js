const storage = require('../../utils/storage')
const config = require('../../utils/config')
const fire = require('../../utils/fire')

Page({
  data: {
    monthId: '',
    monthLabel: '',
    sectionGroups: [],
    loadedFromPrev: false,
    netWorthText: '¥0',
    expandedKey: '',

    // Toast
    toastShow: false,
    toastMsg: '',

    // 实例编辑弹窗
    showInstancePopup: false,
    instanceCategory: '',
    instanceConfig: null,
    instanceFields: [],
    modalMode: 'add',
    modalName: '',
    modalFieldValues: {},
    modalEditIndex: -1,
  },

  // 内部状态
  _singleValues: {},
  _modalExistingNames: [],
  _initialInstances: null,
  _prevSnapshot: null,

  _generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  },

  // ===== 生命周期 =====
  onShow() {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    const monthId = year + '-' + String(month).padStart(2, '0')
    this.setData({
      monthId,
      monthLabel: year + '年' + month + '月'
    })
    if (!this.loadDraft()) {
      this.loadData()
    }
    this.updateTabBar()
  },

  updateTabBar() {
    const tabBar = typeof this.getTabBar === 'function' && this.getTabBar()
    tabBar && tabBar.setData({ active: 1 })
  },

  // ===== 数据加载 =====
  loadData() {
    const data = storage.getData()
    const monthId = this.data.monthId
    const snapshot = data.snapshots.find(s => s.month === monthId)

    if (snapshot) {
      this._initSingleValues(snapshot)
      this._prevSnapshot = null
      this.setData({ loadedFromPrev: false })
    } else {
      this.loadFromPrevious(data, monthId)
    }
    this.buildSectionGroups()
    this.calcNetWorth()
  },

  loadFromPrevious(data, monthId) {
    const prev = [...data.snapshots].reverse().find(s => s.month < monthId)
    if (prev) {
      this._initSingleValues(prev)
      this._prevSnapshot = prev
      this.setData({ loadedFromPrev: true })
    } else {
      this._prevSnapshot = null
      this.resetForm()
    }
  },

  _initSingleValues(snapshot) {
    const vals = {}
    config.SECTIONS.forEach(section => {
      section.items.forEach(item => {
        if (!item.multi) {
          const raw = config.getSnapshotField(snapshot, section.id, item.key)
          vals[item.key] = parseFloat(raw) || 0
        }
      })
    })
    this._singleValues = vals
  },

  resetForm() {
    const vals = {}
    config.SECTIONS.forEach(section => {
      section.items.forEach(item => {
        if (!item.multi) vals[item.key] = 0
      })
    })
    this._singleValues = vals
    this.setData({ loadedFromPrev: false, expandedKey: '' })
    this.buildSectionGroups()
    this.calcNetWorth()
  },

  // ===== 构建渲染数据 =====
  buildSectionGroups() {
    const data = storage.getData()
    const snapshot = data.snapshots.find(s => s.month === this.data.monthId)
    const expandedKey = this.data.expandedKey
    const prevEditing = {}

    // 保留当前正在编辑的状态
    const currGroups = this.data.sectionGroups
    if (currGroups.length) {
      currGroups.forEach(group => {
        group.singleItems.forEach(item => {
          if (item.editing) {
            prevEditing[item.key] = { editing: true, editValue: item.editValue }
          }
        })
      })
    }

    const groups = config.SECTIONS.map(section => {
      const isAsset = section.id === 'liquidAssets' || section.id === 'fixedAssets'

      const singleItems = []
      section.items.forEach(item => {
        if (item.multi) return
        const val = this._singleValues[item.key] || 0
        const editState = prevEditing[item.key]
        singleItems.push({
          key: item.key,
          name: item.name,
          editing: editState ? editState.editing : false,
          editValue: editState ? editState.editValue : (val === 0 ? '' : String(val)),
          displayValue: fire.formatMoney(val)
        })
      })

      const multiItems = []
      section.items.forEach(item => {
        if (!item.multi) return
        const rawSrc = snapshot || this._prevSnapshot
        const raw = rawSrc ? config.getSnapshotField(rawSrc, section.id, item.key) : null
        const arr = Array.isArray(raw) ? raw : []

        let total = 0
        if (item.key === 'wechatAccounts') {
          total = arr.reduce((s, inst) => s + (parseFloat(inst.balance) || 0) + (parseFloat(inst.changeFund) || 0), 0)
        } else {
          const fk = item.fields[0].key
          total = arr.reduce((s, inst) => s + (parseFloat(inst[fk]) || 0), 0)
        }

        const instances = arr.map(inst => {
          let instTotal = 0
          if (item.key === 'wechatAccounts') {
            instTotal = (parseFloat(inst.balance) || 0) + (parseFloat(inst.changeFund) || 0)
          } else {
            instTotal = parseFloat(inst[item.fields[0].key]) || 0
          }
          return {
            id: inst.id,
            name: inst.name || '',
            displayValue: fire.formatMoney(instTotal)
          }
        })

        multiItems.push({
          key: item.key,
          name: item.name,
          expanded: expandedKey === item.key,
          totalText: fire.formatMoney(total),
          count: arr.length,
          instances
        })
      })

      return {
        id: section.id,
        label: section.label,
        titleClass: isAsset ? 'asset' : 'liability',
        singleItems,
        multiItems
      }
    })

    this.setData({ sectionGroups: groups })
  },

  // ===== 单实例卡片交互 =====
  onSingleCardTap(e) {
    const key = e.currentTarget.dataset.key
    const groups = this.data.sectionGroups

    groups.forEach(group => {
      group.singleItems.forEach(item => {
        if (item.editing && item.key !== key) {
          item.editing = false
        }
      })
    })

    for (const group of groups) {
      for (const item of group.singleItems) {
        if (item.key === key) {
          const val = this._singleValues[key] || 0
          item.editing = true
          item.editValue = val === 0 ? '' : String(val)
          this.setData({ sectionGroups: groups })
          return
        }
      }
    }
  },

  onSingleInput(e) {
    const key = e.currentTarget.dataset.key
    this._singleValues[key] = parseFloat(e.detail.value) || 0
  },

  onSingleBlur(e) {
    const key = e.currentTarget.dataset.key
    const val = parseFloat(e.detail.value) || 0
    this._singleValues[key] = val

    const groups = this.data.sectionGroups
    for (const group of groups) {
      for (const item of group.singleItems) {
        if (item.key === key) {
          item.editing = false
          item.editValue = val === 0 ? '' : String(val)
          item.displayValue = fire.formatMoney(val)
        }
      }
    }
    this.setData({ sectionGroups: groups })
    this.calcNetWorth()
    this.saveDraft()
  },

  // ===== 多实例卡片交互 =====
  onMultiToggle(e) {
    const key = e.currentTarget.dataset.key
    const currentExpanded = this.data.expandedKey

    if (currentExpanded === key) {
      this.setData({ expandedKey: '' })
    } else {
      this.setData({ expandedKey: key })
    }
    this.buildSectionGroups()
  },

  // ===== 实例弹窗 =====
  onAddInstance(e) {
    const key = e.currentTarget.dataset.key
    const itemConfig = config.getItemConfig(key)
    if (!itemConfig) return

    const data = storage.getData()
    const snapshot = data.snapshots.find(s => s.month === this.data.monthId)
    const raw = snapshot ? (config.getSnapshotField(snapshot, '', key) || []) : []
    const arr = Array.isArray(raw) ? raw : []

    if (itemConfig.limit !== -1 && arr.length >= itemConfig.limit) {
      this._showToast('已达到上限' + itemConfig.limit + '个')
      return
    }

    this._modalExistingNames = arr.map(i => i.name)
    this._initialInstances = null

    const fieldValues = {}
    itemConfig.fields.forEach(f => { fieldValues[f.key] = '' })

    this.setData({
      showInstancePopup: true,
      instanceCategory: key,
      instanceConfig: itemConfig,
      instanceFields: itemConfig.fields,
      modalMode: 'add',
      modalName: '',
      modalFieldValues: fieldValues,
      modalEditIndex: -1
    })
    this._toggleTabBar(false)
  },

  onEditInstance(e) {
    const key = e.currentTarget.dataset.key
    const index = e.currentTarget.dataset.index
    const itemConfig = config.getItemConfig(key)
    if (!itemConfig) return

    const data = storage.getData()
    const snapshot = data.snapshots.find(s => s.month === this.data.monthId)
    const raw = snapshot ? (config.getSnapshotField(snapshot, '', key) || []) : []
    const arr = Array.isArray(raw) ? raw : []
    const inst = arr[index]
    if (!inst) return

    this._modalExistingNames = arr.filter((_, i) => i !== index).map(i => i.name)
    this._initialInstances = JSON.parse(JSON.stringify(arr))

    const fieldValues = {}
    itemConfig.fields.forEach(f => {
      fieldValues[f.key] = String(parseFloat(inst[f.key]) || 0)
    })

    this.setData({
      showInstancePopup: true,
      instanceCategory: key,
      instanceConfig: itemConfig,
      instanceFields: itemConfig.fields,
      modalMode: 'edit',
      modalName: inst.name || '',
      modalFieldValues: fieldValues,
      modalEditIndex: index
    })
    this._toggleTabBar(false)
  },

  onModalNameInput(e) {
    this.setData({ modalName: e.detail.value })
  },

  onModalFieldInput(e) {
    const field = e.currentTarget.dataset.field
    const vals = { ...this.data.modalFieldValues }
    vals[field] = e.detail.value
    this.setData({ modalFieldValues: vals })
  },

  onModalCancel() {
    if (this.data.modalMode === 'edit' && this._initialInstances) {
      const current = this._buildCurrentInstance()
      const original = this._initialInstances[this.data.modalEditIndex]
      if (this._instanceChanged(current, original)) {
        wx.showModal({
          title: '确认取消',
          content: '有未保存的修改，确定放弃吗？',
          success: (res) => {
            if (res.confirm) {
              this._closeModal()
            }
          }
        })
        return
      }
    }
    this._closeModal()
  },

  _buildCurrentInstance() {
    const { modalName, modalFieldValues, instanceFields } = this.data
    const obj = { name: modalName }
    instanceFields.forEach(f => {
      obj[f.key] = parseFloat(modalFieldValues[f.key]) || 0
    })
    return obj
  },

  _instanceChanged(a, b) {
    if (!b) return true
    if (a.name !== (b.name || '')) return true
    const fields = this.data.instanceFields
    for (const f of fields) {
      if ((parseFloat(a[f.key]) || 0) !== (parseFloat(b[f.key]) || 0)) return true
    }
    return false
  },

  _closeModal() {
    this.setData({ showInstancePopup: false })
    this._toggleTabBar(true)
    this._initialInstances = null
  },

  onModalConfirm() {
    const name = this.data.modalName.trim()
    if (!name) {
      this._showToast('名称不能为空')
      return
    }
    if (this._modalExistingNames.includes(name)) {
      this._showToast('名称已存在')
      return
    }

    const key = this.data.instanceCategory
    const data = storage.getData()
    let snapshot = data.snapshots.find(s => s.month === this.data.monthId)
    if (!snapshot) {
      snapshot = config.createEmptySnapshot(this.data.monthId)
      data.snapshots.push(snapshot)
    }

    const raw = config.getSnapshotField(snapshot, '', key) || []
    const arr = Array.isArray(raw) ? JSON.parse(JSON.stringify(raw)) : []
    const inst = this._buildCurrentInstance()

    if (this.data.modalMode === 'edit') {
      const idx = this.data.modalEditIndex
      arr[idx] = { ...arr[idx], ...inst }
    } else {
      inst.id = this._generateId()
      arr.push(inst)
    }

    config.setSnapshotField(snapshot, key, arr)
    data.snapshots.sort((a, b) => a.month.localeCompare(b.month))
    storage.saveData(data)

    this._closeModal()
    this.buildSectionGroups()
    this.calcNetWorth()
    this.saveDraft()
  },

  onModalDelete() {
    const name = this.data.modalName || '未命名'
    wx.showModal({
      title: '确认删除',
      content: '删除「' + name + '」？',
      success: (res) => {
        if (res.confirm) {
          const key = this.data.instanceCategory
          const data = storage.getData()
          const snapshot = data.snapshots.find(s => s.month === this.data.monthId)
          if (snapshot) {
            const raw = config.getSnapshotField(snapshot, '', key) || []
            const arr = Array.isArray(raw) ? JSON.parse(JSON.stringify(raw)) : []
            arr.splice(this.data.modalEditIndex, 1)
            config.setSnapshotField(snapshot, key, arr)
            data.snapshots.sort((a, b) => a.month.localeCompare(b.month))
            storage.saveData(data)
          }
          this._closeModal()
          this.buildSectionGroups()
          this.calcNetWorth()
          this.saveDraft()
        }
      }
    })
  },

  onInstancePopupClose() {
    this.onModalCancel()
  },

  // ===== 净资产计算 =====
  calcNetWorth() {
    const snapshot = this.buildSnapshot()
    const data = storage.getData()
    const existing = data.snapshots.find(s => s.month === this.data.monthId)

    const existingSrc = existing || this._prevSnapshot
    if (existingSrc) {
      config.SECTIONS.forEach(section => {
        section.items.forEach(item => {
          if (!item.multi) return
          const val = config.getSnapshotField(existingSrc, section.id, item.key)
          if (Array.isArray(val)) {
            config.setSnapshotField(snapshot, item.key, val)
          }
        })
      })
    }

    const netWorth = config.calcNetWorth(snapshot)
    this.setData({ netWorthText: fire.formatMoney(netWorth) })
  },

  buildSnapshot() {
    const snapshot = config.createEmptySnapshot(this.data.monthId)
    const vals = this._singleValues

    config.SECTIONS.forEach(section => {
      section.items.forEach(item => {
        if (item.multi) return
        config.setSnapshotField(snapshot, item.key, parseFloat(vals[item.key]) || 0)
      })
    })

    return snapshot
  },

  // ===== 草稿 =====
  saveDraft() {
    try {
      wx.setStorageSync('add_draft', {
        monthId: this.data.monthId,
        singleValues: this._singleValues
      })
    } catch (e) {}
  },

  loadDraft() {
    try {
      const draft = wx.getStorageSync('add_draft')
      if (draft && draft.monthId === this.data.monthId && draft.singleValues) {
        this._singleValues = draft.singleValues
        this.buildSectionGroups()
        this.calcNetWorth()
        return true
      }
    } catch (e) {}
    return false
  },

  clearDraft() {
    try { wx.removeStorageSync('add_draft') } catch (e) {}
  },

  // ===== 清空 =====
  onClearForm() {
    wx.showModal({
      title: '清空重填',
      content: '确定要清空所有已填入的数据吗？',
      success: (res) => {
        if (res.confirm) {
          this.clearDraft()
          this.setData({ expandedKey: '' })
          this.resetForm()
          this.calcNetWorth()
        }
      }
    })
  },

  // ===== 提交 =====
  onSubmit() {
    const snapshot = this.buildSnapshot()

    const data = storage.getData()
    const existing = data.snapshots.find(s => s.month === this.data.monthId)
    const existingSrc = existing || this._prevSnapshot
    config.SECTIONS.forEach(section => {
      section.items.forEach(item => {
        if (!item.multi) return
        if (existingSrc) {
          const existingVal = config.getSnapshotField(existingSrc, section.id, item.key)
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

  // ===== 工具 =====
  _toggleTabBar(visible) {
    const tabBar = typeof this.getTabBar === 'function' && this.getTabBar()
    tabBar && tabBar.setData({ hidden: !visible })
  },

  _showToast(msg) {
    this.setData({ toastShow: true, toastMsg: msg })
    clearTimeout(this._toastTimer)
    this._toastTimer = setTimeout(() => {
      this.setData({ toastShow: false })
    }, 1600)
  },

  noop() {}
})
