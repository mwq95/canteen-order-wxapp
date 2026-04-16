/**
 * 食堂订餐小程序 - 用餐提醒定时触发云函数
 * 主要功能：
 * 在开饭时间前发送用餐提醒给已订阅的用户
 * 
 * 定时触发器配置：
 * - breakfastReminder: 7:30 触发，发送早餐提醒
 * - lunchReminder: 11:30 触发，发送午餐提醒
 * - dinnerReminder: 17:00 触发，发送晚餐提醒
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

const getMealTypeFromTrigger = (triggerName) => {
  const triggerMap = {
    'breakfastReminder': '早餐',
    'lunchReminder': '午餐',
    'dinnerReminder': '晚餐'
  };
  return triggerMap[triggerName] || null;
};

const sendMealReminder = async (openid, mealType, dishes) => {
  try {
    const today = formatDate(new Date());
    const dishNames = dishes.map(d => d.name).join('、');
    
    const result = await cloud.openapi.subscribeMessage.send({
      touser: openid,
      page: 'pages/order/order',
      data: {
        thing1: { value: `${today} ${mealType}` },
        thing2: { value: dishNames || '已订餐' },
        thing3: { value: `即将开饭，请按时用餐` }
      },
      templateId: templates.mealReminder,
    });
    
    return { success: true, result };
  } catch (err) {
    if (err.errCode === 43101) {
      console.warn(`用户 ${openid} 未授权或授权已过期`);
      return { success: false, error: '用户未授权', code: 'NO_AUTH' };
    } else {
      console.error(`发送用餐提醒失败：${openid}`, err);
      return { success: false, error: err };
    }
  }
};

exports.main = async (event, context) => {
  const today = formatDate(new Date());
  
  let mealType = null;
  
  if (event.TriggerName) {
    mealType = getMealTypeFromTrigger(event.TriggerName);
  }
  
  if (!mealType) {
    const now = new Date();
    const hour = now.getHours();
    if (hour >= 7 && hour < 11) mealType = '早餐';
    else if (hour >= 11 && hour < 17) mealType = '午餐';
    else mealType = '晚餐';
  }
  
  console.log(`用餐提醒触发：${today} ${mealType}, TriggerName: ${event.TriggerName || '手动调用'}`);
  
  try {
    const ordersRes = await db.collection('orders')
      .where({
        date: today,
        mealType: mealType,
        status: 'pending'
      })
      .get();
    
    if (ordersRes.data.length === 0) {
      return {
        success: true,
        message: `今日${mealType}无订餐记录`,
        sentCount: 0
      };
    }
    
    const openidSet = new Set();
    const orderMap = {};
    
    ordersRes.data.forEach(order => {
      if (order._openid) {
        openidSet.add(order._openid);
        if (!orderMap[order._openid]) {
          orderMap[order._openid] = [];
        }
        orderMap[order._openid].push(...(order.dishes || []));
      }
    });
    
    const openids = Array.from(openidSet);
    
    if (openids.length === 0) {
      return {
        success: true,
        message: '无有效用户',
        sentCount: 0
      };
    }
    
    const usersRes = await db.collection('users')
      .where({
        _openid: _.in(openids),
        subscribeMealReminder: true
      })
      .get();
    
    const usersToSend = usersRes.data;
    
    if (usersToSend.length === 0) {
      return {
        success: true,
        message: '无用户开启用餐提醒',
        sentCount: 0
      };
    }
    
    let sentCount = 0;
    let failCount = 0;
    
    for (const user of usersToSend) {
      const dishes = orderMap[user._openid] || [];
      const result = await sendMealReminder(user._openid, mealType, dishes);
      
      if (result.success) {
        sentCount++;
      } else {
        failCount++;
      }
    }
    
    return {
      success: true,
      message: `用餐提醒发送完成`,
      mealType,
      totalOrders: ordersRes.data.length,
      totalUsers: usersToSend.length,
      sentCount,
      failCount
    };
    
  } catch (err) {
    console.error('用餐提醒执行失败', err);
    return {
      success: false,
      error: err
    };
  }
};
