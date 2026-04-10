/*
 * 首页 - 展示每日菜单信息
 */

const dateUtil = require('../../utils/dateUtil.js');
const auth = require('../../utils/auth.js');
const initUtil = require('../../utils/initUtil.js');

Page({
  data: {
    // 当前日期
    currentDate: '',
    // 当前日期中文显示
    currentDateStr: '',
    // 菜单数据
    menuData: null,
    // 加载状态
    loading: true,
    // 是否显示初始化按钮
    showInitButton: false
  },

  // 页面加载时调用
  onLoad() {
    this.initDate();
    this.initPage();
  },

  // 页面显示时调用
  async onShow() {
    if (auth.isInitializing()) {
      await initUtil.waitForAppInit();
    }
    auth.checkPageAccess('tabbar');
    this.loadMenu();
  },

  // 初始化页面
  async initPage() {
    await initUtil.waitForAppInit();
    this.loadMenu();
  },

  // 初始化日期
  initDate() {
    const now = new Date();
    this.setData({
      currentDate: dateUtil.formatDate(now),
      currentDateStr: dateUtil.formatDateChinese(now)
    });
  },

  // 加载菜单数据
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

  // 切换到前一天
  prevDay() {
    const current = dateUtil.prevDay(this.data.currentDate);
    this.setData({
      currentDate: dateUtil.formatDate(current),
      currentDateStr: dateUtil.formatDateChinese(current),
      loading: true
    });
    this.loadMenu();
  },

  // 切换到后一天
  nextDay() {
    const current = dateUtil.nextDay(this.data.currentDate);
    this.setData({
      currentDate: dateUtil.formatDate(current),
      currentDateStr: dateUtil.formatDateChinese(current),
      loading: true
    });
    this.loadMenu();
  },

  // 初始化数据库
  initDatabase() {
    wx.showLoading({ title: '初始化中...' });
    wx.cloud.callFunction({
      name: 'menuFunctions',
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
        this.loadMenu();
      }
    }).catch(err => {
      wx.hideLoading();
      wx.showToast({
        title: '请先上传云函数',
        icon: 'none'
      });
    });
  },

  // 跳转到订餐页面
  goToOrder() {
    wx.switchTab({
      url: '/pages/order/order'
    });
  },

  // 下拉刷新时调用
  onPullDownRefresh() {
    this.loadMenu();
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 1000);
  }
});
