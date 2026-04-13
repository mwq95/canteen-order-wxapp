/**
 * 食堂订餐小程序 - 订阅消息发送云函数
 * 主要功能：
 * 发送微信订阅消息给用户
 */
const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

/**
 * 云函数入口
 * @param {Object} event - 事件对象，包含模板ID、消息数据和页面路径
 * @param {Object} context - 上下文对象
 * @returns {Object} 发送结果
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { templateId, data, page } = event;

  try {
    // 发送订阅消息
    const result = await cloud.openapi.subscribeMessage.send({
      touser: wxContext.OPENID,  // 接收消息的用户openid
      page: page || 'pages/order/order',  // 点击消息跳转的页面
      data: data,  // 消息数据
      templateId: templateId,  // 模板ID
    });

    return {
      success: true,
      result: result
    };
  } catch (err) {
    console.error('发送订阅消息失败', err);
    return {
      success: false,
      error: err
    };
  }
};
