/*
 * 评价页面 - 用户对菜品进行评价
 */

Page({
  data: {
    // 订单ID
    orderId: '',
    // 订单数据
    orderData: null,
    // 评分数据
    ratings: {},
    // 评论数据
    comments: {},
    // 已评价的项目
    itemEvaluated: {},
    // 已评价的评分
    evaluatedRatings: {},
    // 已评价的评论
    evaluatedComments: {},
    // 查看模式
    viewMode: false
  },

  // 页面加载时调用
  onLoad(options) {
    if (options.orderId) {
      this.setData({ 
        orderId: options.orderId,
        viewMode: options.mode === 'view'
      });
      this.loadOrderData();
    }
  },

  // 加载订单数据
  loadOrderData() {
    const db = wx.cloud.database();
    db.collection('orders').doc(this.data.orderId).get().then(res => {
      this.setData({ orderData: res.data });
      
      const ratings = {};
      const comments = {};
      res.data.dishes.forEach((dish, index) => {
        ratings[index] = 0;
        comments[index] = '';
      });
      this.setData({ ratings, comments });
      
      this.loadExistingEvaluations();
    }).catch(err => {
      console.error('加载订单失败', err);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    });
  },

  // 加载已有评价
  loadExistingEvaluations() {
    const { orderData } = this.data;
    const app = getApp();
    const openid = app.globalData.openid;
    
    if (!orderData || !openid) return;
    
    const db = wx.cloud.database();
    
    db.collection('evaluations').where({
      orderId: this.data.orderId,
      _openid: openid
    }).get().then(res => {
      const itemEvaluated = {};
      const evaluatedRatings = {};
      const evaluatedComments = {};
      
      res.data.forEach(evalItem => {
        const dishIndex = orderData.dishes.findIndex(d => d.name === evalItem.dishName);
        if (dishIndex !== -1) {
          itemEvaluated[dishIndex] = true;
          evaluatedRatings[dishIndex] = evalItem.rating;
          evaluatedComments[dishIndex] = evalItem.comment || '';
        }
      });
      
      this.setData({ itemEvaluated, evaluatedRatings, evaluatedComments });
    }).catch(err => {
      console.error('加载评价失败', err);
    });
  },

  // 星级评分点击
  onStarTap(e) {
    if (this.data.viewMode) return;
    
    const { index, star } = e.currentTarget.dataset;
    
    if (this.data.itemEvaluated[index]) return;
    
    const ratings = { ...this.data.ratings };
    ratings[index] = star;
    this.setData({ ratings });
  },

  // 评论输入
  onCommentInput(e) {
    if (this.data.viewMode) return;
    
    const { index } = e.currentTarget.dataset;
    
    if (this.data.itemEvaluated[index]) return;
    
    const comments = { ...this.data.comments };
    comments[index] = e.detail.value;
    this.setData({ comments });
  },

  // 提交菜品评价
  submitDishEvaluation(e) {
    if (this.data.viewMode) return;
    
    const { index } = e.currentTarget.dataset;
    
    if (this.data.itemEvaluated[index]) {
      wx.showToast({
        title: '该菜品已评价',
        icon: 'none'
      });
      return;
    }
    
    const { orderData, ratings, comments } = this.data;
    const app = getApp();
    const openid = app.globalData.openid;
    
    const dish = orderData.dishes[index];
    const rating = ratings[index];
    
    if (!rating || rating === 0) {
      wx.showToast({
        title: '请为该菜品评分',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({ title: '提交中...' });

    const evaluationData = {
      date: orderData.date,
      mealType: orderData.mealType,
      dishName: dish.name,
      rating: rating,
      comment: comments[index] || '',
      orderId: this.data.orderId
    };

    wx.cloud.callFunction({
      name: 'orderFunctions',
      data: {
        type: 'submitSingleEvaluation',
        evaluation: evaluationData
      }
    }).then(res => {
      wx.hideLoading();
      if (res.result.success) {
        wx.showToast({
          title: '评价成功',
          icon: 'success'
        });
        
        const itemEvaluated = { ...this.data.itemEvaluated };
        const evaluatedRatings = { ...this.data.evaluatedRatings };
        const evaluatedComments = { ...this.data.evaluatedComments };
        
        itemEvaluated[index] = true;
        evaluatedRatings[index] = rating;
        evaluatedComments[index] = comments[index] || '';
        
        this.setData({ itemEvaluated, evaluatedRatings, evaluatedComments });
        
        const allEvaluated = Object.keys(itemEvaluated).length === orderData.dishes.length;
        if (allEvaluated) {
          this.updateOrderEvaluated();
        }
      } else {
        wx.showToast({
          title: res.result.message || '提交失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      wx.hideLoading();
      console.error('提交评价失败', err);
      wx.showToast({
        title: '提交失败',
        icon: 'none'
      });
    });
  },

  // 更新订单评价状态
  updateOrderEvaluated() {
    const db = wx.cloud.database();
    db.collection('orders').doc(this.data.orderId).update({
      data: {
        evaluated: true,
        updateTime: db.serverDate()
      }
    }).catch(err => {
      console.error('更新订单状态失败', err);
    });
  }
});
