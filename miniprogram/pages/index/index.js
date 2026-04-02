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
      currentDate: this.formatDate(now),
      currentDateStr: this.formatDateChinese(now)
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
    const current = new Date(this.data.currentDate);
    current.setDate(current.getDate() - 1);
    this.setData({
      currentDate: this.formatDate(current),
      currentDateStr: this.formatDateChinese(current),
      loading: true
    });
    this.loadMenu();
  },

  nextDay() {
    const current = new Date(this.data.currentDate);
    current.setDate(current.getDate() + 1);
    this.setData({
      currentDate: this.formatDate(current),
      currentDateStr: this.formatDateChinese(current),
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

  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  formatDateChinese(date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const d = this.formatDate(date);
    const t = this.formatDate(today);
    const tm = this.formatDate(tomorrow);
    const y = this.formatDate(yesterday);
    
    if (d === t) return '今天';
    if (d === tm) return '明天';
    if (d === y) return '昨天';
    return `${year}年${month}月${day}日`;
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