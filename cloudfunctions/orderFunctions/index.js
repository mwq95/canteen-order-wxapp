const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();
const _ = db.command;

const getMenu = async (event) => {
  const { date } = event;
  const result = await db.collection('menus').where({ date }).get();
  return {
    success: true,
    data: result.data[0] || null
  };
};

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
    await db.collection('orders').add({
      data: orderData
    });
    return { success: true, message: '订餐成功' };
  }
};

const getOrderList = async (event) => {
  const { date } = event;
  const result = await db.collection('orders').where({ 
    date,
    status: _.neq('cancelled')
  }).get();
  return {
    success: true,
    data: result.data
  };
};

const getStatistics = async (event) => {
  const { date } = event;
  const orders = await db.collection('orders').where({ 
    date,
    status: _.neq('cancelled')
  }).get();
  
  const totalOrders = orders.data.length;
  let dishCount = {};
  
  orders.data.forEach(order => {
    if (order.dishes) {
      order.dishes.forEach(dish => {
        const key = `${order.mealType}-${dish.name}`;
        dishCount[key] = (dishCount[key] || 0) + 1;
      });
    }
  });
  
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

const submitEvaluation = async (event) => {
  const wxContext = cloud.getWXContext();
  const { orderId, evaluations, phone } = event;

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

  await db.collection('orders').doc(orderId).update({
    data: {
      evaluated: true,
      updateTime: db.serverDate()
    }
  });

  return { success: true, message: '评价成功' };
};

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

const getUserEvaluations = async (event) => {
  const { phone, page = 1, pageSize = 10 } = event;
  
  try {
    // 计算跳过的记录数
    const skip = (page - 1) * pageSize;
    
    // 查询用户的评价，按创建时间降序排序
    const evaluations = await db.collection('evaluations')
      .where({ phone })
      .orderBy('createTime', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get();
    
    // 获取总记录数
    const countResult = await db.collection('evaluations')
      .where({ phone })
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
    case 'getEvaluationStatistics':
      return await getEvaluationStatistics(event);
    case 'getUserEvaluations':
      return await getUserEvaluations(event);
    default:
      return { success: false, message: '未知的操作类型' };
  }
};
