const app = getApp();

const initUtil = {
  waitForAppInit() {
    return new Promise((resolve) => {
      if (app.globalData.openid && app.globalData.isVerified) {
        resolve();
        return;
      }

      const checkInterval = setInterval(() => {
        if (app.globalData.openid && app.globalData.isVerified) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);

      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, 5000);
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
      }, 5000);
    });
  }
};

module.exports = initUtil;