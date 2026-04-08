const auth = {
  checkVerified() {
    const app = getApp();
    return app.globalData.isVerified === true;
  },

  getRole() {
    const app = getApp();
    return app.globalData.role || 'staff';
  },

  canAccess(pageType) {
    if (!this.checkVerified()) {
      return false;
    }

    const role = this.getRole();

    if (pageType === 'tabbar') {
      return true;
    }

    if (pageType === 'userManage') {
      return role === 'admin';
    }

    return role === 'admin' || role === 'kitchen';
  },

  checkPageAccess(pageType) {
    if (!this.checkVerified()) {
      wx.reLaunch({
        url: '/pages/auth/auth'
      });
      return false;
    }

    if (!this.canAccess(pageType)) {
      wx.showToast({
        title: '您没有权限访问此页面',
        icon: 'none',
        duration: 2000
      });
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/index/index'
        });
      }, 2000);
      return false;
    }

    return true;
  }
};

module.exports = auth;
