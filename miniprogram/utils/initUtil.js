
const app = getApp();

const initUtil = {
  waitForAppInit() {
    return new Promise((resolve) =&gt; {
      if (app.globalData.openid &amp;&amp; app.globalData.isVerified) {
        resolve();
        return;
      }

      const checkInterval = setInterval(() =&gt; {
        if (app.globalData.openid &amp;&amp; app.globalData.isVerified) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);

      setTimeout(() =&gt; {
        clearInterval(checkInterval);
        resolve();
      }, 5000);
    });
  },

  waitForOpenid() {
    return new Promise((resolve) =&gt; {
      if (app.globalData.openid) {
        resolve();
        return;
      }

      const checkInterval = setInterval(() =&gt; {
        if (app.globalData.openid) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);

      setTimeout(() =&gt; {
        clearInterval(checkInterval);
        resolve();
      }, 5000);
    });
  }
};

module.exports = initUtil;

