/**
 * 食堂订餐小程序 - 配置管理云函数
 * 主要功能：
 * 1. 管理订餐截止时间配置
 * 2. 管理系统配置
 */
const cloud = require("wx-server-sdk");
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

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
 * 云函数入口
 * @param {Object} event - 事件对象
 * @param {Object} context - 上下文对象
 * @returns {Object} 函数执行结果
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  switch (event.type) {
    case "updateDeadlineConfig":
      return await updateDeadlineConfig(event, openid);
    case "getDeadlineConfig":
      return await getDeadlineConfig();
  }
};