const auth = require('../../utils/auth.js');

Page({
  data: {
    orderList: [],
    loading: true
  },

  onLoad() {
    this.loadOrders();
  },

  onShow() {
    auth.checkPageAccess('tabbar');
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
    
    if (order.status === 'cancelled') {
      return 'cancelled';
    }
    
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

  canCancel(order) {
    if (order.status === 'cancelled' || order.status === 'completed') {
      return false;
    }
    const now = new Date();
    const orderDate = new Date(order.date);
    const deadlineMap = {
      '早餐': '09:00',
      '午餐': '13:00',
      '晚餐': '19:00'
    };
    const deadline = deadlineMap[order.mealType];
    if (!deadline) return false;
    const [deadlineHour, deadlineMinute] = deadline.split(':').map(Number);
    const deadlineTime = new Date(orderDate);
    deadlineTime.setHours(deadlineHour, deadlineMinute, 0, 0);
    return now < deadlineTime;
  },

  loadOrders() {
    const app = getApp();
    const db = wx.cloud.database();
    db.collection('orders')
      .where({
        _openid: app.globalData.openid
      })
      .orderBy('createTime', 'desc')
      .get()
      .then(res => {
        const ordersWithStatus = res.data.map(order => ({
          ...order,
          displayStatus: this.calculateStatus(order),
          canCancel: this.canCancel(order)
        }));
        this.setData({
          orderList: ordersWithStatus,
          loading: false
        });
      })
      .catch(err => {
        console.error('加载订单失败', err);
        this.setData({ loading: false });
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        });
      });
  },

  goToEvaluate(e) {
    const orderId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/evaluate/evaluate?orderId=${orderId}`
    });
  },

  cancelOrder(e) {
    const orderId = e.currentTarget.dataset.id;
    wx.showModal({
      title: '提示',
      content: '确定要取消预约吗？',
      success: res => {
        if (res.confirm) {
          const app = getApp();
          const db = wx.cloud.database();
          db.collection('orders').where({
            _id: orderId,
            _openid: app.globalData.openid
          }).update({
            data: {
              status: 'cancelled',
              updateTime: new Date()
            }
          }).then(() => {
            wx.showToast({
              title: '已取消预约',
              icon: 'success'
            });
            this.loadOrders();
          }).catch(err => {
            wx.showToast({
              title: '取消失败',
              icon: 'none'
            });
          });
        }
      }
    });
  },

  onPullDownRefresh() {
    this.loadOrders();
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 1000);
  }
});