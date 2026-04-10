/**
 * 食堂订餐小程序 - 订单相关云函数
 * 主要功能：
 * 1. 菜单管理
 * 2. 订单提交和更新
 * 3. 订单列表查询
 * 4. 订餐统计
 * 5. 评价管理
 * 6. 评价统计
 */
const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();
const _ = db.command;

/**
 * 获取指定日期的菜单
 * @param {Object} event - 事件对象，包含日期
 * @returns {Object} 菜单数据
 */
const getMenu = async (event) => {
  const { date } = event;
  const result = await db.collection('menus').where({ date }).get();
  return {
    success: true,
    data: result.data[0] || null
  };
};

/**
 * 提交订单
 * @param {Object} event - 事件对象，包含订单信息
 * @returns {Object} 提交结果
 */
const submitOrder = async (event) => {
  const wxContext = cloud.getWXContext();
  const { date, mealType, dishes, phone, existingOrderId } = event;
  
  const orderData = {
    date,
    mealType,
    dishes,
    phone: phone || '',
    status: 'pending',
    createTime: db.serverDate(),
    updateTime: db.serverDate(),
    _openid: wxContext.OPENID
  };

  if (existingOrderId) {
    // 更新现有订单
    await db.collection('orders').doc(existingOrderId).update({
      data: {
        dishes,
        mealType,
        phone: phone || '',
        status: 'pending',
        updateTime: db.serverDate()
      }
    });
    return { success: true, message: '订单已更新' };
  } else {
    // 创建新订单
    await db.collection('orders').add({
      data: orderData
    });
    return { success: true, message: '订餐成功' };
  }
};

/**
 * 获取指定日期的订单列表
 * @param {Object} event - 事件对象，包含日期
 * @returns {Object} 订单列表
 */
const getOrderList = async (event) => {
  const { date } = event;
  const result = await db.collection('orders').where({ 
    date,
    status: _.neq('cancelled')  // 排除已取消的订单
  }).get();
  return {
    success: true,
    data: result.data
  };
};

/**
 * 获取指定日期的订餐统计
 * @param {Object} event - 事件对象，包含日期
 * @returns {Object} 统计数据
 */
const getStatistics = async (event) => {
  const { date } = event;
  const orders = await db.collection('orders').where({ 
    date,
    status: _.neq('cancelled')  // 排除已取消的订单
  }).get();
  
  const totalOrders = orders.data.length;
  let dishCount = {};
  
  // 统计每道菜的订购数量
  orders.data.forEach(order => {
    if (order.dishes) {
      order.dishes.forEach(dish => {
        const key = `${order.mealType}-${dish.name}`;
        dishCount[key] = (dishCount[key] || 0) + 1;
      });
    }
  });
  
  // 转换为统计数据格式并排序
  const dishStats = Object.entries(dishCount).map(([key, count]) => {
    const [mealType, name] = key.split('-');
    return { mealType, name, count };
  }).sort((a, b) => b.count - a.count);
  
  return {
    success: true,
    data: {
      totalOrders,
      dishStats
    }
  };
};

/**
 * 提交评价
 * @param {Object} event - 事件对象，包含订单ID和评价信息
 * @returns {Object} 提交结果
 */
const submitEvaluation = async (event) => {
  const wxContext = cloud.getWXContext();
  const { orderId, evaluations, phone } = event;

  // 批量提交评价
  const promises = evaluations.map(evalItem => {
    return db.collection('evaluations').add({
      data: {
        date: evalItem.date,
        mealType: evalItem.mealType,
        dishName: evalItem.dishName,
        rating: evalItem.rating,
        comment: evalItem.comment || '',
        orderId,
        phone: phone || '',
        _openid: wxContext.OPENID,
        createTime: db.serverDate()
      }
    });
  });

  await Promise.all(promises);

  // 更新订单状态为已评价
  await db.collection('orders').doc(orderId).update({
    data: {
      evaluated: true,
      updateTime: db.serverDate()
    }
  });

  return { success: true, message: '评价成功' };
};

/**
 * 提交单个评价
 * @param {Object} event - 事件对象，包含评价信息
 * @returns {Object} 提交结果
 */
const submitSingleEvaluation = async (event) => {
  const wxContext = cloud.getWXContext();
  const { evaluation } = event;

  try {
    // 检查是否已经评价过
    const existingEval = await db.collection('evaluations').where({
      date: evaluation.date,
      mealType: evaluation.mealType,
      dishName: evaluation.dishName,
      _openid: wxContext.OPENID
    }).get();

    if (existingEval.data.length > 0) {
      return { success: false, message: '该菜品已评价，无法重复评价' };
    }

    // 提交评价
    await db.collection('evaluations').add({
      data: {
        date: evaluation.date,
        mealType: evaluation.mealType,
        dishName: evaluation.dishName,
        rating: evaluation.rating,
        comment: evaluation.comment || '',
        orderId: evaluation.orderId,
        _openid: wxContext.OPENID,
        createTime: db.serverDate()
      }
    });

    return { success: true, message: '评价成功' };
  } catch (error) {
    console.error('提交单个评价失败', error);
    return { success: false, message: '评价失败' };
  }
};

/**
 * 获取指定日期的评价统计
 * @param {Object} event - 事件对象，包含日期
 * @returns {Object} 评价统计数据
 */
const getEvaluationStatistics = async (event) => {
  const { date } = event;
  
  try {
    // 查询该日期的所有评价
    const res = await db.collection('evaluations')
      .where({ date })
      .orderBy('createTime', 'desc')
      .get();

    if (res.data.length === 0) {
      return {
        success: true,
        data: { totalEvaluations: 0, mealStats: [] }
      };
    }

    // 按 餐次+菜品 分组统计
    const groupMap = {};
    res.data.forEach(evalItem => {
      const key = `${evalItem.mealType}-${evalItem.dishName}`;
      if (!groupMap[key]) {
        groupMap[key] = {
          mealType: evalItem.mealType,
          dishName: evalItem.dishName,
          ratings: [],
          comments: []
        };
      }
      groupMap[key].ratings.push(evalItem.rating);
      if (evalItem.comment && evalItem.comment.trim()) {
        groupMap[key].comments.push({
          comment: evalItem.comment.trim(),
          rating: evalItem.rating,
          phone: evalItem.phone ? evalItem.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : '匿名'
        });
      }
    });

    // 计算平均评分并按餐次排序
    const mealOrder = ['早餐', '午餐', '晚餐'];
    const mealStats = Object.values(groupMap)
      .map(group => ({
        mealType: group.mealType,
        dishName: group.dishName,
        avgRating: (group.ratings.reduce((a, b) => a + b, 0) / group.ratings.length).toFixed(1),
        totalRatings: group.ratings.length,
        comments: group.comments
      }))
      .sort((a, b) => {
        const aIdx = mealOrder.indexOf(a.mealType);
        const bIdx = mealOrder.indexOf(b.mealType);
        return (aIdx === -1 ? 99 : aIdx) - (bIdx === -1 ? 99 : bIdx);
      });

    return {
      success: true,
      data: {
        totalEvaluations: res.data.length,
        mealStats
      }
    };
  } catch (error) {
    console.error('获取评价统计失败', error);
    return {
      success: false,
      message: '获取评价统计失败'
    };
  }
};

/**
 * 获取用户的评价列表
 * @param {Object} event - 事件对象，包含分页信息
 * @returns {Object} 用户评价列表
 */
const getUserEvaluations = async (event) => {
  const wxContext = cloud.getWXContext();
  const { page = 1, pageSize = 10 } = event;
  
  try {
    const skip = (page - 1) * pageSize;
    
    // 查询用户的评价
    const evaluations = await db.collection('evaluations')
      .where({ _openid: wxContext.OPENID })
      .orderBy('createTime', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get();
    
    // 获取总评价数
    const countResult = await db.collection('evaluations')
      .where({ _openid: wxContext.OPENID })
      .count();
    
    return {
      success: true,
      data: {
        evaluations: evaluations.data,
        total: countResult.total,
        page,
        pageSize,
        totalPages: Math.ceil(countResult.total / pageSize)
      }
    };
  } catch (error) {
    console.error('获取用户评价失败', error);
    return {
      success: false,
      message: '获取评价失败'
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
  switch (event.type) {
    case 'getMenu':
      return await getMenu(event);
    case 'submitOrder':
      return await submitOrder(event);
    case 'getOrderList':
      return await getOrderList(event);
    case 'getStatistics':
      return await getStatistics(event);
    case 'submitEvaluation':
      return await submitEvaluation(event);
    case 'submitSingleEvaluation':
      return await submitSingleEvaluation(event);
    case 'getEvaluationStatistics':
      return await getEvaluationStatistics(event);
    case 'getUserEvaluations':
      return await getUserEvaluations(event);
    default:
      return { success: false, message: '未知的操作类型' };
  }
};
