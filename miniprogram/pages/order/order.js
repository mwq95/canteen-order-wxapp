const config = require('../../config.js');

const app = getApp();

Page({
  data: {
    selectedDate: '',
    selectedDateStr: '',
    menuData: null,
    selectedDishes: {
      '早餐': [],
      '午餐': [],
      '晚餐': []
    },
    existingOrders: {
      '早餐': null,
      '午餐': null,
      '晚餐': null
    },
    loading: true,
    breakfastDeadline: '08:00',
    lunchDeadline: '12:00',
    dinnerDeadline: '17:00',
    disabledMeals: {
      '早餐': false,
      '午餐': false,
      '晚餐': false
    }
  },

  onLoad() {
    this.initDate();
    this.loadSettings();
    this.waitForOpenid();
  },

  onShow() {
    if (app.globalData.openid) {
      this.loadMenu();
    }
  },

  waitForOpenid() {
    if (app.globalData.openid) {
      this.loadMenu();
    } else {
      setTimeout(() => {
        this.waitForOpenid();
      }, 100);
    }
  },

  initDate() {
    const now = new Date();
    this.setData({
      selectedDate: this.formatDate(now),
      selectedDateStr: this.formatDateChinese(now)
    });
  },

  loadSettings() {
    const db = wx.cloud.database();
    db.collection('configs').where({ key: 'order_deadline' }).get().then(res => {
      if (res.data.length > 0) {
        const cfg = res.data[0];
        this.setData({
          breakfastDeadline: cfg.breakfast_deadline || '08:00',
          lunchDeadline: cfg.lunch_deadline || '12:00',
          dinnerDeadline: cfg.dinner_deadline || '17:00'
        });
        this.checkDisabledMeals();
      }
    }).catch(err => {
      console.error('加载设置失败', err);
    });
  },

  checkDisabledMeals() {
    const now = new Date();
    const selectedDateStr = this.data.selectedDate;
    const todayStr = this.formatDate(now);
    const yesterdayStr = this.formatDate(new Date(now.getTime() - 24 * 60 * 60 * 1000));
    
    const disabledMeals = {
      '早餐': false,
      '午餐': false,
      '晚餐': false
    };
    
    if (selectedDateStr < todayStr) {
      disabledMeals['早餐'] = true;
      disabledMeals['午餐'] = true;
      disabledMeals['晚餐'] = true;
    } else if (selectedDateStr === yesterdayStr) {
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      if (currentTime >= this.data.breakfastDeadline) {
        disabledMeals['早餐'] = true;
      }
      if (currentTime >= this.data.lunchDeadline) {
        disabledMeals['午餐'] = true;
      }
      if (currentTime >= this.data.dinnerDeadline) {
        disabledMeals['晚餐'] = true;
      }
    } else if (selectedDateStr === todayStr) {
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      if (currentTime >= this.data.breakfastDeadline) {
        disabledMeals['早餐'] = true;
      }
      if (currentTime >= this.data.lunchDeadline) {
        disabledMeals['午餐'] = true;
      }
      if (currentTime >= this.data.dinnerDeadline) {
        disabledMeals['晚餐'] = true;
      }
    }
    
    this.setData({ disabledMeals });
  },

  loadMenu() {
    const db = wx.cloud.database();
    const date = this.data.selectedDate;
    const openid = app.globalData.openid;
    
    if (!openid) {
      this.setData({ loading: false });
      return;
    }
    
    this.checkDisabledMeals();
    
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
        const existingOrders = { '早餐': null, '午餐': null, '晚餐': null };
        const selectedDishes = { '早餐': [], '午餐': [], '晚餐': [] };
        
        orderResults.forEach((orderRes, index) => {
          const mealType = mealTypes[index];
          const validOrders = orderRes.data.filter(o => o.status !== 'cancelled');
          const cancelledOrders = orderRes.data.filter(o => o.status === 'cancelled');
          
          if (validOrders.length > 0) {
            existingOrders[mealType] = validOrders[0];
            selectedDishes[mealType] = validOrders[0].dishes.map(d => d.name);
          } else if (cancelledOrders.length > 0) {
            existingOrders[mealType] = cancelledOrders[0];
          }
        });
        
        this.setData({
          menuData,
          existingOrders,
          selectedDishes,
          loading: false
        });
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

  prevDay() {
    const current = new Date(this.data.selectedDate);
    current.setDate(current.getDate() - 1);
    this.setData({
      selectedDate: this.formatDate(current),
      selectedDateStr: this.formatDateChinese(current),
      loading: true
    });
    this.loadMenu();
  },

  nextDay() {
    const current = new Date(this.data.selectedDate);
    current.setDate(current.getDate() + 1);
    this.setData({
      selectedDate: this.formatDate(current),
      selectedDateStr: this.formatDateChinese(current),
      loading: true
    });
    this.loadMenu();
  },

  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  formatDateChinese(date) {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const d = this.formatDate(date);
    const t = this.formatDate(today);
    const tm = this.formatDate(tomorrow);
    const y = this.formatDate(yesterday);
    
    if (d === t) return `今天 ${month}月${day}日`;
    if (d === tm) return `明天 ${month}月${day}日`;
    if (d === y) return `昨天 ${month}月${day}日`;
    return `${month}月${day}日`;
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
    
    const selectedDishes = { ...this.data.selectedDishes };
    const dishes = [...selectedDishes[mealType]];
    const index = dishes.indexOf(dishName);
    
    if (index > -1) {
      dishes.splice(index, 1);
    } else {
      dishes.push(dishName);
    }
    
    selectedDishes[mealType] = dishes;
    this.setData({ selectedDishes });
  },

  submitOrder(e) {
    const mealType = e.currentTarget.dataset.mealType;
    const dishes = this.data.selectedDishes[mealType];
    
    if (dishes.length === 0) {
      wx.showToast({
        title: `请选择${mealType}菜品`,
        icon: 'none'
      });
      return;
    }

    const templateId = config.getSubscribeMessageTemplateId();
    if (templateId && templateId !== '您的订阅消息模板ID') {
      this.requestSubscribeMessageAndSubmit(mealType, dishes);
    } else {
      this.doSubmitOrder(mealType, dishes);
    }
  },

  requestSubscribeMessageAndSubmit(mealType, dishes) {
    const templateId = config.getSubscribeMessageTemplateId();
    wx.requestSubscribeMessage({
      tmplIds: [templateId],
      success: (res) => {
        console.log('订阅消息授权', res);
        this.doSubmitOrder(mealType, dishes, true);
      },
      fail: (err) => {
        console.log('订阅消息授权失败', err);
        this.doSubmitOrder(mealType, dishes, false);
      }
    });
  },

  doSubmitOrder(mealType, dishes, hasSubscribed = false) {
    wx.showLoading({ title: '提交中...' });

    const db = wx.cloud.database();
    const orderData = {
      date: this.data.selectedDate,
      mealType,
      dishes: dishes.map(name => ({ name })),
      status: 'pending',
      createTime: new Date(),
      updateTime: new Date()
    };

    const existingOrder = this.data.existingOrders[mealType];
    const submitPromise = existingOrder 
      ? db.collection('orders').doc(existingOrder._id).update({
          data: {
            ...orderData,
            updateTime: new Date()
          }
        })
      : db.collection('orders').add({ data: orderData });

    submitPromise.then(() => {
      wx.hideLoading();
      wx.showToast({
        title: existingOrder ? `${mealType}已更新` : `${mealType}订餐成功`,
        icon: 'success'
      });
      
      if (hasSubscribed && !existingOrder) {
        this.sendSubscribeMessage(mealType, dishes);
      }
      
      this.loadMenu();
    }).catch(err => {
      wx.hideLoading();
      wx.showToast({
        title: '提交失败',
        icon: 'none'
      });
    });
  },

  sendSubscribeMessage(mealType, dishes) {
    const templateId = config.getSubscribeMessageTemplateId();
    const dishNames = dishes.join('、');
    
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
  },

  onPullDownRefresh() {
    this.loadSettings();
    this.loadMenu();
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 1000);
  }
});