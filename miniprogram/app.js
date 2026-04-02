App({
  onLaunch: function () {
    this.globalData = {
      userInfo: null,
      openid: null,
      isAdmin: false
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
      this.checkIsAdmin();
    }).catch(err => {
      console.error('获取openid失败', err);
    });
  },

  checkIsAdmin: function() {
    const db = wx.cloud.database();
    db.collection('users').where({
      _openid: this.globalData.openid,
      isAdmin: true
    }).get().then(res => {
      if (res.data.length > 0) {
        this.globalData.isAdmin = true;
      }
    }).catch(err => {
      console.error('检查管理员身份失败', err);
    });
  }
});
