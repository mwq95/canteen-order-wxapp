Page({
  data: {
    selectedDate: '',
    orderList: [],
    loading: true
  },

  onLoad() {
    this.initDate();
    this.loadOrders();
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
    this.loadOrders();
  },

  calculateStatus(order) {
    const now = new Date();
    const orderDate = new Date(order.date);
    const deadlineMap = {
      '早餐': '09:00',
      '午餐': '13:00',
      '晚餐': '19:00'
    };
    
    if (order.status === 'completed') {
      return 'completed';
    }
    
    const deadline = deadlineMap[order.mealType];
    if (!deadline) return order.status;
    
    const [deadlineHour, deadlineMinute] = deadline.split(':').map(Number);
    const deadlineTime = new Date(orderDate);
    deadlineTime.setHours(deadlineHour, deadlineMinute, 0, 0);
    
    if (now > deadlineTime) {
      return 'completed';
    }
    return 'pending';
  },

  loadOrders() {
    const db = wx.cloud.database();
    const date = this.data.selectedDate;
    
    db.collection('orders').where({ 
      date,
      status: db.command.neq('cancelled')
    }).get().then(res => {
      const ordersWithStatus = res.data.map(order => ({
        ...order,
        displayStatus: this.calculateStatus(order)
      }));
      this.setData({
        orderList: ordersWithStatus,
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
  }
});