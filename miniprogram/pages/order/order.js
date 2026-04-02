const config = require('../../config.js');

Page({
  data: {
    selectedDate: '',
    selectedDateStr: '',
    menuData: null,
    selectedDishes: {},
    totalPrice: 0,
    loading: true,
    existingOrder: null
  },

  onLoad() {
    this.initDate();
    this.loadMenu();
  },

  initDate() {
    const now = new Date();
    this.setData({
      selectedDate: this.formatDate(now),
      selectedDateStr: this.formatDateChinese(now)
    });
  },

  loadMenu() {
    const db = wx.cloud.database();
    const date = this.data.selectedDate;
    
    Promise.all([
      db.collection('menus').where({ date }).get(),
      db.collection('orders').where({ 
        date,
        _openid: '{openid}'
      }).get()
    ]).then(([menuRes, orderRes]) => {
      const menuData = menuRes.data[0] || null;
      const existingOrder = orderRes.data[0] || null;
      
      let selectedDishes = {};
      if (existingOrder) {
        existingOrder.dishes.forEach(dish => {
          selectedDishes[`${dish.mealType}-${dish.name}`] = true;
        });
      }
      
      this.setData({
        menuData,
        existingOrder,
        selectedDishes,
        loading: false
      });
      this.calculateTotal();
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
    const year = date.getFullYear();
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
    
    if (d === t) return '今天';
    if (d === tm) return '明天';
    if (d === y) return '昨天';
    return `${year}年${month}月${day}日`;
  },

  toggleDish(e) {
    const { mealType, dishName, price } = e.currentTarget.dataset;
    const key = `${mealType}-${dishName}`;
    const selectedDishes = { ...this.data.selectedDishes };
    
    if (selectedDishes[key]) {
      delete selectedDishes[key];
    } else {
      selectedDishes[key] = { mealType, dishName, price };
    }
    
    this.setData({ selectedDishes });
    this.calculateTotal();
  },

  calculateTotal() {
    let total = 0;
    Object.values(this.data.selectedDishes).forEach(dish => {
      if (dish.price) {
        total += parseFloat(dish.price);
      }
    });
    this.setData({ totalPrice: total.toFixed(2) });
  },

  submitOrder() {
    const selectedDishes = Object.values(this.data.selectedDishes);
    if (selectedDishes.length === 0) {
      wx.showToast({
        title: '请至少选择一道菜',
        icon: 'none'
      });
      return;
    }

    const templateId = config.getSubscribeMessageTemplateId();
    if (templateId && templateId !== '您的订阅消息模板ID') {
      this.requestSubscribeMessageAndSubmit(selectedDishes);
    } else {
      this.doSubmitOrder(selectedDishes);
    }
  },

  requestSubscribeMessageAndSubmit(selectedDishes) {
    const templateId = config.getSubscribeMessageTemplateId();
    wx.requestSubscribeMessage({
      tmplIds: [templateId],
      success: (res) => {
        console.log('订阅消息授权', res);
        this.doSubmitOrder(selectedDishes, true);
      },
      fail: (err) => {
        console.log('订阅消息授权失败', err);
        this.doSubmitOrder(selectedDishes, false);
      }
    });
  },

  doSubmitOrder(selectedDishes, hasSubscribed = false) {
    wx.showLoading({ title: '提交中...' });

    const db = wx.cloud.database();
    const orderData = {
      date: this.data.selectedDate,
      dishes: selectedDishes.map(d => ({
        mealType: d.mealType,
        name: d.dishName,
        price: d.price
      })),
      totalPrice: this.data.totalPrice,
      status: 'pending',
      createTime: new Date(),
      updateTime: new Date()
    };

    const submitPromise = this.data.existingOrder 
      ? db.collection('orders').doc(this.data.existingOrder._id).update({
          data: {
            ...orderData,
            updateTime: new Date()
          }
        })
      : db.collection('orders').add({ data: orderData });

    submitPromise.then(() => {
      wx.hideLoading();
      wx.showToast({
        title: this.data.existingOrder ? '订单已更新' : '订餐成功',
        icon: 'success'
      });
      
      if (hasSubscribed && !this.data.existingOrder) {
        this.sendSubscribeMessage(selectedDishes);
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

  sendSubscribeMessage(selectedDishes) {
    const templateId = config.getSubscribeMessageTemplateId();
    const dishNames = selectedDishes.map(d => d.dishName).join('、');
    
    wx.cloud.callFunction({
      name: 'sendSubscribeMessage',
      data: {
        templateId: templateId,
        data: {
          thing1: { value: this.data.selectedDate },
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