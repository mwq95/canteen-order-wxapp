const auth = require('../../utils/auth.js');
const { callCloudFunction } = require('../../utils/httpUtil.js');

Page({
  data: {
    dishList: [],
    filteredDishList: [],
    loading: true,
    showModal: false,
    dishName: '',
    searchKeyword: '',
    selectedIds: {},
    selectedCount: 0,
    isAllSelected: false
  },

  onLoad() {
    if (!auth.isVerified()) {
      wx.showToast({ title: '请先完成身份验证', icon: 'none' });
      setTimeout(() => {
        wx.reLaunch({ url: '/pages/auth/auth' });
      }, 1500);
      return;
    }
    if (!auth.canAccess('dishManage')) {
      wx.showToast({ title: '无权限访问', icon: 'none' });
      setTimeout(() => {
        wx.switchTab({ url: '/pages/order/order' });
      }, 1500);
      return;
    }
    this.loadDishList();
  },

  onShow() {
    if (this.data.dishList.length > 0) {
      this.loadDishList();
    }
  },

  loadDishList() {
    this.setData({ loading: true });
    callCloudFunction('dishFunctions', { type: 'getDishList' }).then(res => {
      const dishList = this.processDishList(res.data || []);
      this.setData({
        dishList,
        filteredDishList: dishList,
        loading: false,
        selectedIds: {},
        selectedCount: 0,
        isAllSelected: false
      });
    }).catch(err => {
      console.error('获取菜品列表失败', err);
      this.setData({ loading: false });
      wx.showToast({ title: '获取列表失败', icon: 'none' });
    });
  },

  processDishList(list) {
    return list.map(item => {
      const date = item.createTime ? new Date(item.createTime) : new Date();
      const month = date.getMonth() + 1;
      const day = date.getDate();
      return {
        ...item,
        createTimeStr: `${month}月${day}日`
      };
    });
  },

  onSearchInput(e) {
    const keyword = e.detail.value;
    this.setData({ searchKeyword: keyword });
    this.filterDishList(keyword);
  },

  onSearch(e) {
    this.filterDishList(e.detail.value);
  },

  clearSearch() {
    this.setData({ searchKeyword: '' });
    this.filterDishList('');
  },

  filterDishList(keyword) {
    if (!keyword) {
      this.setData({
        filteredDishList: this.data.dishList,
        selectedIds: {},
        selectedCount: 0,
        isAllSelected: false
      });
      return;
    }
    const lowerKeyword = keyword.toLowerCase();
    const filtered = this.data.dishList.filter(item =>
      item.name.toLowerCase().includes(lowerKeyword)
    );
    this.setData({
      filteredDishList: filtered,
      selectedIds: {},
      selectedCount: 0,
      isAllSelected: false
    });
  },

  toggleSelect(e) {
    const id = e.currentTarget.dataset.id;
    const selectedIds = { ...this.data.selectedIds };
    if (selectedIds[id]) {
      delete selectedIds[id];
    } else {
      selectedIds[id] = true;
    }
    const selectedCount = Object.keys(selectedIds).length;
    const isAllSelected = selectedCount === this.data.filteredDishList.length;
    this.setData({ selectedIds, selectedCount, isAllSelected });
  },

  toggleSelectAll() {
    if (this.data.isAllSelected) {
      this.setData({ selectedIds: {}, selectedCount: 0, isAllSelected: false });
    } else {
      const selectedIds = {};
      this.data.filteredDishList.forEach(item => {
        selectedIds[item._id] = true;
      });
      this.setData({
        selectedIds,
        selectedCount: this.data.filteredDishList.length,
        isAllSelected: true
      });
    }
  },

  cancelSelect() {
    this.setData({
      selectedIds: {},
      selectedCount: 0,
      isAllSelected: false
    });
  },

  getSelectedNames() {
    const names = [];
    this.data.filteredDishList.forEach(item => {
      if (this.data.selectedIds[item._id]) {
        names.push(item.name);
      }
    });
    return names.join('、');
  },

  onAddDish() {
    this.setData({
      showModal: true,
      dishName: ''
    });
  },

  onDishNameInput(e) {
    this.setData({ dishName: e.detail.value });
  },

  onCancelModal() {
    this.setData({ showModal: false });
  },

  stopPropagation() {},

  onConfirmModal() {
    const { dishName } = this.data;

    if (!dishName || dishName.trim().length === 0) {
      wx.showToast({ title: '请输入菜品名称', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '保存中...' });

    callCloudFunction('dishFunctions', {
      type: 'addDish',
      name: dishName.trim()
    }).then(res => {
      wx.hideLoading();
      if (res.success) {
        wx.showToast({ title: '添加成功', icon: 'success' });
        this.setData({ showModal: false });
        this.loadDishList();
      } else {
        wx.showToast({ title: res.error || '添加失败', icon: 'none' });
      }
    }).catch(err => {
      wx.hideLoading();
      console.error('添加菜品失败', err);
      wx.showToast({ title: '添加失败', icon: 'none' });
    });
  },

  onDeleteDish(e) {
    const { id, name } = e.currentTarget.dataset;
    
    wx.showModal({
      title: '确认删除',
      content: `确定要删除菜品"${name}"吗？`,
      success: res => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' });
          callCloudFunction('dishFunctions', {
            type: 'deleteDish',
            id
          }).then(() => {
            wx.hideLoading();
            wx.showToast({ title: '删除成功', icon: 'success' });
            this.loadDishList();
          }).catch(err => {
            wx.hideLoading();
            console.error('删除菜品失败', err);
            wx.showToast({ title: '删除失败', icon: 'none' });
          });
        }
      }
    });
  },

  batchDelete() {
    const ids = Object.keys(this.data.selectedIds);
    if (ids.length === 0) return;

    const names = this.getSelectedNames();

    wx.showModal({
      title: '确认批量删除',
      content: `确定要删除以下菜品？\n${names}`,
      success: res => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' });
          callCloudFunction('dishFunctions', {
            type: 'batchDeleteDish',
            ids
          }).then(() => {
            wx.hideLoading();
            wx.showToast({ title: '删除成功', icon: 'success' });
            this.setData({ selectedIds: {}, selectedCount: 0, isAllSelected: false });
            this.loadDishList();
          }).catch(err => {
            wx.hideLoading();
            console.error('批量删除失败', err);
            wx.showToast({ title: '删除失败', icon: 'none' });
          });
        }
      }
    });
  }
});
