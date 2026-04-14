/*
 * 个人中心页面 - 用户信息展示和设置
 */

const auth = require('../../utils/auth.js');
const initUtil = require('../../utils/initUtil.js');
const { callCloudFunction } = require('../../utils/httpUtil.js');
const app = getApp();

Page({
  data: {
    // 用户信息
    userInfo: null,
    // 员工姓名
    staffName: '',
    // 脱敏手机号
    maskedPhone: '',
    // 角色文本
    roleText: '',
    // 是否可访问管理后台
    canAccessAdmin: false
  },

  // 页面加载时调用
  onLoad() {
    this.initPage();
  },

  // 页面显示时调用
  async onShow() {
    if (auth.isInitializing()) {
      await initUtil.waitForAppInit();
    }
    auth.checkPageAccess('tabbar');
    this.loadUserInfo();
    this.checkAdminAccess();
  },

  // 初始化页面
  async initPage() {
    await initUtil.waitForAppInit();
    this.loadUserInfo();
    this.checkAdminAccess();
  },

  // 加载用户信息
  loadUserInfo() {
    const phone = app.globalData.phone;
    const staffName = app.globalData.name || '姓名未录入';
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

  // 选择头像
  async onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    
    if (!avatarUrl) return;

    wx.showLoading({ title: '保存中...' });

    try {
      const res = await callCloudFunction('userFunctions', {
        type: 'updateAvatar',
        avatarUrl: avatarUrl
      });

      if (res && res.success) {
        const userInfo = { avatarUrl };
        app.globalData.userInfo = userInfo;

        this.setData({ userInfo });
        wx.showToast({ title: '头像更新成功', icon: 'success' });
      } else {
        wx.showToast({ title: res?.message || '保存失败', icon: 'none' });
      }
    } catch (err) {
      console.error('保存头像失败', err);
      wx.showToast({ title: '保存失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  // 检查管理员访问权限
  checkAdminAccess() {
    const role = auth.getRole();
    this.setData({
      canAccessAdmin: role === 'admin' || role === 'kitchen'
    });
  },

  // 跳转到提醒设置页面
  goToReminder() {
    wx.navigateTo({
      url: '/pages/reminderSettings/reminderSettings'
    });
  },

  // 跳转到统计页面
  goToStats() {
    wx.navigateTo({
      url: '/pages/orderStats/orderStats'
    });
  },

  // 跳转到帮助页面
  goToHelp() {
    wx.navigateTo({
      url: '/pages/help/help'
    });
  },

  // 跳转到管理后台
  goToAdmin() {
    wx.navigateTo({
      url: '/pages/admin/admin'
    });
  },

  // 跳转到意见建议页面
  goToFeedback() {
    wx.navigateTo({
      url: '/pages/feedback/feedback'
    });
  }
});
