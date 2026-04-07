const dateUtil = require('../../utils/dateUtil.js');

Page({
  data: {
    selectedDate: '',
    selectedDateStr: '',
    statistics: null,
    loading: true
  },

  onLoad() {
    this.initDate();
    this.loadStatistics();
  },

  initDate() {
    const now = new Date();
    this.setData({
      selectedDate: dateUtil.formatDate(now),
      selectedDateStr: dateUtil.formatDateChinese(now)
    });
  },

  prevDay() {
    const current = dateUtil.prevDay(this.data.selectedDate);
    this.setData({
      selectedDate: dateUtil.formatDate(current),
      selectedDateStr: dateUtil.formatDateChinese(current),
      loading: true
    });
    this.loadStatistics();
  },

  nextDay() {
    const current = dateUtil.nextDay(this.data.selectedDate);
    this.setData({
      selectedDate: dateUtil.formatDate(current),
      selectedDateStr: dateUtil.formatDateChinese(current),
      loading: true
    });
    this.loadStatistics();
  },

  loadStatistics() {
    const db = wx.cloud.database();
    const date = this.data.selectedDate;
    
    db.collection('orders').where({ 
      date,
      status: db.command.neq('cancelled')
    }).get().then(res => {
      const orders = res.data;
      const totalOrders = orders.length;
      
      let dishCount = {};
      orders.forEach(order => {
        order.dishes.forEach(dish => {
          const key = `${order.mealType}-${dish.name}`;
          dishCount[key] = (dishCount[key] || 0) + 1;
        });
      });
      
      const dishStats = Object.entries(dishCount).map(([key, count]) => {
        const [mealType, name] = key.split('-');
        return { mealType, name, count };
      }).sort((a, b) => b.count - a.count);
      
      this.setData({
        statistics: {
          totalOrders,
          dishStats
        },
        loading: false
      });
    }).catch(err => {
      console.error('加载统计数据失败', err);
      this.setData({ loading: false });
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    });
  }
});
