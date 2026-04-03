Page({
  data: {},

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
  }
});