const dateUtil = require('../../utils/dateUtil.js');

Page({
  data: {
    currentDate: '',
    currentDateStr: '',
    menuData: null,
    loading: true,
    showInitButton: false
  },

  onLoad() {
    this.initDate();
    this.loadMenu();
  },

  onShow() {
    this.loadMenu();
  },

  initDate() {
    const now = new Date();
    this.setData({
      currentDate: dateUtil.formatDate(now),
      currentDateStr: dateUtil.formatDateChinese(now)
    });
  },

  loadMenu() {
    const db = wx.cloud.database();
    const date = this.data.currentDate;
    
    db.collection('menus').where({ date }).get().then(res => {
      this.setData({
        menuData: res.data[0] || null,
        loading: false,
        showInitButton: false
      });
    }).catch(err => {
      console.error('加载菜单失败', err);
      this.setData({ 
        loading: false,
        showInitButton: true 
      });
    });
  },

  prevDay() {
    const current = dateUtil.prevDay(this.data.currentDate);
    this.setData({
      currentDate: dateUtil.formatDate(current),
      currentDateStr: dateUtil.formatDateChinese(current),
      loading: true
    });
    this.loadMenu();
  },

  nextDay() {
    const current = dateUtil.nextDay(this.data.currentDate);
    this.setData({
      currentDate: dateUtil.formatDate(current),
      currentDateStr: dateUtil.formatDateChinese(current),
      loading: true
    });
    this.loadMenu();
  },

  initDatabase() {
    wx.showLoading({ title: '初始化中...' });
    wx.cloud.callFunction({
      name: 'quickstartFunctions',
      data: {
        type: 'createCanteenCollections'
      }
    }).then(res => {
      wx.hideLoading();
      if (res.result.success) {
        wx.showToast({
          title: '初始化成功',
          icon: 'success'
        });
        this.setData({ showInitButton: false });
        this.loadMenus();
      }
    }).catch(err => {
      wx.hideLoading();
      wx.showToast({
        title: '请先上传云函数',
        icon: 'none'
      });
    });
  },

  goToOrder() {
    wx.switchTab({
      url: '/pages/order/order'
    });
  },

  onPullDownRefresh() {
    this.loadMenu();
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 1000);
  }
});
