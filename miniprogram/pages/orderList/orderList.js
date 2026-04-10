/*
 * 订单列表页面 - 管理员查看所有订单
 */

const dateUtil = require('../../utils/dateUtil.js');

Page({
  data: {
    // 选中的日期
    selectedDate: '',
    // 选中日期的中文显示
    selectedDateStr: '',
    // 是否显示详情
    showDetail: false,
    // 选中的餐次类型
    selectedMealType: '',
    // 餐次统计
    mealStats: {
      '早餐': { dishes: [], orders: [] },
      '午餐': { dishes: [], orders: [] },
      '晚餐': { dishes: [], orders: [] }
    },
    loading: true
  },

  // 页面加载时调用
  onLoad() {
    this.initDate();
    this.loadOrders();
  },

  // 初始化日期
  initDate() {
    const now = new Date();
    this.setData({
      selectedDate: dateUtil.formatDate(now),
      selectedDateStr: dateUtil.formatDateChinese(now)
    });
  },

  // 切换到前一天
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

  // 切换到后一天
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

  // 加载订单数据
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

  // 显示餐次详情
  showMealDetail(e) {
    const { mealType } = e.currentTarget.dataset;
    this.setData({
      showDetail: true,
      selectedMealType: mealType
    });
  },

  // 返回统计页面
  backToStats() {
    this.setData({
      showDetail: false
    });
  }
});
