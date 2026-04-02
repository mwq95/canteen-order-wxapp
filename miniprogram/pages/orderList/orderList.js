Page({
  data: {
    selectedDate: '',
    orderList: [],
    loading: true
  },

  onLoad() {
    this.initDate();
    this.loadOrders();
  },

  initDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    this.setData({
      selectedDate: `${year}-${month}-${day}`
    });
  },

  onDateChange(e) {
    this.setData({
      selectedDate: e.detail.value,
      loading: true
    });
    this.loadOrders();
  },

  loadOrders() {
    const db = wx.cloud.database();
    const date = this.data.selectedDate;
    
    db.collection('orders').where({ date }).get().then(res => {
      this.setData({
        orderList: res.data,
        loading: false
      });
    }).catch(err => {
      console.error('加载订单失败', err);
      this.setData({ loading: false });
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    });
  },

  markAsCompleted(e) {
    const orderId = e.currentTarget.dataset.id;
    wx.showModal({
      title: '提示',
      content: '确定要标记为已完成吗？',
      success: res => {
        if (res.confirm) {
          const db = wx.cloud.database();
          db.collection('orders').doc(orderId).update({
            data: {
              status: 'completed',
              updateTime: new Date()
            }
          }).then(() => {
            wx.showToast({
              title: '操作成功',
              icon: 'success'
            });
            this.loadOrders();
          }).catch(err => {
            wx.showToast({
              title: '操作失败',
              icon: 'none'
            });
          });
        }
      }
    });
  }
});