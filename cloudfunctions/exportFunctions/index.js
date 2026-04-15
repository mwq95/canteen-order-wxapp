const cloud = require("wx-server-sdk");
const ExcelJS = require("exceljs");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();
const _ = db.command;

const checkIsAdmin = async (openid) => {
  const userRes = await db.collection('users').where({
    _openid: openid
  }).get();
  if (userRes.data.length > 0) {
    return userRes.data[0].role === 'admin';
  }
  return false;
};

const getOrderData = async (startDate, endDate) => {
  try {
    const res = await db.collection('orders')
      .where({
        date: _.gte(startDate).and(_.lte(endDate))
      })
      .orderBy('date', 'asc')
      .orderBy('createTime', 'asc')
      .get();

    const orders = res.data;
    const result = [];

    for (const order of orders) {
      const userRes = await db.collection('users').doc(order.userId).get();
      const userName = userRes.data ? userRes.data.name : '未知用户';

      for (const meal of order.meals || []) {
        const dishNames = (meal.dishes || []).map(d => d.name).join('、');
        result.push({
          date: order.date,
          mealType: meal.type,
          userName: userName,
          dishes: dishNames,
          createTime: order.createTime
        });
      }
    }

    return { success: true, data: result };
  } catch (e) {
    console.error('获取订单数据失败', e);
    return { success: false, error: '获取数据失败' };
  }
};

const previewOrderData = async (startDate, endDate) => {
  const result = await getOrderData(startDate, endDate);
  if (!result.success) {
    return result;
  }

  const previewData = result.data.slice(0, 10);
  return { success: true, data: previewData, total: result.data.length };
};

const generateExcel = async (data, startDate, endDate) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('订餐数据');

    worksheet.columns = [
      { header: '日期', key: 'date', width: 15 },
      { header: '餐次', key: 'mealType', width: 10 },
      { header: '姓名', key: 'userName', width: 15 },
      { header: '菜品', key: 'dishes', width: 40 }
    ];

    worksheet.getRow(1).font = { bold: true, size: 12 };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6F7FF' }
    };

    data.forEach(item => {
      worksheet.addRow(item);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return { success: true, buffer };
  } catch (e) {
    console.error('生成Excel失败', e);
    return { success: false, error: '生成Excel失败' };
  }
};

const generateCSV = (data) => {
  try {
    const headers = ['日期', '餐次', '姓名', '菜品'];
    const rows = data.map(item => [
      item.date,
      item.mealType,
      item.userName,
      item.dishes
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const buffer = Buffer.from('\uFEFF' + csvContent, 'utf-8');
    return { success: true, buffer };
  } catch (e) {
    console.error('生成CSV失败', e);
    return { success: false, error: '生成CSV失败' };
  }
};

const exportOrderData = async (startDate, endDate, format) => {
  const dataResult = await getOrderData(startDate, endDate);
  if (!dataResult.success) {
    return dataResult;
  }

  if (dataResult.data.length === 0) {
    return { success: false, error: '该日期范围内无数据' };
  }

  let generateResult;
  let fileExtension;
  let contentType;

  if (format === 'excel') {
    generateResult = await generateExcel(dataResult.data, startDate, endDate);
    fileExtension = 'xlsx';
    contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  } else {
    generateResult = generateCSV(dataResult.data);
    fileExtension = 'csv';
    contentType = 'text/csv';
  }

  if (!generateResult.success) {
    return generateResult;
  }

  try {
    const fileName = `订餐数据_${startDate}_${endDate}.${fileExtension}`;
    const filePath = `exports/${Date.now()}_${fileName}`;

    const uploadResult = await cloud.uploadFile({
      cloudPath: filePath,
      fileContent: generateResult.buffer
    });

    return {
      success: true,
      fileID: uploadResult.fileID,
      fileName: fileName
    };
  } catch (e) {
    console.error('上传文件失败', e);
    return { success: false, error: '上传文件失败' };
  }
};

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  const isAdmin = await checkIsAdmin(openid);
  if (!isAdmin) {
    return { success: false, error: '您没有权限导出数据' };
  }

  const { startDate, endDate } = event;

  if (!startDate || !endDate) {
    return { success: false, error: '请选择日期范围' };
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffDays = (end - start) / (1000 * 60 * 60 * 24);

  if (diffDays > 31) {
    return { success: false, error: '单次导出最多支持31天的数据' };
  }

  switch (event.type) {
    case "previewOrderData":
      return await previewOrderData(startDate, endDate);
    case "exportOrderData":
      return await exportOrderData(startDate, endDate, event.format || 'excel');
    default:
      return { success: false, error: '未知操作类型' };
  }
};
