const app = getApp();

Page({
  data: {
    thirtyDayRange: '',
    thirtyDayCount: 0,
    totalCount: 0
  },

  onLoad() {
    this.setDateRanges();
    this.loadStats();
  },

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

  async loadStats() {
    await Promise.all([
      this.loadThirtyDayStats(),
      this.loadTotalStats()
    ]);
  },

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

  async loadTotalStats() {
    const db = wx.cloud.database();
    const res = await db.collection('orders')
      .where({
        phone: app.globalData.phone || app.globalData.openid
      })
      .count();

    this.setData({ totalCount: res.total });
  },

  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
});
