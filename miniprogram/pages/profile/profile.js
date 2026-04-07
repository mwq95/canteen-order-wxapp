const app = getApp();

Page({
  data: {
    userInfo: null,
    isAdmin: false
  },

  onLoad() {
    this.setData({
      isAdmin: app.globalData.isAdmin
    });
    this.getUserInfo();
  },

  onShow() {
    this.setData({
      isAdmin: app.globalData.isAdmin
    });
  },

  getUserInfo() {
    const userInfo = app.globalData.userInfo;
    if (userInfo) {
      this.setData({ userInfo });
    }
  },

  goToAdmin() {
    wx.navigateTo({
      url: '/pages/admin/admin'
    });
  }
});
