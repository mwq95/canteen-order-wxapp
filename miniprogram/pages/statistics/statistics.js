/*
 * 统计页面 - 查看评价统计数据
 */

const dateUtil = require('../../utils/dateUtil.js');

Page({
  data: {
    selectedDate: '',
    evalStats: null,
    // 加载状态
    loading: true,
    // 是否显示评论弹窗
    showCommentModal: false,
    // 当前评论列表
    currentComments: [],
    // 当前菜品名称
    currentDishName: ''
  },

  // 页面加载时调用
  onLoad() {
    this.initDate();
    this.loadStatistics();
  },

  initDate() {
    const now = new Date();
    this.setData({
      selectedDate: dateUtil.formatDate(now)
    });
  },

  onDateChange(e) {
    const { date } = e.detail;
    this.setData({
      selectedDate: date,
      loading: true
    });
    this.loadStatistics();
  },

  // 加载统计数据
  loadStatistics() {
    const date = this.data.selectedDate;

    wx.cloud.callFunction({
      name: 'orderFunctions',
      data: { type: 'getEvaluationStatistics', date }
    }).then(res => {
      if (res.result.success) {
        this.setData({ evalStats: res.result.data });
      }
      this.setData({ loading: false });
    }).catch(err => {
      console.error('加载评价数据失败', err);
      this.setData({ loading: false });
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    });
  },

  // 查看评论
  viewComments(e) {
    const { comments, dishname } = e.currentTarget.dataset;
    this.setData({
      showCommentModal: true,
      currentComments: comments,
      currentDishName: dishname
    });
  },

  // 关闭评论弹窗
  closeCommentModal() {
    this.setData({
      showCommentModal: false,
      currentComments: [],
      currentDishName: ''
    });
  },

  // 阻止事件冒泡
  stopPropagation() {}
});
