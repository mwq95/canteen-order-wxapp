/**
 * 食堂订餐小程序 - 异步初始化工具类
 * 主要功能：
 * 1. 等待应用初始化完成（openid 和 isVerified 都存在）
 * 2. 等待 openid 获取完成
 * 3. 提供 Promise 接口，方便异步操作
 */
const app = getApp();

const initUtil = {
  /**
   * 等待应用初始化完成
   * 等待 openid 和 isVerified 都存在
   * @returns {Promise} 初始化完成的 Promise
   */
  waitForAppInit() {
    return new Promise((resolve) => {
      // 如果已经初始化完成，直接 resolve
      if (app.globalData.openid && app.globalData.isVerified) {
        resolve();
        return;
      }

      // 定时检查初始化状态
      const checkInterval = setInterval(() => {
        if (app.globalData.openid && app.globalData.isVerified) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);

      // 5秒超时后强制 resolve，避免无限等待
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, 5000);
    });
  },

  /**
   * 等待 openid 获取完成
   * @returns {Promise} openid 获取完成的 Promise
   */
  waitForOpenid() {
    return new Promise((resolve) => {
      // 如果已经有 openid，直接 resolve
      if (app.globalData.openid) {
        resolve();
        return;
      }

      // 定时检查 openid 状态
      const checkInterval = setInterval(() => {
        if (app.globalData.openid) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);

      // 5秒超时后强制 resolve，避免无限等待
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, 5000);
    });
  }
};

module.exports = initUtil;