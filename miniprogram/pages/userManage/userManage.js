/*
 * 用户管理页面 - 管理员管理员工信息
 */

const app = getApp();
const auth = require('../../utils/auth.js');

Page({
  data: {
    // 员工列表
    staffList: [],
    // 筛选后的员工列表
    filteredStaffList: [],
    // 加载状态
    loading: true,
    // 是否显示弹窗
    showModal: false,
    // 是否为编辑模式
    isEdit: false,
    // 编辑中的ID
    editingId: null,
    // 表单数据
    formData: {
      // 手机号
      phone: '',
      name: '',
      role: 'staff',
      status: 'active'
    },
    roleOptions: [
      { label: '用餐人员', value: 'staff' },
      { label: '厨房工作人员', value: 'kitchen' },
      { label: '管理员', value: 'admin' }
    ],
    statusOptions: [
      { label: '在职', value: 'active' },
      { label: '离职', value: 'inactive' }
    ],
    roleIndex: 0,
    statusIndex: 0,
    searchKeyword: '',
    selectedIds: {},
    selectedCount: 0,
    isAllSelected: false
  },

  // 页面加载时调用
  onLoad() {
    if (!auth.isVerified()) {
      wx.showToast({ title: '请先完成身份验证', icon: 'none' });
      setTimeout(() => {
        wx.reLaunch({ url: '/pages/auth/auth' });
      }, 1500);
      return;
    }
    if (!auth.isAdmin()) {
      wx.showToast({ title: '无权限访问', icon: 'none' });
      setTimeout(() => {
        wx.switchTab({ url: '/pages/order/order' });
      }, 1500);
      return;
    }
    this.loadStaffList();
  },

  // 页面显示时调用
  onShow() {
    if (this.data.staffList.length > 0) {
      this.loadStaffList();
    }
  },

  // 加载员工列表
  loadStaffList() {
    this.setData({ loading: true });
    wx.cloud.callFunction({
      name: 'userFunctions',
      data: { type: 'getStaffList' }
    }).then(res => {
      const staffList = this.processStaffList(res.result.data || []);
      this.setData({
        staffList,
        // 筛选后的员工列表
        filteredStaffList: staffList,
        // 加载状态
        loading: false,
        // 选中的ID
        selectedIds: {},
        // 选中数量
        selectedCount: 0,
        // 是否全选
        isAllSelected: false
      });
    }).catch(err => {
      console.error('获取人员列表失败', err);
      this.setData({ loading: false });
      wx.showToast({ title: '获取列表失败', icon: 'none' });
    });
  },

  // 处理员工列表
  processStaffList(list) {
    const roleMap = { staff: '用餐人员', kitchen: '厨房工作人员', admin: '管理员' };
    return list.map(item => {
      let statusClass = 'tag-success';
      if (item.status === 'inactive') statusClass = 'tag-warning';
      return {
        ...item,
        displayRole: roleMap[item.role] || '用餐人员',
        displayStatus: item.status === 'active' ? '在职' : '离职',
        statusClass
      };
    });
  },

  // 搜索输入事件
  onSearchInput(e) {
    const keyword = e.detail.value;
    this.setData({ searchKeyword: keyword });
    this.filterStaffList(keyword);
  },

  // 搜索事件
  onSearch(e) {
    this.filterStaffList(e.detail.value);
  },

  // 清除搜索
  clearSearch() {
    this.setData({ searchKeyword: '' });
    this.filterStaffList('');
  },

  // 筛选员工列表
  filterStaffList(keyword) {
    if (!keyword) {
      this.setData({
        filteredStaffList: this.data.staffList,
        selectedIds: {},
        selectedCount: 0,
        isAllSelected: false
      });
      return;
    }
    const lowerKeyword = keyword.toLowerCase();
    const filtered = this.data.staffList.filter(item =>
      item.name.toLowerCase().includes(lowerKeyword) ||
      item.phone.includes(keyword)
    );
    this.setData({
      filteredStaffList: filtered,
      selectedIds: {},
      selectedCount: 0,
      isAllSelected: false
    });
  },

  // 切换选中状态
  toggleSelect(e) {
    const id = e.currentTarget.dataset.id;
    const selectedIds = { ...this.data.selectedIds };
    if (selectedIds[id]) {
      delete selectedIds[id];
    } else {
      selectedIds[id] = true;
    }
    const selectedCount = Object.keys(selectedIds).length;
    const isAllSelected = selectedCount === this.data.filteredStaffList.length;
    this.setData({ selectedIds, selectedCount, isAllSelected });
  },

  // 切换全选状态
  toggleSelectAll() {
    if (this.data.isAllSelected) {
      this.setData({ selectedIds: {}, selectedCount: 0, isAllSelected: false });
    } else {
      const selectedIds = {};
      this.data.filteredStaffList.forEach(item => {
        selectedIds[item._id] = true;
      });
      this.setData({
        selectedIds,
        selectedCount: this.data.filteredStaffList.length,
        isAllSelected: true
      });
    }
  },

  // 取消选中
  cancelSelect() {
    this.setData({
      selectedIds: {},
      selectedCount: 0,
      isAllSelected: false
    });
  },

  // 获取选中的姓名
  getSelectedNames() {
    const names = [];
    this.data.filteredStaffList.forEach(item => {
      if (this.data.selectedIds[item._id]) {
        names.push(item.name);
      }
    });
    return names.join('、');
  },

  // 批量设为离职
  batchDeactivate() {
    const ids = Object.keys(this.data.selectedIds);
    if (ids.length === 0) return;

    const names = this.getSelectedNames();

    wx.showModal({
      title: '确认批量离职',
      content: `确定要将以下人员设为离职？\n${names}`,
      success: res => {
        if (res.confirm) {
          wx.showLoading({ title: '处理中...' });
          const promises = ids.map(id =>
            wx.cloud.callFunction({
              name: 'userFunctions',
              data: { type: 'updateStaff', id, data: { status: 'inactive' } }
            })
          );
          Promise.all(promises).then(() => {
            wx.hideLoading();
            wx.showToast({ title: '操作成功', icon: 'success' });
            this.setData({ selectedIds: {}, selectedCount: 0, isAllSelected: false });
            this.loadStaffList();
          }).catch(err => {
            wx.hideLoading();
            console.error('批量离职失败', err);
            wx.showToast({ title: '操作失败', icon: 'none' });
          });
        }
      }
    });
  },

  // 添加员工
  onAddStaff() {
    this.setData({
      showModal: true,
      isEdit: false,
      editingId: null,
      formData: { phone: '', name: '', role: 'staff', status: 'active' },
      roleIndex: 0
    });
  },

  // 编辑员工
  onEditStaff(e) {
    const staff = e.currentTarget.dataset.staff;
    const roleIndex = this.data.roleOptions.findIndex(r => r.value === staff.role);
    const statusIndex = this.data.statusOptions.findIndex(s => s.value === staff.status);
    this.setData({
      showModal: true,
      isEdit: true,
      editingId: staff._id,
      formData: {
        phone: staff.phone,
        name: staff.name,
        role: staff.role,
        status: staff.status
      },
      roleIndex: roleIndex >= 0 ? roleIndex : 0,
      statusIndex: statusIndex >= 0 ? statusIndex : 0
    });
  },

  // 手机号输入事件
  onPhoneInput(e) {
    this.setData({
      'formData.phone': e.detail.value
    });
  },

  // 姓名输入
  onNameInput(e) {
    this.setData({
      'formData.name': e.detail.value
    });
  },

  // 角色选择变化
  onRoleChange(e) {
    const index = e.detail.value;
    this.setData({
      roleIndex: index,
      'formData.role': this.data.roleOptions[index].value
    });
  },

  // 状态选择变化
  onStatusChange(e) {
    const index = e.detail.value;
    this.setData({
      statusIndex: index,
      'formData.status': this.data.statusOptions[index].value
    });
  },

  // 取消弹窗
  onCancelModal() {
    this.setData({ showModal: false });
  },

  // 阻止事件冒泡
  stopPropagation() {},

  // 确认弹窗
  onConfirmModal() {
    const { phone, name, role, status } = this.data.formData;

    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      wx.showToast({ title: '请输入正确的手机号', icon: 'none' });
      return;
    }

    if (!name || name.trim().length === 0) {
      wx.showToast({ title: '请输入姓名', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '保存中...' });
    const data = {
      phone: phone.trim(),
      name: name.trim(),
      role,
      status
    };

    const action = this.data.isEdit ? 'updateStaff' : 'addStaff';
    const payload = this.data.isEdit ? { id: this.data.editingId, data } : { data };

    wx.cloud.callFunction({
      name: 'userFunctions',
      data: { type: action, ...payload }
    }).then(() => {
      wx.hideLoading();
      wx.showToast({ title: '保存成功', icon: 'success' });
      this.setData({ showModal: false });
      this.loadStaffList();
    }).catch(err => {
      wx.hideLoading();
      console.error('保存失败', err);
      wx.showToast({ title: '保存失败', icon: 'none' });
    });
  }
});
