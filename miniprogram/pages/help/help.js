/*
 * 帮助页面 - 系统使用说明
 */

const auth = require('../../utils/auth.js');

Page({
  data: {
    // 是否显示厨房功能
    showKitchen: false,
    // 是否显示管理员功能
    showAdmin: false
  },

  // 页面加载时调用
  onLoad() {
    const role = auth.getRole();
    this.setData({
      showKitchen: role === 'admin' || role === 'kitchen',
      showAdmin: role === 'admin'
    });
  }
});
