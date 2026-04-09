const auth = require('../../utils/auth.js');
const initUtil = require('../../utils/initUtil.js');

Page({
  data: {
    isAdmin: false
  },

  onLoad() {
    this.checkRole();
  },

  async onShow() {
    if (auth.isInitializing()) {
      await initUtil.waitForAppInit();
    }
    auth.checkPageAccess('admin');
    this.checkRole();
  },

  checkRole() {
    const role = auth.getRole();
    this.setData({
      isAdmin: role === 'admin'
    });
  },

  goToMenu() {
    wx.navigateTo({
      url: '/pages/menu/menu'
    });
  },

  goToStatistics() {
    wx.navigateTo({
      url: '/pages/statistics/statistics'
    });
  },

  goToOrderList() {
    wx.navigateTo({
      url: '/pages/orderList/orderList'
    });
  },

  goToSettings() {
    wx.navigateTo({
      url: '/pages/settings/settings'
    });
  },

  goToUserManage() {
    wx.navigateTo({
      url: '/pages/userManage/userManage'
    });
  }
});
