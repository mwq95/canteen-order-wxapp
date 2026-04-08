const auth = require('../../utils/auth.js');
const app = getApp();

Page({
  data: {
    userInfo: null,
    canAccessAdmin: false
  },

  onLoad() {
    this.checkAdminAccess();
    this.getUserInfo();
  },

  onShow() {
    auth.checkPageAccess('tabbar');
    this.checkAdminAccess();
  },

  checkAdminAccess() {
    const role = auth.getRole();
    this.setData({
      canAccessAdmin: role === 'admin' || role === 'kitchen'
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
