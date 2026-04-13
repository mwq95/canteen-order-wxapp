/*
 * 历史订单页面 - 查看历史订餐记录
 */

const auth = require('../../utils/auth.js');
const initUtil = require('../../utils/initUtil.js');
const db = wx.cloud.database();
const _ = db.command;

const PAGE_SIZE = 15;

Page({
  data: {
    // 订单列表
    orderList: [],
    // 加载状态
    loading: true,
    // 加载更多状态
    loadingMore: false,
    // 当前页码
    page: 1,
    // 总数
    total: 0,
    // 是否有更多数据
    hasMore: true,
    // 截止时间配置
    deadlines: {
      breakfast: '08:00',
      lunch: '12:00',
      dinner: '17:00',
      // 早餐开餐时间
      breakfastMealStart: '08:00',
      // 午餐开餐时间
      lunchMealStart: '12:00',
      // 晚餐开餐时间
      dinnerMealStart: '17:30'
    }
  },

  // 页面加载时调用
  onLoad() {
    this.initPage();
  },

  // 页面显示时调用
  async onShow() {
    if (auth.isInitializing()) {
      await initUtil.waitForAppInit();
    }
    auth.checkPageAccess('tabbar');
    await this.loadDeadlines();
    this.loadOrders(true);
  },

  // 初始化页面
  async initPage() {
    await initUtil.waitForAppInit();
    await this.loadDeadlines();
    this.loadOrders(true);
  },

  // 加载截止时间配置
  loadDeadlines() {
    return wx.cloud.callFunction({
      name: 'configFunctions',
      data: { type: 'getDeadlineConfig' }
    }).then(res => {
      if (res.result && res.result.success && res.result.data) {
        this.setData({ deadlines: res.result.data });
      }
    }).catch(err => {
      console.error('加载截止时间失败', err);
    });
  },

  // 获取用餐结束时间
  getMealEndTime(mealType) {
    const deadlines = this.data.deadlines;
    const map = {
      '早餐': deadlines.breakfastMealStart || '08:00',
      '午餐': deadlines.lunchMealStart || '12:00',
      '晚餐': deadlines.dinnerMealStart || '17:30'
    };
    return map[mealType] || '12:00';
  },

  // 获取截止时间
  getDeadlineTime(mealType) {
    const deadlines = this.data.deadlines;
    const map = {
      '早餐': deadlines.breakfast || '08:00',
      '午餐': deadlines.lunch || '12:00',
      '晚餐': deadlines.dinner || '17:00'
    };
    return map[mealType];
  },

  // 计算订单状态
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

  // 获取订单操作信息
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

  // 处理订单数据
  processOrders(orders, evalMap) {
    orders.forEach(order => {
      const dishesWithEval = order.dishes.map(dish => ({
        ...dish,
        evaluated: !!(evalMap[order._id] && evalMap[order._id][dish.name])
      }));

      const evaluatedCount = dishesWithEval.filter(d => d.evaluated).length;
      const allEvaluated = evaluatedCount === dishesWithEval.length;
      const hasEvaluation = evaluatedCount > 0;

      order.dishes = dishesWithEval;
      order.displayStatus = this.calculateStatus(order);
      const actionInfo = this.getOrderActionInfo(order);
      order.canCancel = actionInfo.canCancel;
      order.cancelReason = actionInfo.cancelReason;
      order.showEvaluate = actionInfo.showEvaluate;
      order.allEvaluated = allEvaluated;
      order.hasEvaluation = hasEvaluation;
    });

    return orders;
  },

  // 加载订单数据
  async loadOrders(isRefresh = false) {
    const app = getApp();
    const openid = app.globalData.openid;
    const evalMap = {};
    
    if (!openid) {
      this.setData({ loading: false });
      return;
    }

    const page = isRefresh ? 1 : this.data.page;
    const isLoadingMore = !isRefresh;

    if (isLoadingMore) {
      if (this.data.loadingMore || !this.data.hasMore) return;
      this.setData({ loadingMore: true });
    } else {
      this.setData({ loading: true });
    }

    try {
      let ordersRes, total;

      if (isRefresh) {
        total = await db.collection('orders')
          .where({ _openid: openid })
          .count();

        ordersRes = await db.collection('orders')
          .where({ _openid: openid })
          .orderBy('createTime', 'desc')
          .skip(0)
          .limit(PAGE_SIZE)
          .get();
      } else {
        ordersRes = await db.collection('orders')
          .where({ _openid: openid })
          .orderBy('createTime', 'desc')
          .skip((page - 1) * PAGE_SIZE)
          .limit(PAGE_SIZE)
          .get();
        total = this.data.total;
      }

      const orderIds = ordersRes.data.map(o => o._id);
      
      if (orderIds.length > 0) {
        const evalRes = await db.collection('evaluations')
          .where({
            orderId: _.in(orderIds),
            _openid: openid
          })
          .get();
        
        evalRes.data.forEach(e => {
          if (!evalMap[e.orderId]) {
            evalMap[e.orderId] = {};
          }
          evalMap[e.orderId][e.dishName] = {
            rating: e.rating,
            comment: e.comment
          };
        });
      }

      const processedOrders = this.processOrders(ordersRes.data, evalMap);
      const hasMore = ordersRes.data.length === PAGE_SIZE;

      if (isLoadingMore) {
        this.setData({
          orderList: [...this.data.orderList, ...processedOrders],
          page: page + 1,
          hasMore,
          loadingMore: false
        });
      } else {
        this.setData({
          orderList: processedOrders,
          page: 2,
          total: total.total,
          hasMore,
          loading: false
        });
      }
    } catch (err) {
      console.error('加载订单失败', err);
      this.setData({ 
        loading: false, 
        loadingMore: false 
      });
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },

  // 跳转到评价页面
  goToEvaluate(e) {
    const orderId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/evaluate/evaluate?orderId=${orderId}`
    });
  },

  // 查看评价
  viewEvaluation(e) {
    const orderId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/evaluate/evaluate?orderId=${orderId}&mode=view`
    });
  },

  // 取消订单
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
            name: 'orderFunctions',
            data: {
              type: 'cancelOrder',
              // 订单ID
              orderId: orderId,
              openid: app.globalData.openid || ''
            }
          }).then(res => {
            wx.hideLoading();

            if (res.result.success) {
              wx.showToast({
                title: '已取消预约',
                icon: 'success'
              });
              this.loadOrders(true);
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

  // 上拉触底时调用
  onReachBottom() {
    if (this.data.hasMore && !this.data.loadingMore) {
      this.loadOrders(false);
    }
  },

  // 下拉刷新时调用
  async onPullDownRefresh() {
    await this.loadDeadlines();
    this.loadOrders(true);
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 1000);
  }
});
