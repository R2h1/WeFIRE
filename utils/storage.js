const STORAGE_KEYS = {
  SETTINGS: 'fire_settings',
  SNAPSHOTS: 'fire_snapshots',
  TRACKED_ITEMS: 'fire_tracked_items',
  ENTRIES: 'fire_entries'
}

function getSettings() {
  try {
    const data = wx.getStorageSync(STORAGE_KEYS.SETTINGS)
    return data || null
  } catch (e) {
    return null
  }
}

function saveSettings(settings) {
  return new Promise((resolve, reject) => {
    wx.setStorage({
      key: STORAGE_KEYS.SETTINGS,
      data: settings,
      success: resolve,
      fail: reject
    })
  })
}

function getSnapshots() {
  try {
    const data = wx.getStorageSync(STORAGE_KEYS.SNAPSHOTS)
    return data || []
  } catch (e) {
    return []
  }
}

function saveSnapshots(snapshots) {
  return new Promise((resolve, reject) => {
    wx.setStorage({
      key: STORAGE_KEYS.SNAPSHOTS,
      data: snapshots,
      success: resolve,
      fail: reject
    })
  })
}

function getTrackedItems() {
  try {
    const data = wx.getStorageSync(STORAGE_KEYS.TRACKED_ITEMS)
    return data || []
  } catch (e) {
    return []
  }
}

function saveTrackedItems(items) {
  return new Promise((resolve, reject) => {
    wx.setStorage({
      key: STORAGE_KEYS.TRACKED_ITEMS,
      data: items,
      success: resolve,
      fail: reject
    })
  })
}

function getMonthlyEntries(monthId) {
  try {
    const all = wx.getStorageSync(STORAGE_KEYS.ENTRIES)
    return (all && all[monthId]) || []
  } catch (e) {
    return []
  }
}

function saveMonthlyEntries(monthId, entries) {
  try {
    const all = wx.getStorageSync(STORAGE_KEYS.ENTRIES) || {}
    all[monthId] = entries
    return new Promise((resolve, reject) => {
      wx.setStorage({
        key: STORAGE_KEYS.ENTRIES,
        data: all,
        success: resolve,
        fail: reject
      })
    })
  } catch (e) {
    return Promise.reject(e)
  }
}

function addSnapshot(snapshot) {
  const snapshots = getSnapshots()
  const existingIndex = snapshots.findIndex(s => s.id === snapshot.id)
  if (existingIndex > -1) {
    snapshots[existingIndex] = snapshot
  } else {
    snapshots.push(snapshot)
  }
  snapshots.sort((a, b) => a.id.localeCompare(b.id))
  return saveSnapshots(snapshots)
}

module.exports = {
  getSettings,
  saveSettings,
  getSnapshots,
  saveSnapshots,
  addSnapshot,
  getTrackedItems,
  saveTrackedItems,
  getMonthlyEntries,
  saveMonthlyEntries,
  STORAGE_KEYS
}
