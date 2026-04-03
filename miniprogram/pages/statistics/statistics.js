Page({
  data: {
    selectedDate: '',
    statistics: null,
    loading: true
  },

  onLoad() {
    this.initDate();
    this.loadStatistics();
  },

  initDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    this.setData({
      selectedDate: `${year}-${month}-${day}`
    });
  },

  onDateChange(e) {
    this.setData({
      selectedDate: e.detail.value,
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