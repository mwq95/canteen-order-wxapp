/**
 * 食堂订餐小程序 - 日期工具类
 * 主要功能：
 * 1. 日期格式化（YYYY-MM-DD）
 * 2. 中文日期显示（今天/明天/昨天）
 * 3. 日期比较（是否为过去的日期）
 * 4. 日期计算（前一天/后一天）
 */
const dateUtil = {
  /**
   * 格式化日期为 YYYY-MM-DD 格式
   * @param {Date} date - 日期对象
   * @returns {string} 格式化后的日期字符串
   */
  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  /**
   * 格式化日期为中文显示格式
   * @param {Date} date - 日期对象
   * @returns {string} 中文格式的日期字符串（如：4月3日（今天））
   */
  formatDateChinese(date) {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const d = this.formatDate(date);
    const t = this.formatDate(today);
    const tm = this.formatDate(tomorrow);
    const y = this.formatDate(yesterday);
    
    if (d === t) return `${month}月${day}日（今天）`;
    if (d === tm) return `${month}月${day}日（明天）`;
    if (d === y) return `${month}月${day}日（昨天）`;
    return `${month}月${day}日`;
  },

  /**
   * 格式化日期为短格式中文显示
   * @param {Date} date - 日期对象
   * @returns {string} 短格式中文日期字符串
   */
  formatDateChineseShort(date) {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const d = this.formatDate(date);
    const t = this.formatDate(today);
    const tm = this.formatDate(tomorrow);
    const y = this.formatDate(yesterday);
    
    if (d === t) return `${month}月${day}日（今天）`;
    if (d === tm) return `${month}月${day}日（明天）`;
    if (d === y) return `${month}月${day}日（昨天）`;
    return `${month}月${day}日`;
  },

  /**
   * 判断日期是否为过去的日期
   * @param {string} dateStr - 日期字符串（YYYY-MM-DD）
   * @returns {boolean} 是否为过去的日期
   */
  isPast(dateStr) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    return target < today;
  },

  /**
   * 获取指定日期的前一天
   * @param {string} dateStr - 日期字符串（YYYY-MM-DD）
   * @returns {Date} 前一天的日期对象
   */
  prevDay(dateStr) {
    const date = new Date(dateStr);
    date.setDate(date.getDate() - 1);
    return date;
  },

  /**
   * 获取指定日期的后一天
   * @param {string} dateStr - 日期字符串（YYYY-MM-DD）
   * @returns {Date} 后一天的日期对象
   */
  nextDay(dateStr) {
    const date = new Date(dateStr);
    date.setDate(date.getDate() + 1);
    return date;
  }
};

module.exports = dateUtil;