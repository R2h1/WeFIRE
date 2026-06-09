const storage = require('./storage')
const transactionStore = require('./transaction-store')

function exportData() {
  const data = storage.getData()
  const transactions = transactionStore.getTransactions()
  const exportObj = {
    version: 3,
    exportedAt: new Date().toISOString().slice(0, 10),
    data: data,
    transactions: transactions
  }
  const jsonStr = JSON.stringify(exportObj, null, 2)
  const fs = wx.getFileSystemManager()
  const dateStr = new Date().toISOString().slice(0, 10)
  const fileName = 'WeFIRE备份_' + dateStr + '.json'
  const filePath = wx.env.USER_DATA_PATH + '/' + fileName

  try {
    fs.writeFileSync(filePath, jsonStr, 'utf-8')
    wx.shareFileMessage({
      filePath: filePath,
      fileName: fileName,
      success() {
        wx.showToast({ title: '分享备份文件成功' })
      },
      fail(err) {
        wx.showToast({ title: '分享失败', icon: 'none' })
        console.error('shareFileMessage fail', err)
      }
    })
  } catch (e) {
    wx.showToast({ title: '导出失败', icon: 'none' })
    console.error('exportData error', e)
  }
}

function importData() {
  wx.chooseMessageFile({
    count: 1,
    type: 'file',
    success(res) {
      const file = res.tempFiles[0]
      if (!file.name.endsWith('.json')) {
        wx.showToast({ title: '请选择 .json 备份文件', icon: 'none' })
        return
      }
      const fs = wx.getFileSystemManager()
      try {
        const content = fs.readFileSync(file.path, 'utf-8')
        const parsed = JSON.parse(content)
        if (!parsed.data) {
          wx.showToast({ title: '数据格式错误', icon: 'none' })
          return
        }
        storage.saveData(parsed.data).then(() => {
          if (parsed.transactions) {
            transactionStore.saveTransactions(parsed.transactions)
          }
          wx.showToast({ title: '恢复成功' })
        })
      } catch (e) {
        wx.showToast({ title: '文件读取失败', icon: 'none' })
        console.error('importData error', e)
      }
    },
    fail(err) {
      if (err.errMsg && err.errMsg.indexOf('cancel') > -1) return
      wx.showToast({ title: '选择文件失败', icon: 'none' })
      console.error('chooseMessageFile fail', err)
    }
  })
}

module.exports = {
  exportData,
  importData
}