const auth = require('../../utils/auth.js');
const initUtil = require('../../utils/initUtil.js');

Page({
  data: {
    orderList: [],
    loading: true,
    deadlines: {
      breakfast: '08:00',
      lunch: '12:00',
      dinner: '17:00'
    }
  },

  onLoad() {
    this.initPage();
  },

  onShow() {
    auth.checkPageAccess('tabbar');
    this.loadOrders();
  },

  async initPage() {
    await initUtil.waitForAppInit();
    this.loadDeadlines();
    this.loadOrders();
  },

  loadDeadlines() {
    wx.cloud.callFunction({
      name: 'quickstartFunctions',
      data: { type: 'getDeadlineConfig' }
    }).then(res => {
      if (res.result && res.result.success && res.result.data) {
        this.setData({ deadlines: res.result.data });
      }
    }).catch(err => {
      console.error('加载截止时间失败', err);
    });
  },

  calculateStatus(order) {
    const now = new Date();
    const orderDate = new Date(order.date);
    const deadlines = this.data.deadlines;
    const deadlineMap = {
      '早餐': deadlines.breakfast || '08:00',
      '午餐': deadlines.lunch || '12:00',
      '晚餐': deadlines.dinner || '17:00'
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
      return { can: false, reason: null };
    }

    const now = new Date();
    const orderDate = new Date(order.date);
    const deadlines = this.data.deadlines;
    const deadlineMap = {
      '早餐': deadlines.breakfast || '08:00',
      '午餐': deadlines.lunch || '12:00',
      '晚餐': deadlines.dinner || '17:00'
    };
    
    const deadline = deadlineMap[order.mealType];
    if (!deadline) return { can: false, reason: '无法获取截止时间' };
    
    const [deadlineHour, deadlineMinute] = deadline.split(':').map(Number);
    const deadlineTime = new Date(orderDate);
    deadlineTime.setHours(deadlineHour, deadlineMinute, 0, 0);

    if (now > deadlineTime) {
      return { 
        can: false, 
        reason: `已过${order.mealType}订餐截止时间（${deadline}），无法取消预约` 
      };
    }
    
    return { can: true, reason: null };
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
        const ordersWithStatus = res.data.map(order => {
          const cancelInfo = this.canCancel(order);
          return {
            ...order,
            displayStatus: this.calculateStatus(order),
            canCancel: cancelInfo.can,
            cancelReason: cancelInfo.reason
          };
        });
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
          wx.showLoading({ title: '处理中...' });

          wx.cloud.callFunction({
            name: 'quickstartFunctions',
            data: {
              type: 'cancelOrder',
              orderId: orderId
            }
          }).then(res => {
            wx.hideLoading();

            if (res.result.success) {
              wx.showToast({
                title: '已取消预约',
                icon: 'success'
              });
              this.loadOrders();
            } else {
              wx.showToast({
                title: res.result.error || '取消失败',
                icon: 'none',
                duration: 2000
              });
            }
          }).catch(err => {
            wx.hideLoading();
            console.error('取消订单失败', err);
            
            let errorMsg = '取消失败';
            if (err.errCode === -1) {
              errorMsg = '网络错误，请检查网络连接';
            } else if (err.errMsg) {
              errorMsg = err.errMsg;
            }
            
            wx.showToast({
              title: errorMsg,
              icon: 'none',
              duration: 2000
            });
          });
        }
      }
    });
  },

  onPullDownRefresh() {
    this.loadDeadlines();
    this.loadOrders();
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 1000);
  }
});