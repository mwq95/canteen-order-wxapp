/*
 * 管理后台首页 - 管理员功能入口
 */

const auth = require('../../utils/auth.js');
const initUtil = require('../../utils/initUtil.js');

Page({
  data: {
    // 是否为管理员
    isAdmin: false
  },

  // 页面加载时调用
  onLoad() {
    this.checkRole();
  },

  // 页面显示时调用
  async onShow() {
    if (auth.isInitializing()) {
      await initUtil.waitForAppInit();
    }
    auth.checkPageAccess('admin');
    this.checkRole();
  },

  // 检查用户角色
  checkRole() {
    const role = auth.getRole();
    this.setData({
      isAdmin: role === 'admin'
    });
  },

  // 跳转到菜单管理页面
  goToMenu() {
    wx.navigateTo({
      url: '/pages/menu/menu'
    });
  },

  goToDishManage() {
    wx.navigateTo({
      url: '/pages/dishManage/dishManage'
    });
  },

  goToStatistics() {
    wx.navigateTo({
      url: '/pages/statistics/statistics'
    });
  },

  // 跳转到订单列表页面
  goToOrderList() {
    wx.navigateTo({
      url: '/pages/orderList/orderList'
    });
  },

  // 跳转到设置页面
  goToSettings() {
    wx.navigateTo({
      url: '/pages/settings/settings'
    });
  },

  // 跳转到用户管理页面
  goToUserManage() {
    wx.navigateTo({
      url: '/pages/userManage/userManage'
    });
  },

  // 跳转到意见建议列表页面
  goToFeedbackList() {
    wx.navigateTo({
      url: '/pages/feedbackList/feedbackList'
    });
  }
});
