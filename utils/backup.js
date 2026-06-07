const storage = require('./storage')
const transactionStore = require('./transaction-store')

function exportData() {
  const data = storage.getData()
  const transactions = transactionStore.getTransactions()
  const exportObj = {
    version: 3,
    exportedAt: new Date().toISOString(),
    data: data,
    transactions: transactions
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
    if (!parsed.data) {
      wx.showToast({ title: '数据格式错误', icon: 'none' })
      return Promise.reject(new Error('Invalid format'))
    }
    return storage.saveData(parsed.data).then(() => {
      if (parsed.transactions) {
        transactionStore.saveTransactions(parsed.transactions)
      }
      wx.showToast({ title: '恢复成功' })
    })
  } catch (e) {
    wx.showToast({ title: 'JSON 解析失败', icon: 'none' })
    return Promise.reject(e)
  }
}

module.exports = {
  exportData,
  importData
}
