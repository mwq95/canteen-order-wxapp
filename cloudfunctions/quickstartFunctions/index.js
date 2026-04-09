const cloud = require("wx-server-sdk");
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

const getOpenId = async () => {
  const wxContext = cloud.getWXContext();
  return {
    openid: wxContext.OPENID,
    appid: wxContext.APPID,
    unionid: wxContext.UNIONID,
  };
};

const getPhoneNumber = async (event) => {
  try {
    const result = await cloud.getOpenData({
      list: [event.code],
    });
    return {
      phoneNumber: result.list[0].data.phoneNumber
    };
  } catch (e) {
    console.error('获取手机号失败', e);
    return {
      phoneNumber: null
    };
  }
};

const checkIsAdmin = async (openid) => {
  const userRes = await db.collection('users').where({
    _openid: openid
  }).get();
  if (userRes.data.length > 0) {
    return userRes.data[0].role === 'admin';
  }
  return false;
};

const getStaffList = async () => {
  return await db.collection('staffs').orderBy('createTime', 'desc').get();
};

const addStaff = async (event, openid) => {
  const isAdmin = await checkIsAdmin(openid);
  if (!isAdmin) {
    return { success: false, error: '您没有权限操作' };
  }

  return await db.collection('staffs').add({
    data: event.data
  });
};

const updateStaff = async (event, openid) => {
  const isAdmin = await checkIsAdmin(openid);
  if (!isAdmin) {
    return { success: false, error: '您没有权限操作' };
  }

  return await db.collection('staffs').doc(event.id).update({
    data: event.data
  });
};

const deleteStaff = async (event, openid) => {
  const isAdmin = await checkIsAdmin(openid);
  if (!isAdmin) {
    return { success: false, error: '您没有权限操作' };
  }

  return await db.collection('staffs').doc(event.id).remove()
  // .update({
  //   data: {
  //     status: 'inactive',
  //     updateTime: new Date()
  //   }
  // });
};

const getMiniProgramCode = async () => {
  const resp = await cloud.openapi.wxacode.get({
    path: "pages/order/order",
  });
  const { buffer } = resp;
  const upload = await cloud.uploadFile({
    cloudPath: "code.png",
    fileContent: buffer,
  });
  return upload.fileID;
};

const createCanteenCollections = async () => {
  try {
    await db.createCollection("menus");
    await db.createCollection("orders");
    await db.createCollection("evaluations");
    await db.createCollection("users");
    await db.createCollection("configs");
    await db.createCollection("staffs");

    await db.collection("configs").add({
      data: {
        key: "order_deadline",
        breakfast_deadline: "08:00",
        lunch_deadline: "12:00",
        dinner_deadline: "17:00",
        updateTime: new Date()
      }
    });

    return {
      success: true,
    };
  } catch (e) {
    return {
      success: true,
      data: "create collection success",
    };
  }
};

const updateDeadlineConfig = async (event, openid) => {
  const isAuthorized = await checkIsAdminOrKitchen(openid);
  if (!isAuthorized) {
    return { success: false, error: '您没有权限修改设置' };
  }

  const { 
    breakfast_deadline, lunch_deadline, dinner_deadline,
    breakfast_meal_start, lunch_meal_start, dinner_meal_start
  } = event.data;

  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  const allTimes = [breakfast_deadline, lunch_deadline, dinner_deadline, breakfast_meal_start, lunch_meal_start, dinner_meal_start];
  for (const t of allTimes) {
    if (!t || !timeRegex.test(t)) {
      return { success: false, error: '时间格式不正确' };
    }
  }

  try {
    const configRes = await db.collection('configs').where({ key: 'order_deadline' }).get();
    
    const updateData = {
      breakfast_deadline,
      lunch_deadline,
      dinner_deadline,
      breakfast_meal_start: breakfast_meal_start || '08:00',
      lunch_meal_start: lunch_meal_start || '12:00',
      dinner_meal_start: dinner_meal_start || '17:30',
      updateTime: new Date()
    };

    if (configRes.data.length > 0) {
      await db.collection('configs').doc(configRes.data[0]._id).update({
        data: updateData
      });
    } else {
      await db.collection('configs').add({
        data: {
          key: 'order_deadline',
          ...updateData
        }
      });
    }

    return { success: true };
  } catch (e) {
    console.error('更新配置失败', e);
    return { success: false, error: '保存失败：' + (e.errMsg || e.message) };
  }
};

const getDeadlineConfig = async () => {
  try {
    const res = await db.collection('configs').where({ key: 'order_deadline' }).get();
    if (res.data.length > 0) {
      const cfg = res.data[0];
      return {
        success: true,
        data: {
          breakfast: cfg.breakfast_deadline || '08:00',
          lunch: cfg.lunch_deadline || '12:00',
          dinner: cfg.dinner_deadline || '17:00',
          breakfastMealStart: cfg.breakfast_meal_start || '08:00',
          lunchMealStart: cfg.lunch_meal_start || '12:00',
          dinnerMealStart: cfg.dinner_meal_start || '17:30'
        }
      };
    }
    return {
      success: true,
      data: {
        breakfast: '08:00', lunch: '12:00', dinner: '17:00',
        breakfastMealStart: '08:00', lunchMealStart: '12:00', dinnerMealStart: '17:30'
      }
    };
  } catch (e) {
    console.error('获取配置失败', e);
    return {
      success: true,
      data: {
        breakfast: '08:00', lunch: '12:00', dinner: '17:00',
        breakfastMealStart: '08:00', lunchMealStart: '12:00', dinnerMealStart: '17:30'
      }
    };
  }
};

const cancelOrder = async (event, openid) => {
  const { orderId, phone } = event;

  if (!orderId) {
    return { success: false, error: '缺少订单ID' };
  }

  try {
    const orderRes = await db.collection('orders').doc(orderId).get();
    
    if (!orderRes.data || orderRes.data.length === 0) {
      return { success: false, error: '订单不存在' };
    }

    const order = orderRes.data;

    if (order.phone !== phone) {
      return { success: false, error: '无权操作此订单' };
    }

    if (order.status === 'cancelled') {
      return { success: false, error: '该订单已取消' };
    }

    if (order.status === 'completed') {
      return { success: false, error: '该订单已完成，无法取消' };
    }

    const deadlineRes = await db.collection('configs').where({ key: 'order_deadline' }).get();
    const deadlineMap = {
      '早餐': '08:00',
      '午餐': '12:00',
      '晚餐': '17:00'
    };

    if (deadlineRes.data.length > 0) {
      const cfg = deadlineRes.data[0];
      deadlineMap['早餐'] = cfg.breakfast_deadline || '08:00';
      deadlineMap['午餐'] = cfg.lunch_deadline || '12:00';
      deadlineMap['晚餐'] = cfg.dinner_deadline || '17:00';
    }

    const deadline = deadlineMap[order.mealType];
    const now = new Date();
    const orderDate = new Date(order.date + 'T00:00:00');
    const [deadlineHour, deadlineMinute] = deadline.split(':').map(Number);
    const deadlineTime = new Date(orderDate);
    deadlineTime.setHours(deadlineHour, deadlineMinute, 0, 0);

    if (now > deadlineTime) {
      return { 
        success: false, 
        error: `已过${order.mealType}订餐截止时间（${deadline}），无法取消预约` 
      };
    }

    await db.collection('orders').doc(orderId).update({
      data: {
        status: 'cancelled',
        updateTime: new Date()
      }
    });

    return { success: true };
  } catch (e) {
    console.error('取消订单失败', e);
    return { success: false, error: '取消失败：' + (e.errMsg || e.message) };
  }
};

const selectRecord = async () => {
  return await db.collection("sales").get();
};

const updateRecord = async (event) => {
  try {
    for (let i = 0; i < event.data.length; i++) {
      await db
        .collection("sales")
        .where({
          _id: event.data[i]._id,
        })
        .update({
          data: {
            sales: event.data[i].sales,
          },
        });
    }
    return {
      success: true,
      data: event.data,
    };
  } catch (e) {
    return {
      success: false,
      errMsg: e,
    };
  }
};

const insertRecord = async (event) => {
  try {
    const insertRecord = event.data;
    await db.collection("sales").add({
      data: {
        region: insertRecord.region,
        city: insertRecord.city,
        sales: Number(insertRecord.sales),
      },
    });
    return {
      success: true,
      data: event.data,
    };
  } catch (e) {
    return {
      success: false,
      errMsg: e,
    };
  }
};

const deleteRecord = async (event) => {
  try {
    await db
      .collection("sales")
      .where({
        _id: event.data._id,
      })
      .remove();
    return {
      success: true,
    };
  } catch (e) {
    return {
      success: false,
      errMsg: e,
    };
  }
};

const getOrderStats = async (event, openid) => {
  const { phone } = event;
  const userKey = phone || openid;

  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const [thirtyDayRes, totalRes] = await Promise.all([
      db.collection('orders')
        .where({
          phone: userKey,
          date: db.command.gte(formatDate(thirtyDaysAgo)).and(db.command.lte(formatDate(now)))
        })
        .count(),
      db.collection('orders')
        .where({ phone: userKey })
        .count()
    ]);

    return {
      success: true,
      data: {
        thirtyDay: thirtyDayRes.total,
        total: totalRes.total
      }
    };
  } catch (e) {
    console.error('获取统计失败', e);
    return { success: false, error: '获取统计失败' };
  }
};

const checkIsAdminOrKitchen = async (openid) => {
  const userRes = await db.collection('users').where({
    _openid: openid
  }).get();
  if (userRes.data.length > 0) {
    const role = userRes.data[0].role;
    return role === 'admin' || role === 'kitchen';
  }
  return false;
};

const saveMenu = async (event, openid) => {
  const isAuthorized = await checkIsAdminOrKitchen(openid);
  if (!isAuthorized) {
    return { success: false, error: '您没有权限修改菜单' };
  }

  const { date, meals } = event;

  if (!date || !meals || !Array.isArray(meals)) {
    return { success: false, error: '参数错误' };
  }

  try {
    const existing = await db.collection('menus').where({ date }).get();
    if (existing.data.length > 0) {
      await db.collection('menus').doc(existing.data[0]._id).update({
        data: { meals, updateTime: new Date() }
      });
    } else {
      await db.collection('menus').add({
        data: { date, meals, createTime: new Date(), updateTime: new Date() }
      });
    }
    return { success: true };
  } catch (e) {
    console.error('保存菜单失败', e);
    return { success: false, error: '保存失败：' + (e.errMsg || e.message) };
  }
};

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  switch (event.type) {
    case "getOpenId":
      return await getOpenId();
    case "getPhoneNumber":
      return await getPhoneNumber(event);
    case "getStaffList":
      return await getStaffList();
    case "addStaff":
      return await addStaff(event, openid);
    case "updateStaff":
      return await updateStaff(event, openid);
    case "deleteStaff":
      return await deleteStaff(event, openid);
    case "getMiniProgramCode":
      return await getMiniProgramCode();
    case "createCanteenCollections":
      return await createCanteenCollections();
    case "updateDeadlineConfig":
      return await updateDeadlineConfig(event, openid);
    case "getDeadlineConfig":
      return await getDeadlineConfig();
    case "cancelOrder":
      return await cancelOrder(event, openid);
    case "getOrderStats":
      return await getOrderStats(event, openid);
    case "saveMenu":
      return await saveMenu(event, openid);
    case "selectRecord":
      return await selectRecord();
    case "updateRecord":
      return await updateRecord(event);
    case "insertRecord":
      return await insertRecord(event);
    case "deleteRecord":
      return await deleteRecord(event);
  }
};
