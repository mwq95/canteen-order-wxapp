const { callCloudFunction } = require('../../utils/httpUtil.js');

Page({
  data: {
    content: '',
    submitting: false
  },

  onInputChange(e) {
    this.setData({
      content: e.detail.value
    });
  },

  async submitFeedback() {
    const { content, submitting } = this.data;

    if (submitting) return;

    if (!content || !content.trim()) {
      wx.showToast({
        title: '请输入意见建议',
        icon: 'none'
      });
      return;
    }

    if (content.length > 500) {
      wx.showToast({
        title: '内容不能超过500字',
        icon: 'none'
      });
      return;
    }

    this.setData({ submitting: true });

    try {
      const res = await callCloudFunction('userFunctions', {
        type: 'submitFeedback',
        content: content.trim()
      });

      if (res.success) {
        wx.showToast({
          title: '提交成功',
          icon: 'success'
        });

        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else {
        wx.showToast({
          title: res.error || '提交失败',
          icon: 'none'
        });
      }
    } catch (e) {
      console.error('提交意见建议失败', e);
      wx.showToast({
        title: '提交失败，请稍后重试',
        icon: 'none'
      });
    } finally {
      this.setData({ submitting: false });
    }
  }
});
