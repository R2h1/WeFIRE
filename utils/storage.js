const STORAGE_KEY = 'wefire_data'

function getDefaultData() {
  return {
    fireTarget: null,
    fireYear: null,
    startYear: new Date().getFullYear(),
    snapshots: []
  }
}

function getData() {
  try {
    const data = wx.getStorageSync(STORAGE_KEY)
    if (data && data.snapshots) {
      const merged = Object.assign(getDefaultData(), data)
      return merged
    }
    // First launch or data missing
    const defaultData = getDefaultData()
    wx.setStorageSync(STORAGE_KEY, defaultData)
    return defaultData
  } catch (e) {
    return getDefaultData()
  }
}

function saveData(data) {
  return new Promise((resolve, reject) => {
    wx.setStorage({
      key: STORAGE_KEY,
      data: data,
      success: resolve,
      fail: reject
    })
  })
}

function getSettings() {
  const data = getData()
  if (!data.fireTarget) return null
  return {
    targetAmount: data.fireTarget,
    retirementYear: data.fireYear
  }
}

function saveSettings(settings) {
  const data = getData()
  data.fireTarget = settings.targetAmount
  data.fireYear = settings.retirementYear
  return saveData(data)
}

function getSnapshots() {
  const data = getData()
  return data.snapshots || []
}

function saveSnapshot(snapshot) {
  const data = getData()
  const idx = data.snapshots.findIndex(s => s.month === snapshot.month)
  if (idx > -1) {
    data.snapshots[idx] = snapshot
  } else {
    data.snapshots.push(snapshot)
  }
  data.snapshots.sort((a, b) => a.month.localeCompare(b.month))
  // Update startYear
  if (data.snapshots.length > 0) {
    const firstMonth = data.snapshots[0].month
    data.startYear = parseInt(firstMonth.split('-')[0])
  }
  return saveData(data)
}

module.exports = {
  getData,
  saveData,
  getSettings,
  saveSettings,
  getSnapshots,
  saveSnapshot
}
