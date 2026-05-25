const config = require('../../utils/config')
const storage = require('../../utils/storage')

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 6)
}

Page({
  data: {
    category: '',
    month: '',
    itemConfig: null,
    instances: [],
    showDialog: false,
    editingIndex: -1,
    editName: '',
    editValues: {},
    fields: []
  },

  onLoad(options) {
    const { category, month } = options
    const itemConfig = config.getItemConfig(category)
    if (!itemConfig || !itemConfig.multi) {
      wx.showToast({ title: '参数错误', icon: 'none' })
      return
    }

    const data = storage.getData()
    const snapshot = data.snapshots.find(s => s.month === month)
    const instances = snapshot ? (config.getSnapshotField(snapshot, '', category) || []) : []

    this.setData({
      category,
      month,
      itemConfig,
      instances: JSON.parse(JSON.stringify(instances)),
      fields: itemConfig.fields
    })

    wx.setNavigationBarTitle({ title: itemConfig.name + '管理' })
  },

  onUnload() {
    this.saveChanges()
  },

  saveChanges() {
    const data = storage.getData()
    let snapshot = data.snapshots.find(s => s.month === this.data.month)
    if (!snapshot) {
      snapshot = config.createEmptySnapshot(this.data.month)
      data.snapshots.push(snapshot)
    }
    config.setSnapshotField(snapshot, this.data.category, this.data.instances)
    snapshot.netWorth = config.calcNetWorth(snapshot)
    data.snapshots.sort((a, b) => a.month.localeCompare(b.month))
    storage.saveData(data)
  },

  onAdd() {
    if (this.data.itemConfig.limit !== -1 && this.data.instances.length >= this.data.itemConfig.limit) {
      wx.showToast({ title: '已达到上限' + this.data.itemConfig.limit + '个', icon: 'none' })
      return
    }
    const fields = this.data.fields
    const values = {}
    fields.forEach(f => { values[f.key] = '' })
    this.setData({
      showDialog: true,
      editingIndex: -1,
      editName: '',
      editValues: values
    })
  },

  onEdit(e) {
    const idx = e.currentTarget.dataset.index
    const inst = this.data.instances[idx]
    const fields = this.data.fields
    const values = {}
    fields.forEach(f => { values[f.key] = String(inst[f.key] || '') })
    this.setData({
      showDialog: true,
      editingIndex: idx,
      editName: inst.name || '',
      editValues: values
    })
  },

  onDialogClose() {
    this.setData({ showDialog: false })
  },

  onNameInput(e) {
    this.setData({ editName: e.detail })
  },

  onValueInput(e) {
    const key = e.currentTarget.dataset.key
    const val = e.detail.value
    this.setData({ ['editValues.' + key]: val })
  },

  onSaveInstance() {
    const { editName, instances, editingIndex, itemConfig } = this.data
    if (!editName || !editName.trim()) {
      wx.showToast({ title: '请输入名称', icon: 'none' })
      return
    }

    const duplicate = instances.some((inst, i) => {
      return i !== editingIndex && inst.name === editName.trim()
    })
    if (duplicate) {
      wx.showToast({ title: '名称已存在', icon: 'none' })
      return
    }

    const editValues = this.data.editValues
    const instance = { id: generateId(), name: editName.trim() }
    this.data.fields.forEach(f => {
      instance[f.key] = parseFloat(editValues[f.key]) || 0
    })

    const newInstances = [...instances]
    if (editingIndex > -1) {
      instance.id = instances[editingIndex].id
      newInstances[editingIndex] = instance
    } else {
      newInstances.push(instance)
    }

    this.setData({ instances: newInstances, showDialog: false })
    this.saveChanges()
  },

  onDelete(e) {
    const idx = e.currentTarget.dataset.index
    wx.showModal({
      title: '确认删除',
      content: '删除「' + this.data.instances[idx].name + '」？',
      success: (res) => {
        if (res.confirm) {
          const newInstances = [...this.data.instances]
          newInstances.splice(idx, 1)
          this.setData({ instances: newInstances, showDialog: false })
          this.saveChanges()
        }
      }
    })
  },

  noop() {}
})