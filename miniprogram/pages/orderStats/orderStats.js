/*
 * 订单统计页面 - 查看个人订餐统计
 */

const app = getApp();

Page({
  data: {
    // 30天日期范围
    thirtyDayRange: '',
    // 30天订单数
    thirtyDayCount: 0,
    // 总订单数
    totalCount: 0
  },

  // 页面加载时调用
  onLoad() {
    this.setDateRanges();
    this.loadStats();
  },

  // 设置日期范围
  setDateRanges() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const formatDate = (d) => {
      return `${d.getMonth() + 1}/${d.getDate()}`;
    };

    this.setData({
      thirtyDayRange: `${formatDate(thirtyDaysAgo)} ~ ${formatDate(now)}`
    });
  },

  // 加载统计数据
  async loadStats() {
    await Promise.all([
      this.loadThirtyDayStats(),
      this.loadTotalStats()
    ]);
  },

  // 加载30天统计
  async loadThirtyDayStats() {
    const db = wx.cloud.database();
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const res = await db.collection('orders')
      .where({
        phone: app.globalData.phone || app.globalData.openid,
        date: db.command.gte(this.formatDate(thirtyDaysAgo)).and(db.command.lte(this.formatDate(now)))
      })
      .count();

    this.setData({ thirtyDayCount: res.total });
  },

  // 加载总统计
  async loadTotalStats() {
    const db = wx.cloud.database();
    const res = await db.collection('orders')
      .where({
        phone: app.globalData.phone || app.globalData.openid
      })
      .count();

    this.setData({ totalCount: res.total });
  },

  // 格式化日期
  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
});
