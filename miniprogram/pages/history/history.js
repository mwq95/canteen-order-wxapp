Page({
  data: {
    orderList: [],
    loading: true
  },

  onLoad() {
    this.loadOrders();
  },

  onShow() {
    this.loadOrders();
  },

  loadOrders() {
    const db = wx.cloud.database();
    db.collection('orders')
      .orderBy('createTime', 'desc')
      .get()
      .then(res => {
        this.setData({
          orderList: res.data,
          loading: false
        });
      })
      .catch(err => {
        console.error('加载订单失败', err);
        this.setData({ loading: false });
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        });
      });
  },

  goToEvaluate(e) {
    const orderId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/evaluate/evaluate?orderId=${orderId}`
    });
  },

  deleteOrder(e) {
    const orderId = e.currentTarget.dataset.id;
    wx.showModal({
      title: '提示',
      content: '确定要删除这个订单吗？',
      success: res => {
        if (res.confirm) {
          const db = wx.cloud.database();
          db.collection('orders').doc(orderId).remove()
            .then(() => {
              wx.showToast({
                title: '删除成功',
                icon: 'success'
              });
              this.loadOrders();
            })
            .catch(err => {
              wx.showToast({
                title: '删除失败',
                icon: 'none'
              });
            });
        }
      }
    });
  },

  onPullDownRefresh() {
    this.loadOrders();
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 1000);
  }
});