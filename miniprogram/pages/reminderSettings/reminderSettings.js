const app = getApp();
const config = require('../../config.js');

Page({
  data: {
    orderReminder: true,
    mealReminder: true
  },

  onLoad() {
    this.loadSettings();
  },

  loadSettings() {
    const db = wx.cloud.database();
    db.collection('users').where({
      phone: app.globalData.phone || app.globalData.openid
    }).get().then(res => {
      if (res.data.length > 0) {
        const user = res.data[0];
        this.setData({
          orderReminder: user.subscribeOrderReminder !== false,
          mealReminder: user.subscribeMealReminder !== false
        });
      }
    });
  },

  onOrderReminderChange(e) {
    const value = e.detail.value;
    if (value) {
      this.requestSubscribeAndSave('order');
    } else {
      this.saveSetting({ subscribeOrderReminder: false });
    }
    this.setData({ orderReminder: value });
  },

  onMealReminderChange(e) {
    const value = e.detail.value;
    if (value) {
      this.requestSubscribeAndSave('meal');
    } else {
      this.saveSetting({ subscribeMealReminder: false });
    }
    this.setData({ mealReminder: value });
  },

  requestSubscribeAndSave(type) {
    const templateId = config.getSubscribeMessageTemplateId();

    if (!templateId) {
      wx.showToast({ title: '模板ID未配置', icon: 'none' });
      return;
    }

    wx.requestSubscribeMessage({
      tmplIds: [templateId],
      success: (res) => {
        if (res[templateId] === 'accept') {
          if (type === 'order') {
            this.saveSetting({ subscribeOrderReminder: true });
          } else {
            this.saveSetting({ subscribeMealReminder: true });
          }
          wx.showToast({ title: '已开启', icon: 'success' });
        } else {
          if (type === 'order') {
            this.setData({ orderReminder: false });
          } else {
            this.setData({ mealReminder: false });
          }
          wx.showToast({ title: '已拒绝', icon: 'none' });
        }
      },
      fail: () => {
        if (type === 'order') {
          this.setData({ orderReminder: false });
        } else {
          this.setData({ mealReminder: false });
        }
      }
    });
  },

  saveSetting(data) {
    const db = wx.cloud.database();
    db.collection('users').where({
      phone: app.globalData.phone || app.globalData.openid
    }).update({
      data: {
        ...data,
        updateTime: new Date()
      }
    }).then(() => {
      if (data.subscribeOrderReminder !== undefined) {
        app.globalData.subscribeOrderReminder = data.subscribeOrderReminder;
      }
      if (data.subscribeMealReminder !== undefined) {
        app.globalData.subscribeMealReminder = data.subscribeMealReminder;
      }
    });
  }
});
