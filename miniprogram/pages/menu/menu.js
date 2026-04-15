const dateUtil = require('../../utils/dateUtil.js');
const auth = require('../../utils/auth.js');
const initUtil = require('../../utils/initUtil.js');
const { callCloudFunction } = require('../../utils/httpUtil.js');

Page({
  data: {
    selectedDate: '',
    isPast: false,
    meals: [
      { type: '早餐', dishes: [] },
      { type: '午餐', dishes: [] },
      { type: '晚餐', dishes: [] }
    ],
    existingMenuId: null,
    showAddDishModal: false,
    currentMealIndex: 0,
    allDishList: [],
    filteredDishList: [],
    dishSearchKeyword: ''
  },

  onLoad() {
    this.initDate();
    this.loadDishList();
  },

  async onShow() {
    if (auth.isInitializing()) {
      await initUtil.waitForAppInit();
    }
    auth.checkPageAccess('menu');
  },

  initDate() {
    const now = new Date();
    this.setData({
      selectedDate: dateUtil.formatDate(now),
      isPast: false
    });
    this.loadMenu();
  },

  onDateChange(e) {
    const { date, direction } = e.detail;
    const isPast = direction === 'prev' ? dateUtil.isPast(date) : false;
    
    this.setData({
      selectedDate: date,
      isPast: isPast
    });
    this.loadMenu();
  },

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

  loadDishList() {
    callCloudFunction('dishFunctions', { type: 'getDishList' }).then(res => {
      if (res.success) {
        this.setData({
          allDishList: res.data || [],
          filteredDishList: res.data || []
        });
      }
    }).catch(err => {
      console.error('加载菜品列表失败', err);
    });
  },

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
      dishSearchKeyword: '',
      filteredDishList: this.data.allDishList
    });
  },

  onDishSearch(e) {
    const keyword = e.detail.value.trim();
    this.setData({ dishSearchKeyword: keyword });
    
    if (!keyword) {
      this.setData({ filteredDishList: this.data.allDishList });
      return;
    }

    const filtered = this.data.allDishList.filter(item =>
      item.name.toLowerCase().includes(keyword.toLowerCase())
    );
    this.setData({ filteredDishList: filtered });
  },

  clearDishSearch() {
    this.setData({
      dishSearchKeyword: '',
      filteredDishList: this.data.allDishList
    });
  },

  selectDish(e) {
    const name = e.currentTarget.dataset.name;
    this.addDishToMeal(name);
  },

  addNewDish() {
    const name = this.data.dishSearchKeyword.trim();
    if (!name) {
      wx.showToast({ title: '请输入菜品名称', icon: 'none' });
      return;
    }

    const existing = this.data.allDishList.find(
      item => item.name.toLowerCase() === name.toLowerCase()
    );
    
    if (existing) {
      this.addDishToMeal(existing.name);
      return;
    }

    wx.showLoading({ title: '添加中...' });
    callCloudFunction('dishFunctions', {
      type: 'addDish',
      name: name
    }).then(res => {
      wx.hideLoading();
      if (res.success) {
        this.loadDishList();
        this.addDishToMeal(name);
      } else {
        wx.showToast({ title: res.error || '添加失败', icon: 'none' });
      }
    }).catch(err => {
      wx.hideLoading();
      console.error('添加新菜品失败', err);
      wx.showToast({ title: '添加失败', icon: 'none' });
    });
  },

  addDishToMeal(name) {
    const meals = [...this.data.meals];
    const currentMeal = meals[this.data.currentMealIndex];
    
    const exists = currentMeal.dishes.some(d => d.name === name);
    if (exists) {
      wx.showToast({ title: '该菜品已添加', icon: 'none' });
      return;
    }

    currentMeal.dishes.push({ name });
    this.setData({
      meals,
      showAddDishModal: false,
      dishSearchKeyword: ''
    });
  },

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

  cancelAddDish() {
    this.setData({
      showAddDishModal: false,
      dishSearchKeyword: '',
      filteredDishList: this.data.allDishList
    });
  },

  stopPropagation() {},

  saveMenu() {
    const { selectedDate, meals } = this.data;

    const allDishes = [];
    meals.forEach(meal => {
      meal.dishes.forEach(dish => {
        if (!allDishes.includes(dish.name)) {
          allDishes.push(dish.name);
        }
      });
    });

    wx.showLoading({ title: '保存中...' });

    callCloudFunction('menuFunctions', {
      type: 'saveMenu',
      date: selectedDate,
      meals: meals
    }).then(res => {
      if (res.success) {
        if (allDishes.length > 0) {
          return callCloudFunction('dishFunctions', {
            type: 'updateDishUsage',
            dishNames: allDishes
          });
        }
        return { success: true };
      } else {
        throw new Error(res.error || '保存失败');
      }
    }).then(() => {
      wx.hideLoading();
      wx.showToast({
        title: '保存成功',
        icon: 'success'
      });
      this.loadDishList();
    }).catch(err => {
      wx.hideLoading();
      console.error('保存菜单失败', err);
      wx.showToast({
        title: err.message || '保存失败',
        icon: 'none'
      });
    });
  }
});
