function exportData() {
  const settings = wx.getStorageSync('fire_settings')
  const snapshots = wx.getStorageSync('fire_snapshots')
  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: settings || null,
    snapshots: snapshots || []
  }
  wx.setClipboardData({
    data: JSON.stringify(data),
    success() {
      wx.showToast({ title: '已复制到剪贴板' })
    },
    fail() {
      wx.showToast({ title: '复制失败', icon: 'none' })
    }
  })
}

function importData(jsonStr) {
  try {
    const data = JSON.parse(jsonStr)
    if (!data.version || !data.snapshots) {
      wx.showToast({ title: '数据格式错误', icon: 'none' })
      return Promise.reject(new Error('Invalid format'))
    }
    if (data.settings) {
      wx.setStorageSync('fire_settings', data.settings)
    }
    wx.setStorageSync('fire_snapshots', data.snapshots)
    wx.showToast({ title: '恢复成功' })
    return Promise.resolve(data)
  } catch (e) {
    wx.showToast({ title: 'JSON 解析失败', icon: 'none' })
    return Promise.reject(e)
  }
}

module.exports = {
  exportData,
  importData
}
