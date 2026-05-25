const storage = require('./utils/storage')

App({
  globalData: {
    hasSettings: false
  },
  onLaunch() {
    const data = storage.getData()
    this.globalData.hasSettings = !!(data && data.fireTarget)
  }
})
