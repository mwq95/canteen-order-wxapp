const dateUtil = require('../../utils/dateUtil.js');

Component({
  properties: {
    date: {
      type: String,
      value: ''
    },
    formatType: {
      type: String,
      value: 'full'
    }
  },

  data: {
    dateStr: ''
  },

  observers: {
    'date, formatType': function(date, formatType) {
      if (date) {
        this.updateDateStr(date, formatType);
      }
    }
  },

  methods: {
    updateDateStr(date, formatType) {
      const dateObj = new Date(date);
      let dateStr = '';
      
      if (formatType === 'short') {
        dateStr = dateUtil.formatDateChineseShort(dateObj);
      } else {
        dateStr = dateUtil.formatDateChinese(dateObj);
      }
      
      this.setData({ dateStr });
    },

    prevDay() {
      const current = dateUtil.prevDay(this.data.date);
      const newDate = dateUtil.formatDate(current);
      this.triggerEvent('change', { date: newDate, direction: 'prev' });
    },

    nextDay() {
      const current = dateUtil.nextDay(this.data.date);
      const newDate = dateUtil.formatDate(current);
      this.triggerEvent('change', { date: newDate, direction: 'next' });
    },

    onDatePick(e) {
      const newDate = e.detail.value;
      this.triggerEvent('change', { date: newDate, direction: 'pick' });
    }
  }
});
