/**
 * 食堂订餐小程序 - 异步初始化工具类
 */
const app = getApp();

const initUtil = {
  waitForAppInit() {
    return new Promise((resolve) => {
      if (app.globalData.openid && app.globalData.isVerified !== undefined) {
        resolve();
        return;
      }

      const checkInterval = setInterval(() => {
        if (app.globalData.openid && app.globalData.isVerified !== undefined) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);

      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, 10000);
    });
  },

  waitForOpenid() {
    return new Promise((resolve) => {
      if (app.globalData.openid) {
        resolve();
        return;
      }

      const checkInterval = setInterval(() => {
        if (app.globalData.openid) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);

      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, 10000);
    });
  },

  isInitializing() {
    return !app.globalData.openid || app.globalData.isVerified === undefined;
  }
};

module.exports = initUtil;
