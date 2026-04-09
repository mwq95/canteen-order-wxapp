const auth = require('../../utils/auth.js');

Page({
  data: {
    breakfastDeadline: '',
    lunchDeadline: '',
    dinnerDeadline: '',
    breakfastMealStart: '',
    lunchMealStart: '',
    dinnerMealStart: '',
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
          breakfastMealStart: config.breakfast_meal_start || '08:00',
          lunchMealStart: config.lunch_meal_start || '12:00',
          dinnerMealStart: config.dinner_meal_start || '17:30',
          configId: config._id
        });
      } else {
        this.setData({
          breakfastDeadline: '08:00',
          lunchDeadline: '12:00',
          dinnerDeadline: '17:00',
          breakfastMealStart: '08:00',
          lunchMealStart: '12:00',
          dinnerMealStart: '17:30'
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

  onBreakfastChange(e) { this.setData({ breakfastDeadline: e.detail.value }); },
  onLunchChange(e) { this.setData({ lunchDeadline: e.detail.value }); },
  onDinnerChange(e) { this.setData({ dinnerDeadline: e.detail.value }); },
  onBreakfastMealStartChange(e) { this.setData({ breakfastMealStart: e.detail.value }); },
  onLunchMealStartChange(e) { this.setData({ lunchMealStart: e.detail.value }); },
  onDinnerMealStartChange(e) { this.setData({ dinnerMealStart: e.detail.value }); },

  validateTimeFormat(time) {
    if (!time) return false;
    return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);
  },

  saveConfig() {
    const { 
      breakfastDeadline, lunchDeadline, dinnerDeadline,
      breakfastMealStart, lunchMealStart, dinnerMealStart
    } = this.data;

    const allTimes = [breakfastDeadline, lunchDeadline, dinnerDeadline, breakfastMealStart, lunchMealStart, dinnerMealStart];
    
    for (const t of allTimes) {
      if (!t) {
        wx.showToast({ title: '请选择所有时间', icon: 'none' });
        return;
      }
      if (!this.validateTimeFormat(t)) {
        wx.showToast({ title: '时间格式不正确', icon: 'none' });
        return;
      }
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
          dinner_deadline: dinnerDeadline,
          breakfast_meal_start: breakfastMealStart,
          lunch_meal_start: lunchMealStart,
          dinner_meal_start: dinnerMealStart
        }
      }
    }).then(res => {
      wx.hideLoading();
      this.setData({ loading: false });

      if (res.result.success) {
        wx.showToast({ title: '保存成功', icon: 'success' });
      } else {
        wx.showToast({ title: res.result.error || '保存失败', icon: 'none', duration: 2000 });
      }
    }).catch(err => {
      wx.hideLoading();
      this.setData({ loading: false });
      console.error('保存设置失败', err);

      let errorMsg = '保存失败';
      if (err.errCode === -1) errorMsg = '网络错误，请检查网络连接';
      else if (err.errMsg) errorMsg = err.errMsg;

      wx.showToast({ title: errorMsg, icon: 'none', duration: 2000 });
    });
  }
});