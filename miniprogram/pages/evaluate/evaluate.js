Page({
  data: {
    orderId: '',
    orderData: null,
    ratings: {},
    comments: {}
  },

  onLoad(options) {
    if (options.orderId) {
      this.setData({ orderId: options.orderId });
      this.loadOrderData();
    }
  },

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
    }).catch(err => {
      console.error('加载订单失败', err);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    });
  },

  onRatingChange(e) {
    const { index } = e.currentTarget.dataset;
    const { value } = e.detail;
    const ratings = { ...this.data.ratings };
    ratings[index] = value;
    this.setData({ ratings });
  },

  onCommentInput(e) {
    const { index } = e.currentTarget.dataset;
    const comments = { ...this.data.comments };
    comments[index] = e.detail.value;
    this.setData({ comments });
  },

  setRating(e) {
    const { index, star } = e.currentTarget.dataset;
    const ratings = { ...this.data.ratings };
    ratings[index] = star;
    this.setData({ ratings });
  },

  submitEvaluation() {
    const { orderData, ratings, comments } = this.data;
    
    let allRated = true;
    Object.values(ratings).forEach(rating => {
      if (rating === 0) {
        allRated = false;
      }
    });

    if (!allRated) {
      wx.showToast({
        title: '请为所有菜品评分',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({ title: '提交中...' });

    const db = wx.cloud.database();
    const evaluations = orderData.dishes.map((dish, index) => ({
      dishName: dish.name,
      mealType: dish.mealType,
      rating: ratings[index],
      comment: comments[index],
      orderId: this.data.orderId
    }));

    const promises = evaluations.map(evalItem => {
      return db.collection('evaluations').add({
        data: {
          ...evalItem,
          createTime: new Date()
        }
      });
    });

    Promise.all(promises).then(() => {
      return db.collection('orders').doc(this.data.orderId).update({
        data: {
          evaluated: true,
          updateTime: new Date()
        }
      });
    }).then(() => {
      wx.hideLoading();
      wx.showToast({
        title: '评价成功',
        icon: 'success'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }).catch(err => {
      wx.hideLoading();
      wx.showToast({
        title: '提交失败',
        icon: 'none'
      });
    });
  }
});