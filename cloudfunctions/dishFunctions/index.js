const cloud = require("wx-server-sdk");
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();
const _ = db.command;

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

const getDishList = async () => {
  try {
    const res = await db.collection('dishes')
      .orderBy('usageCount', 'desc')
      .orderBy('createTime', 'desc')
      .get();
    return { success: true, data: res.data };
  } catch (e) {
    console.error('获取菜品列表失败', e);
    return { success: false, error: '获取失败' };
  }
};

const addDish = async (name, openid) => {
  const isAuthorized = await checkIsAdminOrKitchen(openid);
  if (!isAuthorized) {
    return { success: false, error: '您没有权限添加菜品' };
  }

  if (!name || name.trim().length === 0) {
    return { success: false, error: '菜品名称不能为空' };
  }

  const dishName = name.trim();

  try {
    const existing = await db.collection('dishes').where({
      name: dishName
    }).get();

    if (existing.data.length > 0) {
      return { success: false, error: '该菜品已存在' };
    }

    await db.collection('dishes').add({
      data: {
        name: dishName,
        usageCount: 0,
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      }
    });

    return { success: true };
  } catch (e) {
    console.error('添加菜品失败', e);
    return { success: false, error: '添加失败' };
  }
};

const deleteDish = async (id, openid) => {
  const isAuthorized = await checkIsAdminOrKitchen(openid);
  if (!isAuthorized) {
    return { success: false, error: '您没有权限删除菜品' };
  }

  try {
    await db.collection('dishes').doc(id).remove();
    return { success: true };
  } catch (e) {
    console.error('删除菜品失败', e);
    return { success: false, error: '删除失败' };
  }
};

const batchDeleteDish = async (ids, openid) => {
  const isAuthorized = await checkIsAdminOrKitchen(openid);
  if (!isAuthorized) {
    return { success: false, error: '您没有权限删除菜品' };
  }

  try {
    const promises = ids.map(id => db.collection('dishes').doc(id).remove());
    await Promise.all(promises);
    return { success: true };
  } catch (e) {
    console.error('批量删除菜品失败', e);
    return { success: false, error: '删除失败' };
  }
};

const updateDishUsage = async (dishNames) => {
  if (!dishNames || dishNames.length === 0) {
    return { success: true };
  }

  try {
    for (const name of dishNames) {
      const existing = await db.collection('dishes').where({
        name: name.trim()
      }).get();

      if (existing.data.length > 0) {
        await db.collection('dishes').doc(existing.data[0]._id).update({
          data: {
            usageCount: _.inc(1),
            updateTime: db.serverDate()
          }
        });
      } else {
        await db.collection('dishes').add({
          data: {
            name: name.trim(),
            usageCount: 1,
            createTime: db.serverDate(),
            updateTime: db.serverDate()
          }
        });
      }
    }
    return { success: true };
  } catch (e) {
    console.error('更新菜品使用次数失败', e);
    return { success: false, error: '更新失败' };
  }
};

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  switch (event.type) {
    case "getDishList":
      return await getDishList();
    case "addDish":
      return await addDish(event.name, openid);
    case "deleteDish":
      return await deleteDish(event.id, openid);
    case "batchDeleteDish":
      return await batchDeleteDish(event.ids, openid);
    case "updateDishUsage":
      return await updateDishUsage(event.dishNames);
  }
};
