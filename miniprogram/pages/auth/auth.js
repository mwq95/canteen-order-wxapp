/*
 * 身份验证页面 - 用于员工手机号验证和身份绑定
 */

const app = getApp();
const initUtil = require('../../utils/initUtil.js');

Page({
  data: {
    // 手机号
    phone: '',
    // 加载状态
    loading: false,
    // 验证检查状态
    checking: true
  },

  // 页面加载时调用
  onLoad() {
    this.checkIfVerified();
  },

  // 页面显示时调用
  onShow() {
    this.checkIfVerified();
  },

  // 检查是否已验证
  async checkIfVerified() {
    if (app.globalData.openid && app.globalData.isVerified) {
      this.redirectToOrderPage();
      return;
    }

    if (app.globalData.openid === null || app.globalData.isVerified === undefined) {
      await initUtil.waitForAppInit();

      if (app.globalData.isVerified) {
        this.redirectToOrderPage();
        return;
      }
    }

    this.setData({ checking: false });
  },

  // 跳转到订单页面
  redirectToOrderPage() {
    wx.switchTab({
      url: '/pages/order/order'
    });
  },

  // 手机号输入事件
  onPhoneInput(e) {
    this.setData({
      phone: e.detail.value
    });
  },

  // 获取手机号
  getPhoneNumber(e) {
    if (e.detail.code) {
      this.verifyByPhoneNumber(e.detail.code);
    }
  },

  // 通过手机号验证
  verifyByPhoneNumber(code) {
    this.showLoading('验证中...');

    wx.cloud.callFunction({
      name: 'quickstartFunctions',
      data: {
        type: 'getPhoneNumber',
        code: code
      }
    }).then(res => {
      if (res.result.phoneNumber) {
        this.verifyStaff(res.result.phoneNumber);
      } else {
        this.hideLoading();
        this.showToast('获取手机号失败', 'none');
      }
    }).catch(err => {
      console.error('获取手机号失败', err);
      this.hideLoading();
      this.showToast('获取手机号失败', 'none');
    });
  },

  // 手动验证
  onManualVerify() {
    const phone = this.data.phone.trim();

    if (!this.validatePhone(phone)) {
      return;
    }

    this.verifyStaff(phone);
  },

  // 验证手机号格式
  validatePhone(phone) {
    if (!phone) {
      this.showToast('请输入手机号', 'none');
      return false;
    }

    if (!/^1[3-9]\d{9}$/.test(phone)) {
      this.showToast('请输入正确的手机号', 'none');
      return false;
    }

    return true;
  },

  // 验证员工身份
  verifyStaff(phone) {
    const openid = app.globalData.openid;

    if (!openid) {
      this.hideLoading();
      this.showToast('系统初始化中，请稍后再试', 'none');
      return;
    }

    wx.cloud.callFunction({
      name: 'quickstartFunctions',
      data: {
        type: 'verifyAndBindPhone',
        // 手机号
        phone: String(phone)
      }
    }).then(res => {
      this.hideLoading();

      if (res.result.success) {
        const staffData = res.result.data || {};
        
        app.globalData.isVerified = true;
        app.globalData.role = staffData.role;
        app.globalData.phone = String(phone);
        app.globalData.name = staffData.name;

        this.showToast('验证成功', 'success');

        setTimeout(() => {
          this.redirectToOrderPage();
        }, 1500);
      } else {
        if (res.result.code === 'PHONE_ALREADY_BOUND') {
          this.showModal('绑定失败', res.result.error);
        } else {
          this.showModal('验证失败', res.result.error || '验证失败');
        }
      }
    }).catch(err => {
      console.error('验证员工身份失败', err);
      this.hideLoading();
      this.showToast('验证失败', 'none');
    });
  },

  // 显示加载提示
  showLoading(title = '加载中...') {
    this.setData({ loading: true });
    wx.showLoading({ title, mask: true });
  },

  // 隐藏加载提示
  hideLoading() {
    this.setData({ loading: false });
    wx.hideLoading();
  },

  // 显示提示消息
  showToast(title, icon = 'none') {
    wx.showToast({ title, icon, duration: 2000 });
  },

  // 显示模态框
  showModal(title, content) {
    wx.showModal({
      title,
      content,
      showCancel: false
    });
  }
});
