const { callCloudFunction } = require('../../utils/httpUtil.js');

const PAGE_SIZE = 15;

Page({
  data: {
    list: [],
    loading: true,
    loadingMore: false,
    hasMore: true,
    page: 1,
    total: 0
  },

  onLoad() {
    this.loadFeedbackList();
  },

  async loadFeedbackList() {
    this.setData({ loading: true });

    try {
      const res = await callCloudFunction('userFunctions', {
        type: 'getFeedbackList',
        page: 1,
        pageSize: PAGE_SIZE
      });

      if (res.success) {
        const { list, total, hasMore } = res.data;
        this.setData({
          list: this.formatList(list),
          total,
          hasMore,
          page: 1,
          loading: false
        });
      } else {
        wx.showToast({
          title: res.error || '加载失败',
          icon: 'none'
        });
        this.setData({ loading: false });
      }
    } catch (e) {
      console.error('加载意见建议列表失败', e);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
      this.setData({ loading: false });
    }
  },

  async loadMore() {
    const { loadingMore, hasMore, page, list } = this.data;

    if (loadingMore || !hasMore) return;

    this.setData({ loadingMore: true });

    try {
      const nextPage = page + 1;
      const res = await callCloudFunction('userFunctions', {
        type: 'getFeedbackList',
        page: nextPage,
        pageSize: PAGE_SIZE
      });

      if (res.success) {
        const { list: newList, hasMore: newHasMore } = res.data;
        this.setData({
          list: [...list, ...this.formatList(newList)],
          page: nextPage,
          hasMore: newHasMore,
          loadingMore: false
        });
      } else {
        this.setData({ loadingMore: false });
      }
    } catch (e) {
      console.error('加载更多失败', e);
      this.setData({ loadingMore: false });
    }
  },

  formatList(list) {
    return list.map(item => ({
      ...item,
      timeStr: this.formatTime(item.createTime)
    }));
  },

  formatTime(date) {
    if (!date) return '';
    const d = new Date(date);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hour = String(d.getHours()).padStart(2, '0');
    const minute = String(d.getMinutes()).padStart(2, '0');
    return `${month}-${day} ${hour}:${minute}`;
  },

  async onPullDownRefresh() {
    await this.loadFeedbackList();
    wx.stopPullDownRefresh();
  },

  onReachBottom() {
    this.loadMore();
  }
});
