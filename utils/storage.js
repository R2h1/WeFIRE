const STORAGE_KEYS = {
  SETTINGS: 'fire_settings',
  SNAPSHOTS: 'fire_snapshots'
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
  STORAGE_KEYS
}
