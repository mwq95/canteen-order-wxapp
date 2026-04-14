/**
 * 食堂订餐小程序 - 订餐提醒定时触发云函数
 * 主要功能：
 * 每天晚上8点提醒用户预订第二天的餐
 * 
 * 定时触发器配置：
 * - orderReminder: 20:00 触发，提醒用户订明天的餐
 */
const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();
const _ = db.command;
const { templates } = require('./config');

const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getTomorrow = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return formatDate(tomorrow);
};

const sendOrderReminder = async (openid, tomorrow) => {
  try {
    const result = await cloud.openapi.subscribeMessage.send({
      touser: openid,
      page: 'pages/order/order',
      data: {
        thing1: { value: `${tomorrow} 订餐提醒` },
        thing2: { value: '请及时预订明天的餐食' },
        thing3: { value: '点击进入订餐页面' }
      },
      templateId: templates.orderReminder,
    });
    
    return { success: true, result };
  } catch (err) {
    console.error(`发送订餐提醒失败: ${openid}`, err);
    return { success: false, error: err };
  }
};

exports.main = async (event, context) => {
  const today = formatDate(new Date());
  const tomorrow = getTomorrow();
  
  console.log(`订餐提醒触发: ${today}, 提醒预订: ${tomorrow}`);
  
  if (!templates.orderReminder) {
    return {
      success: false,
      message: '订餐提醒模板ID未配置',
      sentCount: 0
    };
  }
  
  try {
    const menuRes = await db.collection('menus')
      .where({ date: tomorrow })
      .get();
    
    if (menuRes.data.length === 0) {
      return {
        success: true,
        message: '明天暂无菜单，不发送提醒',
        sentCount: 0
      };
    }
    
    const ordersRes = await db.collection('orders')
      .where({
        date: tomorrow,
        status: 'pending'
      })
      .get();
    
    const orderedOpenids = new Set();
    ordersRes.data.forEach(order => {
      if (order._openid) {
        orderedOpenids.add(order._openid);
      }
    });
    
    const usersRes = await db.collection('users')
      .where({
        subscribeOrderReminder: true,
        isVerified: true
      })
      .get();
    
    const usersToRemind = usersRes.data.filter(user => 
      !orderedOpenids.has(user._openid)
    );
    
    if (usersToRemind.length === 0) {
      return {
        success: true,
        message: '无需要提醒的用户',
        sentCount: 0
      };
    }
    
    let sentCount = 0;
    let failCount = 0;
    
    for (const user of usersToRemind) {
      const result = await sendOrderReminder(user._openid, tomorrow);
      
      if (result.success) {
        sentCount++;
      } else {
        failCount++;
      }
    }
    
    return {
      success: true,
      message: `订餐提醒发送完成`,
      tomorrow,
      totalUsers: usersToRemind.length,
      sentCount,
      failCount
    };
    
  } catch (err) {
    console.error('订餐提醒执行失败', err);
    return {
      success: false,
      error: err
    };
  }
};
