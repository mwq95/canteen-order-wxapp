/**
 * 订餐页面 - 统一页面（合并首页和订餐页）
 * 功能包括：
 * - 显示每日菜单
 * - 选择菜品
 * - 提交/修改订单
 * - 订餐截止时间控制
 */

const config = require('../../config.js');
const dateUtil = require('../../utils/dateUtil.js');
const auth = require('../../utils/auth.js');
const initUtil = require('../../utils/initUtil.js');
const app = getApp();

Page({
  /**
   * 页面数据
   */
  data: {
    // 日期相关
    selectedDate: '',           // 当前选择的日期 YYYY-MM-DD
    selectedDateStr: '',        // 当前选择的日期中文显示
    
    // 菜单数据
    menuData: null,             // 当日菜单数据 { date, meals: [{ type, dishes }] }
    
    // 订单数据 - 每顿独立管理
    orders: {
      '早餐': { orderId: null, dishes: [], status: 'none' },
      '午餐': { orderId: null, dishes: [], status: 'none' },
      '晚餐': { orderId: null, dishes: [], status: 'none' }
    },
    
    // 用户选择（未提交的选择）
    userSelections: {
      '早餐': [],
      '午餐': [],
      '晚餐': []
    },
    
    // 截止时间配置
    deadlines: {
      breakfast: '08:00',
      lunch: '12:00',
      dinner: '17:00'
    },
    
    // 各餐是否禁用
    disabledMeals: {
      '早餐': false,
      '午餐': false,
      '晚餐': false
    },
    
    // 加载状态
    loading: true,
    
    // 是否显示初始化按钮（数据库未初始化时显示）
    showInitButton: false
  },

  /**
   * 页面加载时执行
   */
  onLoad() {
    this.initDate();
    this.loadDeadlines();
    this.initPage();
  },

  /**
   * 页面显示时执行
   */
  onShow() {
    auth.checkPageAccess('tabbar');
    if (app.globalData.openid) {
      this.loadData();
    }
  },

  /**
   * 异步初始化页面，等待 app 初始化完成后再加载数据
   */
  async initPage() {
    await initUtil.waitForAppInit();
    this.loadData();
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.loadDeadlines();
    this.loadData();
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 1000);
  },

  /**
   * 初始化日期为今天
   */
  initDate() {
    const now = new Date();
    this.setData({
      selectedDate: dateUtil.formatDate(now),
      selectedDateStr: dateUtil.formatDateChinese(now)
    });
  },

  /**
   * 切换到前一天
   */
  prevDay() {
    const current = dateUtil.prevDay(this.data.selectedDate);
    this.setData({
      selectedDate: dateUtil.formatDate(current),
      selectedDateStr: dateUtil.formatDateChinese(current),
      loading: true
    });
    this.loadData();
  },

  /**
   * 切换到后一天
   */
  nextDay() {
    const current = dateUtil.nextDay(this.data.selectedDate);
    this.setData({
      selectedDate: dateUtil.formatDate(current),
      selectedDateStr: dateUtil.formatDateChinese(current),
      loading: true
    });
    this.loadData();
  },

  /**
   * 从数据库加载订餐截止时间配置
   */
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

  /**
   * 加载菜单数据和用户订单数据
   * 核心方法：整合了首页菜单展示和订餐页订单查询
   */
  loadData() {
    const db = wx.cloud.database();
    const date = this.data.selectedDate;
    const openid = app.globalData.openid;
    
    if (!openid) {
      this.setData({ loading: false });
      return;
    }

    // 查询当日菜单
    db.collection('menus').where({ date }).get().then(menuRes => {
      const menuData = menuRes.data[0] || null;
      
      // 如果没有菜单数据，显示提示
      if (!menuData) {
        this.setData({
          menuData: null,
          loading: false,
          showInitButton: false
        });
        return;
      }

      // 查询每餐的用户订单
      const mealTypes = ['早餐', '午餐', '晚餐'];
      const promises = mealTypes.map(mealType => {
        return db.collection('orders').where({
          date,
          mealType,
          _openid: openid
        }).get();
      });

      // 并行查询所有订单
      return Promise.all(promises).then(orderResults => {
        // 初始化订单状态
        const orders = {
          '早餐': { orderId: null, dishes: [], status: 'none' },
          '午餐': { orderId: null, dishes: [], status: 'none' },
          '晚餐': { orderId: null, dishes: [], status: 'none' }
        };
        
        // 初始化用户选择
        const userSelections = {
          '早餐': [],
          '午餐': [],
          '晚餐': []
        };
        
        // 处理每餐的订单结果
        orderResults.forEach((orderRes, index) => {
          const mealType = mealTypes[index];
          
          // 过滤掉已取消的订单，只保留有效订单
          const validOrders = orderRes.data.filter(o => o.status !== 'cancelled');
          
          if (validOrders.length > 0) {
            // 有有效订单，标记为已订餐
            const order = validOrders[0];
            orders[mealType] = {
              orderId: order._id,
              dishes: order.dishes.map(d => d.name),
              status: 'ordered'
            };
            // 将已选菜品填充到用户选择中
            userSelections[mealType] = order.dishes.map(d => d.name);
          } else {
            // 无有效订单或已取消，标记为未订餐
            orders[mealType] = {
              orderId: null,
              dishes: [],
              status: 'none'
            };
            userSelections[mealType] = [];
          }
        });
        
        // 更新页面数据
        this.setData({
          menuData,
          orders,
          userSelections,
          loading: false,
          showInitButton: false
        });
        
        // 检查各餐是否可订餐
        this.checkDisabledMeals();
      });
    }).catch(err => {
      console.error('加载数据失败', err);
      
      // 区分错误类型：是数据库未初始化还是其他错误
      if (err.errCode === -1) {
        this.setData({ 
          loading: false,
          showInitButton: true 
        });
      } else {
        this.setData({ 
          loading: false,
          showInitButton: false 
        });
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 检查各餐是否可订餐
   * 规则：
   * - 过去日期不可订餐
   * - 今天超过截止时间的餐次不可订餐
   */
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
    
    // 如果是过去的日期，全部禁用
    if (selectedDate < todayStr) {
      disabledMeals['早餐'] = true;
      disabledMeals['午餐'] = true;
      disabledMeals['晚餐'] = true;
    } else if (selectedDate === todayStr) {
      // 如果是今天，根据当前时间和截止时间判断
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

  /**
   * 切换菜品选择状态
   * @param {Object} e - 事件对象
   * @param {string} e.currentTarget.dataset.mealType - 餐次类型
   * @param {string} e.currentTarget.dataset.dishName - 菜品名称
   */
  toggleDish(e) {
    const { mealType, dishName } = e.currentTarget.dataset;
    
    // 检查该餐次是否可操作
    if (this.data.disabledMeals[mealType]) {
      wx.showToast({
        title: `${mealType}已过截止时间`,
        icon: 'none'
      });
      return;
    }
    
    // 更新用户选择
    const userSelections = { ...this.data.userSelections };
    const selections = [...userSelections[mealType]];
    const index = selections.indexOf(dishName);
    
    // 如果已选中则取消，未选中则添加
    if (index > -1) {
      selections.splice(index, 1);
    } else {
      selections.push(dishName);
    }
    
    userSelections[mealType] = selections;
    this.setData({ userSelections });
  },

  /**
   * 判断菜品是否被选中
   * @param {string} mealType - 餐次类型
   * @param {string} dishName - 菜品名称
   * @returns {boolean} 是否被选中
   */
  isDishSelected(mealType, dishName) {
    const selections = this.data.userSelections[mealType] || [];
    return selections.indexOf(dishName) !== -1;
  },

  /**
   * 提交订单
   * @param {Object} e - 事件对象
   * @param {string} e.currentTarget.dataset.mealType - 餐次类型
   */
  submitOrder(e) {
    const { mealType } = e.currentTarget.dataset;
    const selections = this.data.userSelections[mealType];
    
    // 校验：检查是否有选择菜品
    if (selections.length === 0) {
      wx.showToast({
        title: `请选择${mealType}菜品`,
        icon: 'none'
      });
      return;
    }

    // 校验：检查是否可订餐
    if (this.data.disabledMeals[mealType]) {
      wx.showToast({
        title: `${mealType}已过截止时间`,
        icon: 'none'
      });
      return;
    }

    // 检查是否配置了订阅消息模板ID
    const templateId = config.getSubscribeMessageTemplateId();
    if (templateId && templateId !== '您的订阅消息模板ID') {
      // 有订阅消息配置，先请求授权再提交
      this.requestSubscribeMessageAndSubmit(mealType, selections);
    } else {
      // 无订阅消息配置，直接提交
      this.doSubmitOrder(mealType, selections);
    }
  },

  /**
   * 请求订阅消息授权并提交订单
   * @param {string} mealType - 餐次类型
   * @param {Array} selections - 选中的菜品列表
   */
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

  /**
   * 执行订单提交操作
   * @param {string} mealType - 餐次类型
   * @param {Array} selections - 选中的菜品列表
   * @param {boolean} hasSubscribed - 用户是否同意订阅消息
   */
  doSubmitOrder(mealType, selections, hasSubscribed = false) {
    wx.showLoading({ title: '提交中...' });

    const db = wx.cloud.database();
    
    // 构建订单数据
    const orderData = {
      date: this.data.selectedDate,
      mealType,
      dishes: selections.map(name => ({ name })),
      status: 'pending',
      createTime: new Date(),
      updateTime: new Date()
    };

    // 判断是新增还是更新订单
    const existingOrder = this.data.orders[mealType];
    let submitPromise;

    if (existingOrder.orderId) {
      // 已有订单，执行更新操作
      submitPromise = db.collection('orders').doc(existingOrder.orderId).update({
        data: {
          ...orderData,
          updateTime: new Date()
        }
      });
    } else {
      // 新订单，执行添加操作
      submitPromise = db.collection('orders').add({ data: orderData });
    }

    // 处理提交结果
    submitPromise.then(() => {
      wx.hideLoading();
      
      // 显示成功提示
      wx.showToast({
        title: existingOrder.orderId ? `${mealType}已更新` : `${mealType}订餐成功`,
        icon: 'success'
      });
      
      // 如果是新订单且用户同意了订阅消息，发送通知
      if (hasSubscribed && !existingOrder.orderId) {
        this.sendSubscribeMessage(mealType, selections);
      }
      
      // 重新加载数据以刷新界面
      this.loadData();
    }).catch(err => {
      wx.hideLoading();
      wx.showToast({
        title: '提交失败',
        icon: 'none'
      });
    });
  },

  /**
   * 发送订阅消息通知
   * @param {string} mealType - 餐次类型
   * @param {Array} selections - 选中的菜品列表
   */
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
  },

  /**
   * 初始化数据库（当数据库未初始化时调用）
   */
  initDatabase() {
    wx.showLoading({ title: '初始化中...' });
    wx.cloud.callFunction({
      name: 'quickstartFunctions',
      data: {
        type: 'createCanteenCollections'
      }
    }).then(res => {
      wx.hideLoading();
      if (res.result.success) {
        wx.showToast({
          title: '初始化成功',
          icon: 'success'
        });
        this.setData({ showInitButton: false });
        this.loadData();
      }
    }).catch(err => {
      wx.hideLoading();
      wx.showToast({
        title: '请先上传云函数',
        icon: 'none'
      });
    });
  }
});
