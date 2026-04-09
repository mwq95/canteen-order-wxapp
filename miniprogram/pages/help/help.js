const auth = require('../../utils/auth.js');

Page({
  data: {
    showKitchen: false,
    showAdmin: false
  },

  onLoad() {
    const role = auth.getRole();
    this.setData({
      showKitchen: role === 'admin' || role === 'kitchen',
      showAdmin: role === 'admin'
    });
  }
});
