const dateUtil = require('../../utils/dateUtil.js');

Page({
  data: {
    selectedDate: '',
    selectedDateStr: '',
    statistics: null,
    evalStats: null,
    loading: true,
    showCommentModal: false,
    currentComments: [],
    currentDishName: ''
  },

  onLoad() {
    this.initDate();
    this.loadStatistics();
  },

  initDate() {
    const now = new Date();
    this.setData({
      selectedDate: dateUtil.formatDate(now),
      selectedDateStr: dateUtil.formatDateChinese(now)
    });
  },

  prevDay() {
    const current = dateUtil.prevDay(this.data.selectedDate);
    this.setData({
      selectedDate: dateUtil.formatDate(current),
      selectedDateStr: dateUtil.formatDateChinese(current),
      loading: true
    });
    this.loadStatistics();
  },

  nextDay() {
    const current = dateUtil.nextDay(this.data.selectedDate);
    this.setData({
      selectedDate: dateUtil.formatDate(current),
      selectedDateStr: dateUtil.formatDateChinese(current),
      loading: true
    });
    this.loadStatistics();
  },

  loadStatistics() {
    const date = this.data.selectedDate;

    Promise.all([
      wx.cloud.callFunction({
        name: 'orderFunctions',
        data: { type: 'getStatistics', date }
      }),
      wx.cloud.callFunction({
        name: 'orderFunctions',
        data: { type: 'getEvaluationStatistics', date }
      })
    ]).then(([orderRes, evalRes]) => {
      if (orderRes.result.success) {
        this.setData({ statistics: orderRes.result.data });
      }
      if (evalRes.result.success) {
        this.setData({ evalStats: evalRes.result.data });
      }
      this.setData({ loading: false });
    }).catch(err => {
      console.error('加载统计数据失败', err);
      this.setData({ loading: false });
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    });
  },

  viewComments(e) {
    const { comments, dishname } = e.currentTarget.dataset;
    this.setData({
      showCommentModal: true,
      currentComments: comments,
      currentDishName: dishname
    });
  },

  closeCommentModal() {
    this.setData({
      showCommentModal: false,
      currentComments: [],
      currentDishName: ''
    });
  },

  stopPropagation() {}
});
