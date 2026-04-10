const auth = require('../../utils/auth.js');
const initUtil = require('../../utils/initUtil.js');
const db = wx.cloud.database();
const _ = db.command;

Page({
  data: {
    orderList: [],
    loading: true,
    deadlines: {
      breakfast: '08:00',
      lunch: '12:00',
      dinner: '17:00',
      breakfastMealStart: '08:00',
      lunchMealStart: '12:00',
      dinnerMealStart: '17:30'
    }
  },

  onLoad() {
    this.initPage();
  },

  async onShow() {
    if (auth.isInitializing()) {
      await initUtil.waitForAppInit();
    }
    auth.checkPageAccess('tabbar');
    await this.loadDeadlines();
    this.loadOrders();
  },

  async initPage() {
    await initUtil.waitForAppInit();
    await this.loadDeadlines();
    this.loadOrders();
  },

  loadDeadlines() {
    return wx.cloud.callFunction({
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

  getMealEndTime(mealType) {
    const deadlines = this.data.deadlines;
    const map = {
      '早餐': deadlines.breakfastMealStart || '08:00',
      '午餐': deadlines.lunchMealStart || '12:00',
      '晚餐': deadlines.dinnerMealStart || '17:30'
    };
    return map[mealType] || '12:00';
  },

  getDeadlineTime(mealType) {
    const deadlines = this.data.deadlines;
    const map = {
      '早餐': deadlines.breakfast || '08:00',
      '午餐': deadlines.lunch || '12:00',
      '晚餐': deadlines.dinner || '17:00'
    };
    return map[mealType];
  },

  calculateStatus(order) {
    if (order.status === 'cancelled') return 'cancelled';
    if (order.status === 'completed') return 'completed';

    const now = new Date();
    const orderDate = new Date(order.date);
    const mealEnd = this.getMealEndTime(order.mealType);

    if (!mealEnd) return order.status;

    const [eh, em] = mealEnd.split(':').map(Number);
    const mealEndTime = new Date(orderDate);
    mealEndTime.setHours(eh, em, 0, 0);

    if (now > mealEndTime) return 'completed';
    return 'pending';
  },

  getOrderActionInfo(order) {
    if (order.status === 'cancelled' || order.status === 'completed') {
      return {
        canCancel: false,
        cancelReason: null,
        showEvaluate: order.status === 'completed'
      };
    }

    const now = new Date();
    const orderDate = new Date(order.date);
    const deadline = this.getDeadlineTime(order.mealType);
    const mealEnd = this.getMealEndTime(order.mealType);

    if (!deadline) return { canCancel: false, cancelReason: null, showEvaluate: false };

    const [dh, dm] = deadline.split(':').map(Number);
    const deadlineTime = new Date(orderDate);
    deadlineTime.setHours(dh, dm, 0, 0);

    const [eh, em] = mealEnd.split(':').map(Number);
    const mealEndTime = new Date(orderDate);
    mealEndTime.setHours(eh, em, 0, 0);

    if (now > mealEndTime) {
      return {
        canCancel: false,
        cancelReason: null,
        showEvaluate: true
      };
    }

    if (now > deadlineTime) {
      return {
        canCancel: false,
        cancelReason: `已过${order.mealType}订餐截止时间（${deadline}），无法取消预约`,
        showEvaluate: false
      };
    }

    return {
      canCancel: true,
      cancelReason: null,
      showEvaluate: false
    };
  },

  async loadOrders() {
    const app = getApp();
    const phone = app.globalData.phone;
    
    if (!phone) {
      this.setData({ loading: false });
      return;
    }

    try {
      const ordersRes = await db.collection('orders')
        .where({
          phone: phone
        })
        .orderBy('createTime', 'desc')
        .get();

      const orderIds = ordersRes.data.map(o => o._id);
      
      let evaluations = [];
      if (orderIds.length > 0) {
        const evalRes = await db.collection('evaluations')
          .where({
            orderId: _.in(orderIds),
            phone: phone
          })
          .get();
        evaluations = evalRes.data;
      }

      const evalMap = {};
      evaluations.forEach(e => {
        if (!evalMap[e.orderId]) {
          evalMap[e.orderId] = {};
        }
        evalMap[e.orderId][e.dishName] = {
          rating: e.rating,
          comment: e.comment
        };
      });

      const ordersWithStatus = ordersRes.data.map(order => {
        const actionInfo = this.getOrderActionInfo(order);
        const orderEvals = evalMap[order._id] || {};
        
        const dishesWithEval = order.dishes.map(dish => ({
          ...dish,
          evaluated: !!orderEvals[dish.name]
        }));

        const evaluatedCount = dishesWithEval.filter(d => d.evaluated).length;
        const allEvaluated = evaluatedCount === dishesWithEval.length;
        const hasEvaluation = evaluatedCount > 0;

        return {
          ...order,
          dishes: dishesWithEval,
          displayStatus: this.calculateStatus(order),
          canCancel: actionInfo.canCancel,
          cancelReason: actionInfo.cancelReason,
          showEvaluate: actionInfo.showEvaluate,
          allEvaluated,
          hasEvaluation
        };
      });

      this.setData({
        orderList: ordersWithStatus,
        loading: false
      });
    } catch (err) {
      console.error('加载订单失败', err);
      this.setData({ loading: false });
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },

  goToEvaluate(e) {
    const orderId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/evaluate/evaluate?orderId=${orderId}`
    });
  },

  viewEvaluation(e) {
    const orderId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/evaluate/evaluate?orderId=${orderId}&mode=view`
    });
  },

  cancelOrder(e) {
    const orderId = e.currentTarget.dataset.id;
    const app = getApp();

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
              orderId: orderId,
              phone: app.globalData.phone || ''
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

  async onPullDownRefresh() {
    await this.loadDeadlines();
    this.loadOrders();
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 1000);
  }
});
