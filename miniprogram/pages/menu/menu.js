Page({
  data: {
    selectedDate: '',
    meals: [
      { type: '早餐', dishes: [] },
      { type: '午餐', dishes: [] },
      { type: '晚餐', dishes: [] }
    ],
    existingMenuId: null,
    newDishName: '',
    newDishPrice: '',
    currentMealIndex: 0,
    showAddDishModal: false
  },

  onLoad() {
    this.initDate();
  },

  initDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    this.setData({
      selectedDate: `${year}-${month}-${day}`
    });
    this.loadMenu();
  },

  onDateChange(e) {
    this.setData({
      selectedDate: e.detail.value
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
    const mealIndex = e.currentTarget.dataset.index;
    this.setData({
      currentMealIndex: mealIndex,
      showAddDishModal: true,
      newDishName: '',
      newDishPrice: ''
    });
  },

  onDishNameInput(e) {
    this.setData({ newDishName: e.detail.value });
  },

  onDishPriceInput(e) {
    this.setData({ newDishPrice: e.detail.value });
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
      name: this.data.newDishName.trim(),
      price: this.data.newDishPrice || null
    };
    meals[this.data.currentMealIndex].dishes.push(dish);

    this.setData({
      meals,
      showAddDishModal: false,
      newDishName: '',
      newDishPrice: ''
    });
  },

  deleteDish(e) {
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
      newDishName: '',
      newDishPrice: ''
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