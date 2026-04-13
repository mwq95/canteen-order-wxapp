/**
 * 食堂订餐小程序 - 通用云函数
 * 主要功能：
 * 1. 用户身份验证和绑定
 * 2. 员工管理
 * 3. 订单管理
 * 4. 配置管理
 * 5. 菜单管理
 * 6. 数据统计
 */
const cloud = require("wx-server-sdk");
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

/**
 * 验证并绑定手机号
 * @param {Object} event - 事件对象，包含手机号
 * @param {string} openid - 用户唯一标识
 * @returns {Object} 验证结果
 */
const verifyAndBindPhone = async (event, openid) => {
  const { phone } = event;

  if (!phone) {
    return { success: false, error: '请输入手机号' };
  }

  try {
    // 检查手机号是否在单位人员列表中
    const staffRes = await db.collection('staffs').where({
      phone: String(phone),
      status: 'active'
    }).get();

    if (staffRes.data.length === 0) {
      return { success: false, error: '您不在单位人员列表中，请联系管理员' };
    }

    const staff = staffRes.data[0];

    // 检查手机号是否已被其他账号绑定
    const existingUserByPhone = await db.collection('users').where({
      phone: String(phone)
    }).get();

    if (existingUserByPhone.data.length > 0) {
      const existingUser = existingUserByPhone.data[0];
      
      if (existingUser._openid && existingUser._openid !== openid) {
        return { 
          success: false, 
          error: '该手机号已被其他账号绑定，请联系管理员',
          code: 'PHONE_ALREADY_BOUND'
        };
      }
      
      // 同一账号，更新信息
      if (existingUser._openid === openid) {
        await db.collection('users').doc(existingUser._id).update({
          data: {
            isVerified: true,
            role: staff.role,
            name: staff.name,
            phone: String(phone),
            updateTime: new Date()
          }
        });

        return { 
          success: true, 
          data: { ...staff, isNewUser: false },
          message: '验证成功'
        };
      }
    }

    // 检查openid是否已有用户记录
    const existingUserByOpenid = await db.collection('users').where({
      _openid: openid
    }).get();

    if (existingUserByOpenid.data.length > 0) {
      // 更新现有用户记录
      await db.collection('users').doc(existingUserByOpenid.data[0]._id).update({
        data: {
          phone: String(phone),
          name: staff.name,
          role: staff.role,
          isVerified: true,
          subscribeOrderReminder: true,
          subscribeMealReminder: true,
          updateTime: new Date()
        }
      });
    } else {
      // 创建新用户记录
      await db.collection('users').add({
        data: {
          _openid: openid,
          phone: String(phone),
          name: staff.name,
          role: staff.role,
          isVerified: true,
          subscribeOrderReminder: true,
          subscribeMealReminder: true,
          createTime: new Date(),
          updateTime: new Date()
        }
      });
    }

    return { 
      success: true, 
      data: { ...staff, isNewUser: true },
      message: '验证成功'
    };

  } catch (e) {
    console.error('验证绑定失败', e);
    return { success: false, error: '验证失败：' + (e.errMsg || e.message) };
  }
};

/**
 * 获取用户OpenID
 * @returns {Object} 包含openid、appid、unionid的对象
 */
const getOpenId = async () => {
  const wxContext = cloud.getWXContext();
  return {
    openid: wxContext.OPENID,
    appid: wxContext.APPID,
    unionid: wxContext.UNIONID,
  };
};

/**
 * 获取手机号
 * @param {Object} event - 事件对象，包含code
 * @returns {Object} 包含手机号的对象
 */
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

/**
 * 检查用户是否为管理员
 * @param {string} openid - 用户唯一标识
 * @returns {boolean} 是否为管理员
 */
const checkIsAdmin = async (openid) => {
  const userRes = await db.collection('users').where({
    _openid: openid
  }).get();
  if (userRes.data.length > 0) {
    return userRes.data[0].role === 'admin';
  }
  return false;
};

/**
 * 获取员工列表
 * @returns {Promise} 员工列表
 */
const getStaffList = async () => {
  return await db.collection('staffs').orderBy('createTime', 'desc').get();
};

/**
 * 添加员工
 * @param {Object} event - 事件对象，包含员工数据
 * @param {string} openid - 用户唯一标识
 * @returns {Object} 添加结果
 */
const addStaff = async (event, openid) => {
  const isAdmin = await checkIsAdmin(openid);
  if (!isAdmin) {
    return { success: false, error: '您没有权限操作' };
  }

  return await db.collection('staffs').add({
    data: event.data
  });
};

/**
 * 更新员工信息
 * @param {Object} event - 事件对象，包含员工ID和数据
 * @param {string} openid - 用户唯一标识
 * @returns {Object} 更新结果
 */
const updateStaff = async (event, openid) => {
  const isAdmin = await checkIsAdmin(openid);
  if (!isAdmin) {
    return { success: false, error: '您没有权限操作' };
  }

  return await db.collection('staffs').doc(event.id).update({
    data: event.data
  });
};

/**
 * 删除员工
 * @param {Object} event - 事件对象，包含员工ID
 * @param {string} openid - 用户唯一标识
 * @returns {Object} 删除结果
 */
const deleteStaff = async (event, openid) => {
  const isAdmin = await checkIsAdmin(openid);
  if (!isAdmin) {
    return { success: false, error: '您没有权限操作' };
  }

  return await db.collection('staffs').doc(event.id).remove();
};

/**
 * 获取小程序码
 * @returns {string} 小程序码的fileID
 */
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

/**
 * 创建食堂相关的数据库集合
 * @returns {Object} 创建结果
 */
const createCanteenCollections = async () => {
  try {
    await db.createCollection("menus");
    await db.createCollection("orders");
    await db.createCollection("evaluations");
    await db.createCollection("users");
    await db.createCollection("configs");
    await db.createCollection("staffs");

    // 添加默认配置
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

/**
 * 更新截止时间配置
 * @param {Object} event - 事件对象，包含配置数据
 * @param {string} openid - 用户唯一标识
 * @returns {Object} 更新结果
 */
const updateDeadlineConfig = async (event, openid) => {
  const isAuthorized = await checkIsAdminOrKitchen(openid);
  if (!isAuthorized) {
    return { success: false, error: '您没有权限修改设置' };
  }

  const { 
    breakfast_deadline, lunch_deadline, dinner_deadline,
    breakfast_meal_start, lunch_meal_start, dinner_meal_start
  } = event.data;

  // 验证时间格式
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
      // 更新现有配置
      await db.collection('configs').doc(configRes.data[0]._id).update({
        data: updateData
      });
    } else {
      // 创建新配置
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

/**
 * 获取截止时间配置
 * @returns {Object} 配置数据
 */
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
    // 返回默认配置
    return {
      success: true,
      data: {
        breakfast: '08:00', lunch: '12:00', dinner: '17:00',
        breakfastMealStart: '08:00', lunchMealStart: '12:00', dinnerMealStart: '17:30'
      }
    };
  } catch (e) {
    console.error('获取配置失败', e);
    // 出错时返回默认配置
    return {
      success: true,
      data: {
        breakfast: '08:00', lunch: '12:00', dinner: '17:00',
        breakfastMealStart: '08:00', lunchMealStart: '12:00', dinnerMealStart: '17:30'
      }
    };
  }
};

/**
 * 取消订单
 * @param {Object} event - 事件对象，包含订单ID
 * @param {string} openid - 用户唯一标识
 * @returns {Object} 取消结果
 */
const cancelOrder = async (event, openid) => {
  const { orderId } = event;

  if (!orderId) {
    return { success: false, error: '缺少订单ID' };
  }

  try {
    const orderRes = await db.collection('orders').doc(orderId).get();
    
    if (!orderRes.data || orderRes.data.length === 0) {
      return { success: false, error: '订单不存在' };
    }

    const order = orderRes.data;

    // 验证订单归属
    if (order._openid !== openid) {
      return { success: false, error: '无权操作此订单' };
    }

    // 检查订单状态
    if (order.status === 'cancelled') {
      return { success: false, error: '该订单已取消' };
    }

    if (order.status === 'completed') {
      return { success: false, error: '该订单已完成，无法取消' };
    }

    // 获取截止时间配置
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

    // 检查是否过了截止时间
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

    // 执行取消操作
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



/**
 * 获取订单统计数据
 * @param {Object} event - 事件对象，包含手机号
 * @param {string} openid - 用户唯一标识
 * @returns {Object} 统计数据
 */
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

    // 并行获取近30天和总订单数
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

/**
 * 检查用户是否为管理员或厨房工作人员
 * @param {string} openid - 用户唯一标识
 * @returns {boolean} 是否为管理员或厨房工作人员
 */
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

/**
 * 保存菜单
 * @param {Object} event - 事件对象，包含日期和菜单数据
 * @param {string} openid - 用户唯一标识
 * @returns {Object} 保存结果
 */
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
      // 更新现有菜单
      await db.collection('menus').doc(existing.data[0]._id).update({
        data: { meals, updateTime: new Date() }
      });
    } else {
      // 创建新菜单
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

/**
 * 云函数入口
 * @param {Object} event - 事件对象
 * @param {Object} context - 上下文对象
 * @returns {Object} 函数执行结果
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  switch (event.type) {
    case "getOpenId":
      return await getOpenId();
    case "getPhoneNumber":
      return await getPhoneNumber(event);
    case "verifyAndBindPhone":
      return await verifyAndBindPhone(event, openid);
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
  }
};
