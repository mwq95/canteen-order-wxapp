/*
 * 订单统计页面 - 查看个人订餐统计
 */

const app = getApp();

Page({
  data: {
    thirtyDayRange: '',
    thirtyDayMealCount: 0,
    thirtyDayOrderCount: 0,
    totalMealCount: 0,
    totalOrderCount: 0,
    deadlines: null
  },

  onLoad() {
    this.setDateRanges();
    this.loadDeadlines().then(() => {
      this.loadStats();
    });
  },

  setDateRanges() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const formatDate = (d) => {
      return `${d.getMonth() + 1}/${d.getDate()}`;
    };

    this.setData({
      thirtyDayRange: `${formatDate(thirtyDaysAgo)} ~ ${formatDate(now)}`
    });
  },

  loadDeadlines() {
    return wx.cloud.callFunction({
      name: 'configFunctions',
      data: { type: 'getDeadlineConfig' }
    }).then(res => {
      if (res && res.result && res.result.success && res.result.data) {
        this.setData({ deadlines: res.result.data });
      }
    }).catch(err => {
      console.error('加载截止时间失败', err);
    });
  },

  getMealEndTime(mealType) {
    const deadlines = this.data.deadlines;
    const map = {
      '早餐': deadlines?.breakfastMealStart || '08:00',
      '午餐': deadlines?.lunchMealStart || '12:00',
      '晚餐': deadlines?.dinnerMealStart || '17:30'
    };
    return map[mealType] || '12:00';
  },

  async loadStats() {
    const db = wx.cloud.database();
    const phone = app.globalData.phone || app.globalData.openid;
    const currentTime = new Date();
    const thirtyDaysAgo = new Date(currentTime);
    thirtyDaysAgo.setDate(currentTime.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const res = await db.collection('orders')
      .where({
        phone: phone,
        status: db.command.neq('cancelled')
      })
      .get();

    let thirtyDayMealCount = 0;
    let thirtyDayOrderCount = 0;
    let totalMealCount = 0;
    let totalOrderCount = 0;

    res.data.forEach(order => {
      const orderDate = new Date(order.date);
      const mealEnd = this.getMealEndTime(order.mealType);
      const [eh, em] = mealEnd.split(':').map(Number);
      const mealEndTime = new Date(orderDate);
      mealEndTime.setHours(eh, em, 0, 0);

      totalOrderCount++;
      if (currentTime > mealEndTime) {
        totalMealCount++;
      }

      if (orderDate >= thirtyDaysAgo) {
        thirtyDayOrderCount++;
        if (currentTime > mealEndTime) {
          thirtyDayMealCount++;
        }
      }
    });

    this.setData({
      thirtyDayMealCount,
      thirtyDayOrderCount,
      totalMealCount,
      totalOrderCount
    });
  },

  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
});
