/*
 * 菜单管理页面 - 管理员编辑每日菜单
 */

const dateUtil = require('../../utils/dateUtil.js');
const auth = require('../../utils/auth.js');
const initUtil = require('../../utils/initUtil.js');
const { callCloudFunction } = require('../../utils/httpUtil.js');

Page({
  data: {
    // 选中的日期
    selectedDate: '',
    // 选中日期的中文显示
    selectedDateStr: '',
    // 是否为过去的日期
    isPast: false,
    // 餐次数据
    meals: [
      { type: '早餐', dishes: [] },
      { type: '午餐', dishes: [] },
      { type: '晚餐', dishes: [] }
    ],
    // 现有菜单ID
    existingMenuId: null,
    // 新菜品名称
    newDishName: '',
    // 当前餐次索引
    currentMealIndex: 0,
    // 是否显示添加菜品弹窗
    showAddDishModal: false
  },

  // 页面加载时调用
  onLoad() {
    this.initDate();
  },

  // 页面显示时调用
  async onShow() {
    if (auth.isInitializing()) {
      await initUtil.waitForAppInit();
    }
    auth.checkPageAccess('menu');
  },

  // 初始化日期
  initDate() {
    const now = new Date();
    this.setData({
      selectedDate: dateUtil.formatDate(now),
      selectedDateStr: dateUtil.formatDateChineseShort(now),
      isPast: false
    });
    this.loadMenu();
  },

  // 切换到前一天
  prevDay() {
    const current = dateUtil.prevDay(this.data.selectedDate);
    const isPast = dateUtil.isPast(dateUtil.formatDate(current));
    
    this.setData({
      selectedDate: dateUtil.formatDate(current),
      selectedDateStr: dateUtil.formatDateChineseShort(current),
      isPast: isPast
    });
    this.loadMenu();
  },

  // 切换到后一天
  nextDay() {
    const current = dateUtil.nextDay(this.data.selectedDate);
    this.setData({
      selectedDate: dateUtil.formatDate(current),
      selectedDateStr: dateUtil.formatDateChineseShort(current),
      isPast: false
    });
    this.loadMenu();
  },

  // 加载菜单数据
  loadMenu() {
    const db = wx.cloud.database();
    db.collection('menus').where({
      date: this.data.selectedDate
    }).get().then(res => {
      if (res.data.length > 0) {
        this.setData({
          meals: res.data[0].meals,
          existingMenuId: res.data[0]._id
        });
      } else {
        this.setData({
          meals: [
            { type: '早餐', dishes: [] },
            { type: '午餐', dishes: [] },
            { type: '晚餐', dishes: [] }
          ],
          existingMenuId: null
        });
      }
    }).catch(err => {
      console.error('加载菜单失败', err);
    });
  },

  // 显示添加菜品弹窗
  showAddDish(e) {
    if (this.data.isPast) {
      wx.showToast({
        title: '过去的日期不能修改',
        icon: 'none'
      });
      return;
    }
    
    const mealIndex = e.currentTarget.dataset.index;
    this.setData({
      currentMealIndex: mealIndex,
      showAddDishModal: true,
      newDishName: ''
    });
  },

  // 菜品名称输入
  onDishNameInput(e) {
    this.setData({ newDishName: e.detail.value });
  },

  // 添加菜品
  addDish() {
    if (!this.data.newDishName.trim()) {
      wx.showToast({
        title: '请输入菜品名称',
        icon: 'none'
      });
      return;
    }

    const meals = [...this.data.meals];
    const dish = {
      name: this.data.newDishName.trim()
    };
    meals[this.data.currentMealIndex].dishes.push(dish);

    this.setData({
      meals,
      showAddDishModal: false,
      newDishName: ''
    });
  },

  // 删除菜品
  deleteDish(e) {
    if (this.data.isPast) {
      wx.showToast({
        title: '过去的日期不能修改',
        icon: 'none'
      });
      return;
    }
    
    const { mealIndex, dishIndex } = e.currentTarget.dataset;
    wx.showModal({
      title: '提示',
      content: '确定要删除这个菜品吗？',
      success: res => {
        if (res.confirm) {
          const meals = [...this.data.meals];
          meals[mealIndex].dishes.splice(dishIndex, 1);
          this.setData({ meals });
        }
      }
    });
  },

  // 取消添加菜品
  cancelAddDish() {
    this.setData({
      showAddDishModal: false,
      newDishName: ''
    });
  },

  // 保存菜单
  saveMenu() {
    const { selectedDate, meals } = this.data;

    wx.showLoading({ title: '保存中...' });

    callCloudFunction('menuFunctions', {
      type: 'saveMenu',
      date: selectedDate,
      meals: meals
    }).then(res => {
      wx.hideLoading();
      
      if (res.success) {
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        });
      } else {
        wx.showToast({
          title: res.error || '保存失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      wx.hideLoading();
      console.error('保存菜单失败', err);
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      });
    });
  }
});
