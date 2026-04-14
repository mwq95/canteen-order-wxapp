/*
 * 提醒设置页面 - 用户配置消息提醒
 */

const app = getApp();
const config = require('../../config.js');

Page({
  data: {
    orderReminder: false,
    mealReminder: false
  },

  onLoad() {
    this.loadSettings();
  },

  loadSettings() {
    const db = wx.cloud.database();
    db.collection('users').where({
      _openid: app.globalData.openid
    }).get().then(res => {
      if (res.data.length > 0) {
        const user = res.data[0];
        this.setData({
          orderReminder: user.subscribeOrderReminder === true,
          mealReminder: user.subscribeMealReminder === true
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
    const templateId = type === 'order'
      ? config.getOrderReminderTemplateId()
      : config.getMealReminderTemplateId();

    if (!templateId) {
      wx.showToast({ title: '模板ID未配置', icon: 'none' });
      if (type === 'order') {
        this.setData({ orderReminder: false });
      } else {
        this.setData({ mealReminder: false });
      }
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
      _openid: app.globalData.openid
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
    }).catch(err => {
      console.error('保存提醒设置失败', err);
      wx.showToast({ title: '保存失败', icon: 'none' });
    });
  }
});
