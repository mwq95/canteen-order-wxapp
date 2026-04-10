const app = getApp();
const initUtil = require('../../utils/initUtil.js');

Page({
  data: {
    phone: '',                // 用户手动输入的手机号
    loading: false,           // 是否显示加载中状态
    checking: true            // 是否正在检查验证状态
  },

  /**
   * 页面加载时执行
   */
  onLoad() {
    this.checkIfVerified();
  },

  /**
   * 页面显示时执行（从其他页面返回时）
   */
  onShow() {
    this.checkIfVerified();
  },

  /**
   * 检查用户是否已验证身份
   * 已验证则跳转到订餐页，未验证则显示验证页面
   */
  async checkIfVerified() {
    // 快速检查：如果已明确有 openid 和 isVerified=true，直接跳转
    if (app.globalData.openid && app.globalData.isVerified) {
      this.redirectToOrderPage();
      return;
    }

    // 异步检查：等待应用初始化完成后再判断
    if (app.globalData.openid === null || app.globalData.isVerified === undefined) {
      await initUtil.waitForAppInit();

      if (app.globalData.isVerified) {
        this.redirectToOrderPage();
        return;
      }
    }

    // 未验证：显示验证界面
    this.setData({ checking: false });
  },

  /**
   * 跳转到订餐页面
   */
  redirectToOrderPage() {
    wx.switchTab({
      url: '/pages/order/order'
    });
  },

  /**
   * 处理用户手动输入手机号
   */
  onPhoneInput(e) {
    this.setData({
      phone: e.detail.value
    });
  },

  /**
   * 处理微信授权获取手机号（按钮触发）
   * @param {Object} e - 事件对象，包含手机号授权的 code
   */
  getPhoneNumber(e) {
    if (e.detail.code) {
      this.verifyByPhoneNumber(e.detail.code);
    }
  },

  /**
   * 通过云函数用 code 换取手机号并验证身份
   * @param {string} code - 微信手机号授权的 code
   */
  verifyByPhoneNumber(code) {
    this.showLoading('验证中...');

    wx.cloud.callFunction({
      name: 'quickstartFunctions',
      data: {
        type: 'getPhoneNumber',
        code: code
      }
    }).then(res => {
      if (res.result.phoneNumber) {
        this.verifyStaff(res.result.phoneNumber);
      } else {
        this.hideLoading();
        this.showToast('获取手机号失败', 'none');
      }
    }).catch(err => {
      console.error('获取手机号失败', err);
      this.hideLoading();
      this.showToast('获取手机号失败', 'none');
    });
  },

  /**
   * 处理用户手动输入手机号后点击验证
   */
  onManualVerify() {
    const phone = this.data.phone.trim();

    if (!this.validatePhone(phone)) {
      return;
    }

    this.verifyStaff(phone);
  },

  /**
   * 验证手机号格式
   * @param {string} phone - 手机号
   * @returns {boolean} - 是否符合格式
   */
  validatePhone(phone) {
    if (!phone) {
      this.showToast('请输入手机号', 'none');
      return false;
    }

    if (!/^1[3-9]\d{9}$/.test(phone)) {
      this.showToast('请输入正确的手机号', 'none');
      return false;
    }

    return true;
  },

  /**
   * 验证员工身份：检查手机号是否在 staffs 集合中
   * @param {string} phone - 手机号
   */
  verifyStaff(phone) {
    const db = wx.cloud.database();

    db.collection('staffs').where({
      phone: String(phone),
      status: 'active'
    }).get().then(res => {
      if (res.data.length > 0) {
        const staff = res.data[0];
        this.createOrUpdateUser(staff);
      } else {
        this.hideLoading();
        this.showModal('验证失败', '您不在单位人员列表中，请联系管理员');
      }
    }).catch(err => {
      console.error('验证员工身份失败', err);
      this.hideLoading();
      this.showToast('验证失败', 'none');
    });
  },

  /**
   * 创建或更新用户记录
   * @param {Object} staff - 员工信息
   */
  createOrUpdateUser(staff) {
    const db = wx.cloud.database();

    db.collection('users').where({
      phone: String(staff.phone)
    }).get().then(res => {
      const userData = this.buildUserData(staff);

      if (res.data.length > 0) {
        db.collection('users').doc(res.data[0]._id).update({
          data: userData
        }).then(() => {
          this.finishVerification(staff);
        });
      } else {
        userData.createTime = new Date();
        db.collection('users').add({
          data: userData
        }).then(() => {
          this.finishVerification(staff);
        });
      }
    }).catch(err => {
      console.error('创建/更新用户失败', err);
      this.hideLoading();
      this.showToast('验证失败', 'none');
    });
  },

  /**
   * 构建用户数据对象
   * @param {Object} staff - 员工信息
   * @returns {Object} - 用户数据对象
   */
  buildUserData(staff) {
    return {
      phone: staff.phone,
      name: staff.name,
      isVerified: true,
      role: staff.role,
      subscribeOrderReminder: true,
      subscribeMealReminder: true,
      updateTime: new Date()
    };
  },

  /**
   * 验证完成，更新全局状态并跳转
   * @param {Object} staff - 员工信息
   */
  finishVerification(staff) {
    app.globalData.isVerified = true;
    app.globalData.role = staff.role;
    app.globalData.phone = staff.phone;
    app.globalData.name = staff.name;
    app.globalData.subscribeOrderReminder = true;
    app.globalData.subscribeMealReminder = true;

    this.hideLoading();
    this.showToast('验证成功', 'success');

    setTimeout(() => {
      this.redirectToOrderPage();
    }, 1500);
  },

  /**
   * 显示加载中状态
   * @param {string} title - 加载提示文字
   */
  showLoading(title = '加载中...') {
    this.setData({ loading: true });
    wx.showLoading({ title, mask: true });
  },

  /**
   * 隐藏加载中状态
   */
  hideLoading() {
    this.setData({ loading: false });
    wx.hideLoading();
  },

  /**
   * 显示提示
   * @param {string} title - 提示内容
   * @param {string} icon - 提示图标类型
   */
  showToast(title, icon = 'none') {
    wx.showToast({ title, icon, duration: 2000 });
  },

  /**
   * 显示弹窗
   * @param {string} title - 弹窗标题
   * @param {string} content - 弹窗内容
   */
  showModal(title, content) {
    wx.showModal({
      title,
      content,
      showCancel: false
    });
  }
});
