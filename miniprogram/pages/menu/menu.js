const dateUtil = require('../../utils/dateUtil.js');
const auth = require('../../utils/auth.js');

Page({
  data: {
    selectedDate: '',
    selectedDateStr: '',
    isPast: false,
    meals: [
      { type: '早餐', dishes: [] },
      { type: '午餐', dishes: [] },
      { type: '晚餐', dishes: [] }
    ],
    existingMenuId: null,
    newDishName: '',
    currentMealIndex: 0,
    showAddDishModal: false
  },

  onLoad() {
    this.initDate();
  },

  onShow() {
    auth.checkPageAccess('menu');
  },

  initDate() {
    const now = new Date();
    this.setData({
      selectedDate: dateUtil.formatDate(now),
      selectedDateStr: dateUtil.formatDateChineseShort(now),
      isPast: false
    });
    this.loadMenu();
  },

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

  nextDay() {
    const current = dateUtil.nextDay(this.data.selectedDate);
    this.setData({
      selectedDate: dateUtil.formatDate(current),
      selectedDateStr: dateUtil.formatDateChineseShort(current),
      isPast: false
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

  onDishNameInput(e) {
    this.setData({ newDishName: e.detail.value });
  },

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
      newDishName: ''
    });
  },

  saveMenu() {
    const db = wx.cloud.database();
    const menuData = {
      date: this.data.selectedDate,
      meals: this.data.meals,
      updateTime: new Date()
    };

    wx.showLoading({ title: '保存中...' });

    if (this.data.existingMenuId) {
      db.collection('menus').doc(this.data.existingMenuId).update({
        data: menuData
      }).then(() => {
        wx.hideLoading();
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        });
      }).catch(err => {
        wx.hideLoading();
        wx.showToast({
          title: '保存失败',
          icon: 'none'
        });
      });
    } else {
      menuData.createTime = new Date();
      db.collection('menus').add({
        data: menuData
      }).then(res => {
        wx.hideLoading();
        this.setData({ existingMenuId: res._id });
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        });
      }).catch(err => {
        wx.hideLoading();
        wx.showToast({
          title: '保存失败',
          icon: 'none'
        });
      });
    }
  }
});
