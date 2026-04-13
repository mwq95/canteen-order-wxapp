
/**
 * 食堂订餐小程序 - 权限检查工具类
 * 主要功能：
 * 1. 检查用户验证状态
 * 2. 检查用户角色权限
 * 3. 检查页面访问权限
 * 4. 权限不足时的跳转处理
 */
const app = getApp();

const auth = {
  /**
   * 检查用户是否已验证
   * @returns {boolean} 是否已验证
   */
  checkVerified() {
    return app.globalData.isVerified === true;
  },

  /**
   * 检查用户是否已验证（同 checkVerified）
   * @returns {boolean} 是否已验证
   */
  isVerified() {
    return app.globalData.isVerified === true;
  },

  /**
   * 检查用户是否为管理员
   * @returns {boolean} 是否为管理员
   */
  isAdmin() {
    return app.globalData.role === 'admin';
  },

  /**
   * 检查是否正在初始化中
   * @returns {boolean} 是否正在初始化
   */
  isInitializing() {
    return app.globalData.openid === null || app.globalData.isVerified === undefined;
  },

  /**
   * 获取用户角色
   * @returns {string} 用户角色，默认返回 'staff'
   */
  getRole() {
    return app.globalData.role || 'staff';
  },

  /**
   * 检查用户是否有权限访问指定页面类型
   * @param {string} pageType - 页面类型 ('tabbar' | 'userManage' | 其他管理页面)
   * @returns {boolean} 是否有权限访问
   */
  canAccess(pageType) {
    // 未验证用户无权限
    if (!this.checkVerified()) {
      return false;
    }

    const role = this.getRole();

    // tabbar 页面所有验证用户都可访问
    if (pageType === 'tabbar') {
      return true;
    }

    // 用户管理页面只有管理员可访问
    if (pageType === 'userManage') {
      return role === 'admin';
    }

    // 其他管理页面需要 admin 或 kitchen 角色
    return role === 'admin' || role === 'kitchen';
  },

  /**
   * 检查页面访问权限并处理跳转
   * @param {string} pageType - 页面类型
   * @returns {boolean} 是否有权限访问
   */
  checkPageAccess(pageType) {
    // 初始化中，暂时不处理
    if (this.isInitializing()) {
      return false;
    }

    // 未验证，跳转到验证页面
    if (!this.checkVerified()) {
      wx.reLaunch({
        url: '/pages/auth/auth'
      });
      return false;
    }

    // 无权限，提示并跳转到订餐页面
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

    // 有权限访问
    return true;
  }
};

module.exports = auth;

