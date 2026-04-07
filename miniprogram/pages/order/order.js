const config = require('../../config.js');
const dateUtil = require('../../utils/dateUtil.js');
const app = getApp();

Page({
  data: {
    selectedDate: '',
    selectedDateStr: '',
    menuData: null,
    orders: {
      '早餐': { orderId: null, dishes: [], status: 'none' },
      '午餐': { orderId: null, dishes: [], status: 'none' },
      '晚餐': { orderId: null, dishes: [], status: 'none' }
    },
    userSelections: {
      '早餐': [],
      '午餐': [],
      '晚餐': []
    },
    deadlines: {
      breakfast: '08:00',
      lunch: '12:00',
      dinner: '17:00'
    },
    disabledMeals: {
      '早餐': false,
      '午餐': false,
      '晚餐': false
    },
    loading: true
  },

  onLoad() {
    this.initDate();
    this.loadDeadlines();
    this.waitForOpenid();
  },

  onShow() {
    if (app.globalData.openid) {
      this.loadData();
    }
  },

  onPullDownRefresh() {
    this.loadDeadlines();
    this.loadData();
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 1000);
  },

  waitForOpenid() {
    if (app.globalData.openid) {
      this.loadData();
    } else {
      setTimeout(() => {
        this.waitForOpenid();
      }, 100);
    }
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
    this.loadData();
  },

  nextDay() {
    const current = dateUtil.nextDay(this.data.selectedDate);
    this.setData({
      selectedDate: dateUtil.formatDate(current),
      selectedDateStr: dateUtil.formatDateChinese(current),
      loading: true
    });
    this.loadData();
  },

  loadDeadlines() {
    const db = wx.cloud.database();
    db.collection('configs').where({ key: 'order_deadline' }).get().then(res => {
      if (res.data.length > 0) {
        const cfg = res.data[0];
        this.setData({
          deadlines: {
            breakfast: cfg.breakfast_deadline || '08:00',
            lunch: cfg.lunch_deadline || '12:00',
            dinner: cfg.dinner_deadline || '17:00'
          }
        });
      }
    }).catch(err => {
      console.error('加载截止时间失败', err);
    });
  },

  loadData() {
    const db = wx.cloud.database();
    const date = this.data.selectedDate;
    const openid = app.globalData.openid;
    
    if (!openid) {
      this.setData({ loading: false });
      return;
    }

    db.collection('menus').where({ date }).get().then(menuRes => {
      const menuData = menuRes.data[0] || null;
      
      const mealTypes = ['早餐', '午餐', '晚餐'];
      const promises = mealTypes.map(mealType => {
        return db.collection('orders').where({
          date,
          mealType,
          _openid: openid
        }).get();
      });
      
      return Promise.all(promises).then(orderResults => {
        const orders = {
          '早餐': { orderId: null, dishes: [], status: 'none' },
          '午餐': { orderId: null, dishes: [], status: 'none' },
          '晚餐': { orderId: null, dishes: [], status: 'none' }
        };
        const userSelections = {
          '早餐': [],
          '午餐': [],
          '晚餐': []
        };
        
        orderResults.forEach((orderRes, index) => {
          const mealType = mealTypes[index];
          const validOrders = orderRes.data.filter(o => o.status !== 'cancelled');
          
          if (validOrders.length > 0) {
            const order = validOrders[0];
            orders[mealType] = {
              orderId: order._id,
              dishes: order.dishes.map(d => d.name),
              status: 'ordered'
            };
            userSelections[mealType] = order.dishes.map(d => d.name);
          } else {
            orders[mealType] = {
              orderId: null,
              dishes: [],
              status: 'none'
            };
            userSelections[mealType] = [];
          }
        });
        
        this.setData({
          menuData,
          orders,
          userSelections,
          loading: false
        });
        
        this.checkDisabledMeals();
      });
    }).catch(err => {
      console.error('加载数据失败', err);
      this.setData({ loading: false });
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    });
  },

  checkDisabledMeals() {
    const now = new Date();
    const selectedDate = this.data.selectedDate;
    const todayStr = dateUtil.formatDate(now);
    const deadlines = this.data.deadlines;
    
    const disabledMeals = {
      '早餐': false,
      '午餐': false,
      '晚餐': false
    };
    
    if (selectedDate < todayStr) {
      disabledMeals['早餐'] = true;
      disabledMeals['午餐'] = true;
      disabledMeals['晚餐'] = true;
    } else if (selectedDate === todayStr) {
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      if (currentTime >= deadlines.breakfast) {
        disabledMeals['早餐'] = true;
      }
      if (currentTime >= deadlines.lunch) {
        disabledMeals['午餐'] = true;
      }
      if (currentTime >= deadlines.dinner) {
        disabledMeals['晚餐'] = true;
      }
    }
    
    this.setData({ disabledMeals });
  },

  toggleDish(e) {
    const { mealType, dishName } = e.currentTarget.dataset;
    
    if (this.data.disabledMeals[mealType]) {
      wx.showToast({
        title: `${mealType}已过截止时间`,
        icon: 'none'
      });
      return;
    }
    
    const userSelections = { ...this.data.userSelections };
    const selections = [...userSelections[mealType]];
    const index = selections.indexOf(dishName);
    
    if (index > -1) {
      selections.splice(index, 1);
    } else {
      selections.push(dishName);
    }
    
    userSelections[mealType] = selections;
    this.setData({ userSelections });
  },

  isDishSelected(mealType, dishName) {
    const selections = this.data.userSelections[mealType] || [];
    return selections.indexOf(dishName) !== -1;
  },

  submitOrder(e) {
    const { mealType } = e.currentTarget.dataset;
    const selections = this.data.userSelections[mealType];
    
    if (selections.length === 0) {
      wx.showToast({
        title: `请选择${mealType}菜品`,
        icon: 'none'
      });
      return;
    }

    if (this.data.disabledMeals[mealType]) {
      wx.showToast({
        title: `${mealType}已过截止时间`,
        icon: 'none'
      });
      return;
    }

    const templateId = config.getSubscribeMessageTemplateId();
    if (templateId && templateId !== '您的订阅消息模板ID') {
      this.requestSubscribeMessageAndSubmit(mealType, selections);
    } else {
      this.doSubmitOrder(mealType, selections);
    }
  },

  requestSubscribeMessageAndSubmit(mealType, selections) {
    const templateId = config.getSubscribeMessageTemplateId();
    wx.requestSubscribeMessage({
      tmplIds: [templateId],
      success: (res) => {
        console.log('订阅消息授权', res);
        this.doSubmitOrder(mealType, selections, true);
      },
      fail: (err) => {
        console.log('订阅消息授权失败', err);
        this.doSubmitOrder(mealType, selections, false);
      }
    });
  },

  doSubmitOrder(mealType, selections, hasSubscribed = false) {
    wx.showLoading({ title: '提交中...' });

    const db = wx.cloud.database();
    const orderData = {
      date: this.data.selectedDate,
      mealType,
      dishes: selections.map(name => ({ name })),
      status: 'pending',
      createTime: new Date(),
      updateTime: new Date()
    };

    const existingOrder = this.data.orders[mealType];
    const submitPromise = existingOrder.orderId 
      ? db.collection('orders').doc(existingOrder.orderId).update({
          data: {
            ...orderData,
            updateTime: new Date()
          }
        })
      : db.collection('orders').add({ data: orderData });

    submitPromise.then(() => {
      wx.hideLoading();
      wx.showToast({
        title: existingOrder.orderId ? `${mealType}已更新` : `${mealType}订餐成功`,
        icon: 'success'
      });
      
      if (hasSubscribed && !existingOrder.orderId) {
        this.sendSubscribeMessage(mealType, selections);
      }
      
      this.loadData();
    }).catch(err => {
      wx.hideLoading();
      wx.showToast({
        title: '提交失败',
        icon: 'none'
      });
    });
  },

  sendSubscribeMessage(mealType, selections) {
    const templateId = config.getSubscribeMessageTemplateId();
    const dishNames = selections.join('、');
    
    wx.cloud.callFunction({
      name: 'sendSubscribeMessage',
      data: {
        templateId: templateId,
        data: {
          thing1: { value: `${this.data.selectedDate} ${mealType}` },
          thing2: { value: dishNames },
          thing3: { value: '请按时用餐' }
        }
      }
    }).then(res => {
      console.log('订阅消息发送结果', res);
    }).catch(err => {
      console.error('发送订阅消息失败', err);
    });
  }
});
