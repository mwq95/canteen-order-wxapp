const app = getApp();
const initUtil = require('../../utils/initUtil.js');

Page({
  data: {
    phone: '',
    loading: false,
    checking: true
  },

  onLoad() {
    this.checkIfVerified();
  },

  onShow() {
    this.checkIfVerified();
  },

  async checkIfVerified() {
    if (app.globalData.openid && app.globalData.isVerified) {
      wx.switchTab({
        url: '/pages/order/order'
      });
      return;
    }

    if (app.globalData.openid === null || app.globalData.isVerified === undefined) {
      await initUtil.waitForAppInit();

      if (app.globalData.isVerified) {
        wx.switchTab({
          url: '/pages/order/order'
        });
        return;
      }
    }

    this.setData({ checking: false });
  },

  onPhoneInput(e) {
    this.setData({
      phone: e.detail.value
    });
  },

  getPhoneNumber(e) {
    if (e.detail.code) {
      this.verifyByPhoneNumber(e.detail.code);
    }
  },

  verifyByPhoneNumber(code) {
    wx.showLoading({ title: '验证中...' });

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
        wx.hideLoading();
        wx.showToast({
          title: '获取手机号失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      wx.hideLoading();
      wx.showToast({
        title: '获取手机号失败',
        icon: 'none'
      });
    });
  },

  onManualVerify() {
    const phone = this.data.phone.trim();
    if (!phone) {
      wx.showToast({
        title: '请输入手机号',
        icon: 'none'
      });
      return;
    }

    if (!/^1[3-9]\d{9}$/.test(phone)) {
      wx.showToast({
        title: '请输入正确的手机号',
        icon: 'none'
      });
      return;
    }

    this.verifyStaff(phone);
  },

  verifyStaff(phone) {
    const db = wx.cloud.database();

    db.collection('staffs').where({
      phone: String(phone),
      status: 'active'
    }).get().then(res => {
      if (res.data.length > 0) {
        const staff = res.data[0];
        this.createOrUpdateUser(staff);
      } else {
        wx.hideLoading();
        wx.showModal({
          title: '验证失败',
          content: '您不在单位人员列表中，请联系管理员',
          showCancel: false
        });
      }
    }).catch(err => {
      wx.hideLoading();
      wx.showToast({
        title: '验证失败',
        icon: 'none'
      });
    });
  },

  createOrUpdateUser(staff) {
    const db = wx.cloud.database();
    const openid = app.globalData.openid;

    db.collection('users').where({
      phone: String(staff.phone)
    }).get().then(res => {
      const userData = {
        phone: staff.phone,
        name: staff.name,
        isVerified: true,
        role: staff.role,
        subscribeOrderReminder: true,
        subscribeMealReminder: true,
        updateTime: new Date()
      };

      if (res.data.length > 0) {
        db.collection('users').doc(res.data[0]._id).update({
          data: userData
        }).then(() => {
          this.finishVerification(staff);
        });
      } else {
        userData.createTime = new Date();
        db.collection('users').add({
          data: userData
        }).then(() => {
          this.finishVerification(staff);
        });
      }
    }).catch(err => {
      wx.hideLoading();
      wx.showToast({
        title: '验证失败',
        icon: 'none'
      });
    });
  },

  finishVerification(staff) {
    app.globalData.isVerified = true;
    app.globalData.role = staff.role;
    app.globalData.phone = staff.phone;
    app.globalData.name = staff.name;
    app.globalData.subscribeOrderReminder = true;
    app.globalData.subscribeMealReminder = true;

    wx.hideLoading();
    wx.showToast({
      title: '验证成功',
      icon: 'success'
    });

    setTimeout(() => {
      wx.switchTab({
        url: '/pages/order/order'
      });
    }, 1500);
  }
});