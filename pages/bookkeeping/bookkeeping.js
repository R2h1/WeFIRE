Page({
  data: {},

  onShow() {
    const tabBar = typeof this.getTabBar === 'function' && this.getTabBar();
    tabBar && tabBar.setData({ active: 2 });
  },
});
