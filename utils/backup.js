function exportData() {
  const settings = wx.getStorageSync('fire_settings')
  const snapshots = wx.getStorageSync('fire_snapshots')
  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: settings || null,
    snapshots: snapshots || []
  }
  const fs = wx.getFileSystemManager()
  const filePath = wx.env.USER_DATA_PATH + '/wefire_backup.json'
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
    wx.shareFileMessage({
      filePath: filePath,
      fileName: 'WeFIRE_' + new Date().toISOString().slice(0, 10) + '.json'
    })
  } catch(e) {
    wx.showToast({ title: '导出失败: ' + e.errMsg, icon: 'none' })
  }
}

function importData() {
  return new Promise((resolve, reject) => {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      success(res) {
        const file = res.tempFiles[0]
        const fs = wx.getFileSystemManager()
        try {
          const content = fs.readFileSync(file.path, 'utf-8')
          const data = JSON.parse(content)
          if (!data.version || !data.snapshots) {
            wx.showToast({ title: '文件格式错误', icon: 'none' })
            reject(new Error('Invalid file format'))
            return
          }
          if (data.settings) {
            wx.setStorageSync('fire_settings', data.settings)
          }
          wx.setStorageSync('fire_snapshots', data.snapshots)
          wx.showToast({ title: '恢复成功' })
          resolve(data)
        } catch (e) {
          wx.showToast({ title: '文件解析失败', icon: 'none' })
          reject(e)
        }
      },
      fail() {
        reject(new Error('Canceled'))
      }
    })
  })
}

module.exports = {
  exportData,
  importData
}
