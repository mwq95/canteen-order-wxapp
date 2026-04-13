const app = getApp();
const initUtil = require('../../utils/initUtil.js');
const { callCloudFunction } = require('../../utils/httpUtil.js');

Page({
  data: {
    phone: '',
    loading: false,
    checking: true,
    initFailed: false
  },

  onLoad() {
    this.checkIfVerified();
  },

  onShow() {
    if (!this.data.checking) {
      this.checkIfVerified();
    }
  },

  async checkIfVerified() {
    this.setData({ checking: true, initFailed: false });

    await initUtil.waitForAppInit();

    if (app.globalData.openid && app.globalData.isVerified) {
      this.redirectToOrderPage();
      return;
    }

    if (!app.globalData.openid) {
      this.setData({ 
        checking: false, 
        initFailed: true 
      });
      return;
    }

    this.setData({ checking: false });
  },

  retryInit() {
    this.checkIfVerified();
  },

  redirectToOrderPage() {
    wx.switchTab({
      url: '/pages/order/order'
    });
  },

  onPhoneInput(e) {
    this.setData({
      phone: e.detail.value
    });
  },

  getPhoneNumber(e) {
    console.log('getPhoneNumber 回调:', JSON.stringify(e.detail));
    if (e.detail.code) {
      this.verifyByPhoneNumber(e.detail.code);
    } else {
      console.log('没有 code');
      this.showToast('获取手机号失败，请重试', 'none');
    }
  },

  async verifyByPhoneNumber(code) {
    this.showLoading('验证中...');

    try {
      const res = await callCloudFunction('userFunctions', {
        type: 'getPhoneNumber',
        code: code
      });

      if (res.phoneNumber) {
        this.verifyStaff(res.phoneNumber);
      } else {
        this.hideLoading();
        this.showToast('获取手机号失败', 'none');
      }
    } catch (err) {
      console.error('获取手机号失败', err);
      this.hideLoading();
      this.showToast('获取手机号失败', 'none');
    }
  },

  onManualVerify() {
    const phone = this.data.phone.trim();

    if (!this.validatePhone(phone)) {
      return;
    }

    this.verifyStaff(phone);
  },

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

  async verifyStaff(phone) {
    const openid = app.globalData.openid;

    if (!openid) {
      this.hideLoading();
      this.setData({ initFailed: true });
      this.showToast('系统初始化中，请点击重试', 'none');
      return;
    }

    try {
      const res = await callCloudFunction('userFunctions', {
        type: 'verifyAndBindPhone',
        phone: String(phone)
      });

      this.hideLoading();

      if (res.success) {
        const staffData = res.data || {};
        
        app.globalData.isVerified = true;
        app.globalData.role = staffData.role;
        app.globalData.phone = String(phone);
        app.globalData.name = staffData.name;

        this.showToast('验证成功', 'success');

        setTimeout(() => {
          this.redirectToOrderPage();
        }, 1500);
      } else {
        if (res.code === 'PHONE_ALREADY_BOUND') {
          this.showModal('绑定失败', res.error);
        } else {
          this.showModal('验证失败', res.error || '验证失败');
        }
      }
    } catch (err) {
      console.error('验证员工身份失败', err);
      this.hideLoading();
      this.showToast('验证失败', 'none');
    }
  },

  showLoading(title = '加载中...') {
    this.setData({ loading: true });
    wx.showLoading({ title, mask: true });
  },

  hideLoading() {
    this.setData({ loading: false });
    wx.hideLoading();
  },

  showToast(title, icon = 'none') {
    wx.showToast({ title, icon, duration: 2000 });
  },

  showModal(title, content) {
    wx.showModal({
      title,
      content,
      showCancel: false
    });
  }
});
