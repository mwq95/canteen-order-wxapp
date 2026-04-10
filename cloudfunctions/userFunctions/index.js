/**
 * 食堂订餐小程序 - 用户相关云函数
 * 主要功能：
 * 1. 用户身份验证和绑定
 * 2. 员工管理
 * 3. 获取用户信息
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
  }
};