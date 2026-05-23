App({
  globalData: {
    hasSettings: false
  },
  onLaunch() {
    const settings = wx.getStorageSync('fire_settings')
    if (settings && settings.targetAmount) {
      this.globalData.hasSettings = true
    }
  }
})
