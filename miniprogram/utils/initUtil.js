const app = getApp();

const initUtil = {
  waitForAppInit() {
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
    });
  }
};

module.exports = initUtil;
