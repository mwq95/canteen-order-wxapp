/**
 * 食堂订餐小程序 - 菜单管理云函数
 * 主要功能：
 * 1. 菜单管理
 * 2. 数据库集合初始化
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
 * 云函数入口
 * @param {Object} event - 事件对象
 * @param {Object} context - 上下文对象
 * @returns {Object} 函数执行结果
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  switch (event.type) {
    case "saveMenu":
      return await saveMenu(event, openid);
    case "createCanteenCollections":
      return await createCanteenCollections();
  }
};