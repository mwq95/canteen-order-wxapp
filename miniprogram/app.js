
/**
 * 食堂订餐小程序 - 应用入口文件
 * 主要功能：
 * 1. 初始化云开发环境
 * 2. 获取用户 openid
 * 3. 检查用户状态和权限
 * 4. 根据验证状态跳转页面
 */
App({
  /**
   * 应用启动时执行
   * 初始化全局数据和云开发环境
   */
  onLaunch: function () {
    // 初始化全局数据
    this.globalData = {
      userInfo: null,           // 微信用户信息
      openid: null,             // 用户唯一标识
      isVerified: false,        // 是否已通过身份验证
      role: null,               // 用户角色 (staff/admin/kitchen)
      phone: null,              // 用户手机号
      name: null,               // 用户名
      subscribeOrderReminder: false, // 订餐提醒开关
      subscribeMealReminder: false   // 用餐提醒开关
    };
    
    // 检查云开发是否可用
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      // 初始化云开发环境
      wx.cloud.init({
        traceUser: true,  // 开启用户访问日志
      });
      
      // 获取用户 openid
      this.getOpenid();
    }
  },

  /**
   * 获取用户 openid
   * 通过云函数获取用户的唯一标识
   */
  getOpenid: function() {
    wx.cloud.callFunction({
      name: 'quickstartFunctions',  // 云函数名称
      data: {
        type: 'getOpenId'  // 调用类型
      }
    }).then(res => {
      // 保存 openid 到全局数据
      this.globalData.openid = res.result.openid;
      // 检查用户状态
      this.checkUserStatus();
    }).catch(err => {
      console.error('获取openid失败', err);
    });
  },

  /**
   * 检查用户状态
   * 从数据库获取用户信息并更新全局数据
   */
  checkUserStatus: function() {
    const db = wx.cloud.database();
    db.collection('users').where({
      _openid: this.globalData.openid  // 根据 openid 查询用户
    }).get().then(res => {
      if (res.data.length > 0) {
        // 用户存在，更新全局数据
        const user = res.data[0];
        this.globalData.isVerified = user.isVerified || false;
        this.globalData.role = user.role || 'staff';
        this.globalData.phone = user.phone || null;
        this.globalData.name = user.name || null;
        this.globalData.userInfo = user.userInfo || null;
        this.globalData.subscribeOrderReminder = user.subscribeOrderReminder !== false;
        this.globalData.subscribeMealReminder = user.subscribeMealReminder !== false;
        
        // 如果已验证，检查是否需要跳转
        if (user.isVerified) {
          this.checkAndRedirect();
        }
      } else {
        // 用户不存在，跳转到验证页面
        this.checkAndRedirect();
      }
    }).catch(err => {
      console.error('检查用户状态失败', err);
      // 出错时也跳转到验证页面
      this.checkAndRedirect();
    });
  },

  /**
   * 检查并跳转到验证页面
   * 如果用户未验证且当前不在验证页面，则跳转到验证页面
   */
  checkAndRedirect: function() {
    if (!this.globalData.isVerified) {
      const pages = getCurrentPages();
      // 检查当前是否已经在验证页面
      if (pages.length === 0 || pages[pages.length - 1].route !== 'pages/auth/auth') {
        wx.reLaunch({
          url: '/pages/auth/auth'
        });
      }
    }
  }
});

