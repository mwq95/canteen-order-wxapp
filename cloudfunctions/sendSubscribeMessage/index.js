const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { templateId, data, page } = event;

  try {
    const result = await cloud.openapi.subscribeMessage.send({
      touser: wxContext.OPENID,
      page: page || 'pages/order/order',
      data: data,
      templateId: templateId,
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
