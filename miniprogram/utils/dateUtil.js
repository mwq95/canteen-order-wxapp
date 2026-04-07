const dateUtil = {
  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

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

  isPast(dateStr) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    return target < today;
  },

  prevDay(dateStr) {
    const date = new Date(dateStr);
    date.setDate(date.getDate() - 1);
    return date;
  },

  nextDay(dateStr) {
    const date = new Date(dateStr);
    date.setDate(date.getDate() + 1);
    return date;
  }
};

module.exports = dateUtil;
