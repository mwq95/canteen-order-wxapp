
/**
 * 食堂订餐小程序 - 应用入口文件
 * 主要功能：
 * 1. 初始化云开发环境
 * 2. 获取用户 openid
 * 3. 检查用户状态和权限
 * 4. 根据验证状态跳转页面
 */
const { callCloudFunction } = require('./utils/httpUtil.js');

App({
  globalData: {
    userInfo: null,
    openid: null,
    isVerified: undefined,
    role: null,
    phone: null,
    name: null,
    subscribeOrderReminder: false,
    subscribeMealReminder: false,
    orderVersion: 0,
    _initializing: false,
    _initCallbacks: []
  },

  onLaunch: function () {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        traceUser: true,
      });
      this.getOpenid();
    }
  },

  getOpenid: async function() {
    if (this.globalData._initializing) return;
    this.globalData._initializing = true;

    try {
      const res = await callCloudFunction('userFunctions', {
        type: 'getOpenId'
      });
      
      if (res && res.openid) {
        this.globalData.openid = res.openid;
        await this.checkUserStatus();
      } else {
        console.error('获取openid返回数据异常', res);
        this.globalData.isVerified = false;
        this.notifyInitComplete();
      }
    } catch (err) {
      console.error('获取openid失败', err);
      this.globalData.isVerified = false;
      this.notifyInitComplete();
    } finally {
      this.globalData._initializing = false;
    }
  },

  checkUserStatus: function() {
    return new Promise((resolve) => {
      const db = wx.cloud.database();
      db.collection('users').where({
        _openid: this.globalData.openid
      }).get().then(res => {
        if (res.data.length > 0) {
          const user = res.data[0];
          this.globalData.isVerified = user.isVerified || false;
          this.globalData.role = user.role || 'staff';
          this.globalData.phone = user.phone || null;
          this.globalData.name = user.name || null;
          this.globalData.userInfo = user.userInfo || null;
          this.globalData.subscribeOrderReminder = user.subscribeOrderReminder !== false;
          this.globalData.subscribeMealReminder = user.subscribeMealReminder !== false;
        } else {
          this.globalData.isVerified = false;
        }
        this.notifyInitComplete();
        resolve();
      }).catch(err => {
        console.error('检查用户状态失败', err);
        this.globalData.isVerified = false;
        this.notifyInitComplete();
        resolve();
      });
    });
  },

  notifyInitComplete: function() {
    this.globalData._initCallbacks.forEach(cb => cb());
    this.globalData._initCallbacks = [];
  },

  onInitComplete: function(callback) {
    if (this.globalData.openid && this.globalData.isVerified !== undefined) {
      callback();
    } else {
      this.globalData._initCallbacks.push(callback);
    }
  },

  notifyOrderChange: function() {
    this.globalData.orderVersion++;
  },

  checkAndRedirect: function() {
    if (!this.globalData.isVerified) {
      const pages = getCurrentPages();
      if (pages.length === 0 || pages[pages.length - 1].route !== 'pages/auth/auth') {
        wx.reLaunch({
          url: '/pages/auth/auth'
        });
      }
    }
  }
});

