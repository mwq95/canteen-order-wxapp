/**
 * 食堂订餐小程序 - 配置文件
 * 主要用于配置订阅消息模板 ID
 */
module.exports = {
  /**
   * 订阅消息模板 ID
   * 用于发送订餐成功通知等消息
   */
  subscribeMessageTemplateId: 'tZAu7qUAcWS1T6d99m7elTaOkFZpi2VudxQu5pqxM70',
  
  /**
   * 获取订阅消息模板 ID
   * @returns {string} 订阅消息模板 ID
   */
  getSubscribeMessageTemplateId() {
    return this.subscribeMessageTemplateId;
  }
};