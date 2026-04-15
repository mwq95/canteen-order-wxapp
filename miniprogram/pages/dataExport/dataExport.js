const auth = require('../../utils/auth.js');
const initUtil = require('../../utils/initUtil.js');
const { callCloudFunction } = require('../../utils/httpUtil.js');
const dateUtil = require('../../utils/dateUtil.js');

Page({
  data: {
    startDate: '',
    endDate: '',
    exportFormat: 'excel',
    previewData: [],
    loading: false,
    exporting: false,
    canExport: false
  },

  onLoad() {
    this.initDefaultDates();
  },

  async onShow() {
    if (auth.isInitializing()) {
      await initUtil.waitForAppInit();
    }
    auth.checkPageAccess('admin');
  },

  initDefaultDates() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    this.setData({
      startDate: dateUtil.formatDate(startOfMonth),
      endDate: dateUtil.formatDate(endOfMonth),
      canExport: true
    });
  },

  onStartDateChange(e) {
    const startDate = e.detail.value;
    this.setData({ startDate });
    this.checkCanExport();
  },

  onEndDateChange(e) {
    const endDate = e.detail.value;
    this.setData({ endDate });
    this.checkCanExport();
  },

  checkCanExport() {
    const { startDate, endDate } = this.data;
    const canExport = startDate && endDate && startDate <= endDate;
    this.setData({ canExport });
  },

  setFormat(e) {
    const format = e.currentTarget.dataset.format;
    this.setData({ exportFormat: format });
  },

  previewData() {
    if (!this.data.canExport || this.data.loading) return;

    this.setData({ loading: true });

    callCloudFunction('exportFunctions', {
      type: 'previewOrderData',
      startDate: this.data.startDate,
      endDate: this.data.endDate
    }).then(res => {
      this.setData({
        previewData: res.data || [],
        loading: false
      });

      if (res.data && res.data.length === 0) {
        wx.showToast({
          title: '该日期范围内无数据',
          icon: 'none'
        });
      }
    }).catch(err => {
      console.error('预览数据失败', err);
      this.setData({ loading: false });
      wx.showToast({
        title: '预览失败',
        icon: 'none'
      });
    });
  },

  exportData() {
    if (!this.data.canExport || this.data.exporting) return;

    const { startDate, endDate, exportFormat } = this.data;

    wx.showModal({
      title: '确认导出',
      content: `将导出 ${startDate} 至 ${endDate} 的订餐数据，是否继续？`,
      success: res => {
        if (res.confirm) {
          this.doExport();
        }
      }
    });
  },

  doExport() {
    this.setData({ exporting: true });

    const { startDate, endDate, exportFormat } = this.data;

    callCloudFunction('exportFunctions', {
      type: 'exportOrderData',
      startDate,
      endDate,
      format: exportFormat
    }).then(res => {
      this.setData({ exporting: false });

      if (res.success && res.fileID) {
        this.downloadFile(res.fileID);
      } else {
        wx.showToast({
          title: res.error || '导出失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      console.error('导出数据失败', err);
      this.setData({ exporting: false });
      wx.showToast({
        title: '导出失败',
        icon: 'none'
      });
    });
  },

  downloadFile(fileID) {
    wx.showLoading({ title: '下载中...' });

    wx.cloud.downloadFile({
      fileID: fileID
    }).then(res => {
      wx.hideLoading();

      const filePath = res.tempFilePath;
      const { exportFormat } = this.data;
      const fileType = exportFormat === 'excel' ? 'xlsx' : 'csv';

      wx.openDocument({
        filePath: filePath,
        fileType: fileType,
        showMenu: true,
        success: () => {
          wx.showToast({
            title: '文件已打开',
            icon: 'success'
          });
        },
        fail: (err) => {
          console.error('打开文件失败', err);
          wx.showToast({
            title: '请手动保存文件',
            icon: 'none'
          });
        }
      });
    }).catch(err => {
      wx.hideLoading();
      console.error('下载文件失败', err);
      wx.showToast({
        title: '下载失败',
        icon: 'none'
      });
    });
  }
});
