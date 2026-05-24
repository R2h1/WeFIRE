Component({
  data: {
    active: 0,
    list: [
      { icon: 'wap-home-o', text: '首页', pagePath: '/pages/index/index' },
      { icon: 'add-o', text: '添加', pagePath: '/pages/add/add' },
      {
        icon: 'user-circle-o',
        text: '我的',
        pagePath: '/pages/profile/profile',
      },
    ],
  },
  methods: {
    onTabChange(e) {
      wx.switchTab({ url: this.data.list[e.detail].pagePath });
    },
  },
});
