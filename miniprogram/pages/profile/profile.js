const app = getApp();

Page({
  data: {
    userInfo: null,
    isAdmin: false
  },

  onLoad() {
    this.setData({
      isAdmin: app.globalData.isAdmin
    });
    this.getUserInfo();
  },

  onShow() {
    this.setData({
      isAdmin: app.globalData.isAdmin
    });
  },

  getUserInfo() {
    const userInfo = app.globalData.userInfo;
    if (userInfo) {
      this.setData({ userInfo });
    }
  },

  getUserProfile() {
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: res => {
        app.globalData.userInfo = res.userInfo;
        this.setData({
          userInfo: res.userInfo
        });
        this.saveUserInfo(res.userInfo);
      },
      fail: err => {
        console.error('获取用户信息失败', err);
      }
    });
  },

  saveUserInfo(userInfo) {
    const db = wx.cloud.database();
    const openid = app.globalData.openid;
    
    if (!openid) {
      console.error('openid未获取');
      return;
    }
    
    db.collection('users').where({
      _openid: openid
    }).get().then(res => {
      if (res.data.length > 0) {
        db.collection('users').doc(res.data[0]._id).update({
          data: {
            userInfo,
            updateTime: new Date()
          }
        });
      } else {
        db.collection('users').add({
          data: {
            userInfo,
            isAdmin: false,
            createTime: new Date()
          }
        });
      }
    });
  },

  goToAdmin() {
    wx.navigateTo({
      url: '/pages/admin/admin'
    });
  }
});