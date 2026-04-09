const auth = require('../../utils/auth.js');
const initUtil = require('../../utils/initUtil.js');

Page({
  data: {
    staffList: [],
    loading: true,
    showModal: false,
    isEdit: false,
    editStaffId: null,
    formData: {
      phone: '',
      name: '',
      role: 'staff',
      status: 'active'
    },
    roleIndex: 0,
    statusIndex: 0,
    roleOptions: [
      { label: '普通工作人员', value: 'staff' },
      { label: '管理员', value: 'admin' },
      { label: '厨房工作人员', value: 'kitchen' }
    ],
    statusOptions: [
      { label: '在职', value: 'active' },
      { label: '离职', value: 'inactive' }
    ]
  },

  onLoad() {
    this.loadStaffList();
  },

  async onShow() {
    if (auth.isInitializing()) {
      await initUtil.waitForAppInit();
    }
    auth.checkPageAccess('userManage');
  },

  loadStaffList() {
    wx.cloud.callFunction({
      name: 'quickstartFunctions',
      data: {
        type: 'getStaffList'
      }
    }).then(res => {
      const staffList = res.result.data.map(item => {
        return {
          ...item,
          displayRole: this.getRoleLabel(item.role),
          displayStatus: this.getStatusLabel(item.status),
          statusClass: item.status === 'active' ? 'tag-success' : 'tag-warning'
        };
      });
      this.setData({
        staffList: staffList,
        loading: false
      });
    }).catch(err => {
      console.error('加载人员列表失败', err);
      this.setData({ loading: false });
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    });
  },

  onAddStaff() {
    this.setData({
      showModal: true,
      isEdit: false,
      editStaffId: null,
      formData: {
        phone: '',
        name: '',
        role: 'staff',
        status: 'active'
      },
      roleIndex: 0,
      statusIndex: 0
    });
  },

  onEditStaff(e) {
    const { staff } = e.currentTarget.dataset;
    const roleIndex = this.data.roleOptions.findIndex(o => o.value === staff.role);
    const statusIndex = this.data.statusOptions.findIndex(o => o.value === staff.status);
    this.setData({
      showModal: true,
      isEdit: true,
      editStaffId: staff._id,
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

  onDeleteStaff(e) {
    const { staff } = e.currentTarget.dataset;
    wx.showModal({
      title: '提示',
      content: `确定要删除 ${staff.name} 吗？`,
      success: res => {
        if (res.confirm) {
          this.doDeleteStaff(staff._id);
        }
      }
    });
  },

  doDeleteStaff(staffId) {
    wx.showLoading({ title: '删除中...' });
    wx.cloud.callFunction({
      name: 'quickstartFunctions',
      data: {
        type: 'deleteStaff',
        id: staffId
      }
    }).then(res => {
      if (res.result.success !== false) {
        wx.hideLoading();
        wx.showToast({
          title: '删除成功',
          icon: 'success'
        });
        this.loadStaffList();
      } else {
        wx.hideLoading();
        wx.showToast({
          title: res.result.error || '删除失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      wx.hideLoading();
      wx.showToast({
        title: '删除失败',
        icon: 'none'
      });
    });
  },

  onPhoneInput(e) {
    this.setData({
      'formData.phone': e.detail.value
    });
  },

  onNameInput(e) {
    this.setData({
      'formData.name': e.detail.value
    });
  },

  onRoleChange(e) {
    const index = parseInt(e.detail.value);
    this.setData({
      'formData.role': this.data.roleOptions[index].value,
      roleIndex: index
    });
  },

  onStatusChange(e) {
    const index = parseInt(e.detail.value);
    this.setData({
      'formData.status': this.data.statusOptions[index].value,
      statusIndex: index
    });
  },

  onCancelModal() {
    this.setData({
      showModal: false
    });
  },

  onConfirmModal() {
    const { phone, name, role, status } = this.data.formData;
    
    if (!phone || !name) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none'
      });
      return;
    }
    
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      wx.showToast({
        title: '请输入正确的手机号',
        icon: 'none'
      });
      return;
    }
    
    this.saveStaff();
  },

  saveStaff() {
    wx.showLoading({ title: '保存中...' });
    const { isEdit, editStaffId, formData } = this.data;
    
    const data = {
      phone: String(formData.phone),
      name: formData.name,
      role: formData.role,
      status: formData.status,
      updateTime: new Date()
    };
    
    if (isEdit) {
      wx.cloud.callFunction({
        name: 'quickstartFunctions',
        data: {
          type: 'updateStaff',
          id: editStaffId,
          data: data
        }
      }).then(res => {
        if (res.result.success !== false) {
          this.handleSaveSuccess();
        } else {
          this.handleSaveError(new Error(res.result.error));
        }
      }).catch(err => {
        this.handleSaveError(err);
      });
    } else {
      data.createTime = new Date();
      wx.cloud.callFunction({
        name: 'quickstartFunctions',
        data: {
          type: 'addStaff',
          data: data
        }
      }).then(res => {
        if (res.result.success !== false) {
          this.handleSaveSuccess();
        } else {
          this.handleSaveError(new Error(res.result.error));
        }
      }).catch(err => {
        this.handleSaveError(err);
      });
    }
  },

  handleSaveSuccess() {
    wx.hideLoading();
    wx.showToast({
      title: '保存成功',
      icon: 'success'
    });
    this.setData({ showModal: false });
    this.loadStaffList();
  },

  handleSaveError(err) {
    wx.hideLoading();
    console.error('保存失败', err);
    wx.showToast({
      title: '保存失败',
      icon: 'none'
    });
  },

  getRoleLabel(role) {
    const map = {
      'staff': '普通工作人员',
      'admin': '管理员',
      'kitchen': '厨房工作人员'
    };
    return map[role] || role;
  },

  getStatusLabel(status) {
    return status === 'active' ? '在职' : '离职';
  },

  onPullDownRefresh() {
    this.loadStaffList();
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 1000);
  }
});
