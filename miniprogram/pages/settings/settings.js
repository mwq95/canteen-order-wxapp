const auth = require('../../utils/auth.js');

Page({
  data: {
    breakfastDeadline: '',
    lunchDeadline: '',
    dinnerDeadline: '',
    configId: null,
    loading: false
  },

  onLoad() {
    this.loadConfig();
  },

  onShow() {
    auth.checkPageAccess('settings');
  },

  loadConfig() {
    const db = wx.cloud.database();
    db.collection('configs').where({ key: 'order_deadline' }).get().then(res => {
      if (res.data.length > 0) {
        const config = res.data[0];
        this.setData({
          breakfastDeadline: config.breakfast_deadline || '08:00',
          lunchDeadline: config.lunch_deadline || '12:00',
          dinnerDeadline: config.dinner_deadline || '17:00',
          configId: config._id
        });
      } else {
        this.setData({
          breakfastDeadline: '08:00',
          lunchDeadline: '12:00',
          dinnerDeadline: '17:00'
        });
      }
    }).catch(err => {
      console.error('加载设置失败', err);
      wx.showToast({
        title: '加载设置失败',
        icon: 'none'
      });
    });
  },

  onBreakfastChange(e) {
    this.setData({ breakfastDeadline: e.detail.value });
  },

  onLunchChange(e) {
    this.setData({ lunchDeadline: e.detail.value });
  },

  onDinnerChange(e) {
    this.setData({ dinnerDeadline: e.detail.value });
  },

  validateTimeFormat(time) {
    if (!time) return false;
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  },

  saveConfig() {
    const { breakfastDeadline, lunchDeadline, dinnerDeadline } = this.data;

    if (!breakfastDeadline || !lunchDeadline || !dinnerDeadline) {
      wx.showToast({
        title: '请选择所有截止时间',
        icon: 'none'
      });
      return;
    }

    if (!this.validateTimeFormat(breakfastDeadline) || !this.validateTimeFormat(lunchDeadline) || !this.validateTimeFormat(dinnerDeadline)) {
      wx.showToast({
        title: '时间格式不正确',
        icon: 'none'
      });
      return;
    }

    this.setData({ loading: true });
    wx.showLoading({ title: '保存中...' });

    wx.cloud.callFunction({
      name: 'quickstartFunctions',
      data: {
        type: 'updateDeadlineConfig',
        data: {
          breakfast_deadline: breakfastDeadline,
          lunch_deadline: lunchDeadline,
          dinner_deadline: dinnerDeadline
        }
      }
    }).then(res => {
      wx.hideLoading();
      this.setData({ loading: false });

      if (res.result.success) {
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        });
      } else {
        wx.showToast({
          title: res.result.error || '保存失败',
          icon: 'none',
          duration: 2000
        });
      }
    }).catch(err => {
      wx.hideLoading();
      this.setData({ loading: false });
      console.error('保存设置失败', err);
      
      let errorMsg = '保存失败';
      if (err.errCode === -1) {
        errorMsg = '网络错误，请检查网络连接';
      } else if (err.errMsg) {
        errorMsg = err.errMsg;
      }
      
      wx.showToast({
        title: errorMsg,
        icon: 'none',
        duration: 2000
      });
    });
  }
});