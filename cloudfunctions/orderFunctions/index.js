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
  const { orderId, evaluations } = event;
  
  const promises = evaluations.map(evalItem => {
    return db.collection('evaluations').add({
      data: {
        ...evalItem,
        orderId,
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
    default:
      return { success: false, message: '未知的操作类型' };
  }
};
