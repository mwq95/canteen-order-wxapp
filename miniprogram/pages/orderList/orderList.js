const dateUtil = require('../../utils/dateUtil.js');

Page({
  data: {
    selectedDate: '',
    selectedDateStr: '',
    showDetail: false,
    selectedMealType: '',
    mealStats: {
      '早餐': { dishes: [], orders: [] },
      '午餐': { dishes: [], orders: [] },
      '晚餐': { dishes: [], orders: [] }
    },
    loading: true
  },

  onLoad() {
    this.initDate();
    this.loadOrders();
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
      loading: true,
      showDetail: false
    });
    this.loadOrders();
  },

  nextDay() {
    const current = dateUtil.nextDay(this.data.selectedDate);
    this.setData({
      selectedDate: dateUtil.formatDate(current),
      selectedDateStr: dateUtil.formatDateChinese(current),
      loading: true,
      showDetail: false
    });
    this.loadOrders();
  },

  loadOrders() {
    const db = wx.cloud.database();
    const date = this.data.selectedDate;
    
    db.collection('orders').where({ 
      date,
      status: db.command.neq('cancelled')
    }).get().then(res => {
      const mealStats = {
        '早餐': { dishes: [], orders: [] },
        '午餐': { dishes: [], orders: [] },
        '晚餐': { dishes: [], orders: [] }
      };
      
      const dishCounts = {
        '早餐': {},
        '午餐': {},
        '晚餐': {}
      };
      
      res.data.forEach(order => {
        const mealType = order.mealType;
        
        mealStats[mealType].orders.push(order);
        
        order.dishes.forEach(dish => {
          if (!dishCounts[mealType][dish.name]) {
            dishCounts[mealType][dish.name] = 0;
          }
          dishCounts[mealType][dish.name]++;
        });
      });
      
      for (const mealType in dishCounts) {
        for (const dishName in dishCounts[mealType]) {
          mealStats[mealType].dishes.push({
            name: dishName,
            count: dishCounts[mealType][dishName]
          });
        }
      }
      
      this.setData({
        mealStats,
        loading: false
      });
    }).catch(err => {
      console.error('加载订单失败', err);
      this.setData({ loading: false });
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    });
  },

  showMealDetail(e) {
    const { mealType } = e.currentTarget.dataset;
    this.setData({
      showDetail: true,
      selectedMealType: mealType
    });
  },

  backToStats() {
    this.setData({
      showDetail: false
    });
  }
});
