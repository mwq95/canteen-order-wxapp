Page({
  data: {
    breakfastDeadline: '',
    lunchDeadline: '',
    dinnerDeadline: '',
    configId: null
  },

  onLoad() {
    this.loadConfig();
  },

  loadConfig() {
    const db = wx.cloud.database();
    db.collection('configs').where({ key: 'order_deadline' }).get().then(res => {
      if (res.data.length > 0) {
        const config = res.data[0];
        this.setData({
          breakfastDeadline: config.breakfast_deadline,
          lunchDeadline: config.lunch_deadline,
          dinnerDeadline: config.dinner_deadline,
          configId: config._id
        });
      }
    }).catch(err => {
      console.error('加载设置失败', err);
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

  saveConfig() {
    const db = wx.cloud.database();
    const data = {
      key: 'order_deadline',
      breakfast_deadline: this.data.breakfastDeadline,
      lunch_deadline: this.data.lunchDeadline,
      dinner_deadline: this.data.dinnerDeadline,
      updateTime: new Date()
    };

    wx.showLoading({ title: '保存中...' });

    if (this.data.configId) {
      db.collection('configs').doc(this.data.configId).update({
        data: data
      }).then(() => {
        wx.hideLoading();
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        });
      }).catch(err => {
        wx.hideLoading();
        wx.showToast({
          title: '保存失败',
          icon: 'none'
        });
      });
    } else {
      db.collection('configs').add({
        data: data
      }).then(res => {
        this.setData({ configId: res._id });
        wx.hideLoading();
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        });
      }).catch(err => {
        wx.hideLoading();
        wx.showToast({
          title: '保存失败',
          icon: 'none'
        });
      });
    }
  }
});