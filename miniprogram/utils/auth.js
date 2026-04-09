const app = getApp();

const auth = {
  checkVerified() {
    return app.globalData.isVerified === true;
  },

  isInitializing() {
    return app.globalData.openid === null || app.globalData.isVerified === undefined;
  },

  getRole() {
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
    if (this.isInitializing()) {
      return false;
    }

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
          url: '/pages/order/order'
        });
      }, 2000);
      return false;
    }

    return true;
  }
};

module.exports = auth;