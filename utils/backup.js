const storage = require('./storage')

function exportData() {
  const data = storage.getData()
  const exportObj = {
    version: 2,
    exportedAt: new Date().toISOString(),
    data: data
  }
  wx.setClipboardData({
    data: JSON.stringify(exportObj),
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
    const parsed = JSON.parse(jsonStr)
    if (parsed.version === 2 && parsed.data) {
      return storage.saveData(parsed.data).then(() => {
        wx.showToast({ title: '恢复成功' })
      })
    }
    wx.showToast({ title: '数据格式错误', icon: 'none' })
    return Promise.reject(new Error('Invalid format'))
  } catch (e) {
    wx.showToast({ title: 'JSON 解析失败', icon: 'none' })
    return Promise.reject(e)
  }
}

module.exports = {
  exportData,
  importData
}
