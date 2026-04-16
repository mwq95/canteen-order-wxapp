/**
 * 食堂订餐小程序 - 配置文件
 * 集中管理订阅消息模板 ID 等配置
 *
 * 使用说明：
 * 1. 复制此文件为 config.js
 * 2. 填写你的微信订阅消息模板 ID
 * 3. 模板ID需要在微信公众平台申请
 */
module.exports = {
  /**
   * 订阅消息模板 ID
   * 请在微信公众平台 - 功能 - 订阅消息 中申请
   */
  templates: {
    mealReminder: 'your-meal-reminder-template-id',
    orderReminder: 'your-order-reminder-template-id'
  },

  /**
   * 获取用餐提醒模板 ID
   * @returns {string} 模板 ID
   */
  getMealReminderTemplateId() {
    return this.templates.mealReminder;
  },

  /**
   * 获取订餐提醒模板 ID
   * @returns {string} 模板 ID
   */
  getOrderReminderTemplateId() {
    return this.templates.orderReminder;
  },

  /**
   * 获取订阅消息模板 ID（兼容旧接口）
   * @returns {string} 订阅消息模板 ID
   */
  getSubscribeMessageTemplateId() {
    return this.templates.mealReminder;
  }
};
