const auth = require('../../utils/auth.js');
const initUtil = require('../../utils/initUtil.js');
const app = getApp();

Page({
  data: {
    userInfo: null,
    staffName: '',
    maskedPhone: '',
    roleText: '',
    canAccessAdmin: false
  },

  onLoad() {
    this.initPage();
  },

  async onShow() {
    if (auth.isInitializing()) {
      await initUtil.waitForAppInit();
    }
    auth.checkPageAccess('tabbar');
    this.loadUserInfo();
    this.checkAdminAccess();
  },

  async initPage() {
    await initUtil.waitForAppInit();
    this.loadUserInfo();
    this.checkAdminAccess();
  },

  loadUserInfo() {
    const phone = app.globalData.phone;
    const staffName = app.globalData.name || '未录入';
    const maskedPhone = phone ? phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : '未绑定';
    const roleMap = { admin: '管理员', kitchen: '厨房', staff: '工作人员' };
    const roleText = roleMap[app.globalData.role] || '工作人员';
    const userInfo = app.globalData.userInfo || {};

    this.setData({
      userInfo,
      staffName,
      maskedPhone,
      roleText
    });
  },

  checkAdminAccess() {
    const role = auth.getRole();
    this.setData({
      canAccessAdmin: role === 'admin' || role === 'kitchen'
    });
  },

  goToReminder() {
    wx.navigateTo({
      url: '/pages/reminderSettings/reminderSettings'
    });
  },

  goToStats() {
    wx.navigateTo({
      url: '/pages/orderStats/orderStats'
    });
  },

  goToHelp() {
    wx.navigateTo({
      url: '/pages/help/help'
    });
  },

  goToAdmin() {
    wx.navigateTo({
      url: '/pages/admin/admin'
    });
  }
});
