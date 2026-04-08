App({
  onLaunch: function () {
    this.globalData = {
      userInfo: null,
      openid: null,
      isVerified: false,
      role: null,
      phone: null
    };
    
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        traceUser: true,
      });
      
      this.getOpenid();
    }
  },

  getOpenid: function() {
    wx.cloud.callFunction({
      name: 'quickstartFunctions',
      data: {
        type: 'getOpenId'
      }
    }).then(res => {
      this.globalData.openid = res.result.openid;
      this.checkUserStatus();
    }).catch(err => {
      console.error('获取openid失败', err);
    });
  },

  checkUserStatus: function() {
    const db = wx.cloud.database();
    db.collection('users').where({
      _openid: this.globalData.openid
    }).get().then(res => {
      if (res.data.length > 0) {
        const user = res.data[0];
        this.globalData.isVerified = user.isVerified || false;
        this.globalData.role = user.role || 'staff';
        this.globalData.phone = user.phone || null;
        this.globalData.userInfo = user.userInfo || null;
        
        if (user.isVerified) {
          this.checkAndRedirect();
        }
      } else {
        this.checkAndRedirect();
      }
    }).catch(err => {
      console.error('检查用户状态失败', err);
      this.checkAndRedirect();
    });
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
