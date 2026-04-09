const cloud = require("wx-server-sdk");
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

const getOpenId = async () => {
  const wxContext = cloud.getWXContext();
  return {
    openid: wxContext.OPENID,
    appid: wxContext.APPID,
    unionid: wxContext.UNIONID,
  };
};

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

const checkIsAdmin = async (openid) => {
  const userRes = await db.collection('users').where({
    _openid: openid
  }).get();
  if (userRes.data.length > 0) {
    return userRes.data[0].role === 'admin';
  }
  return false;
};

const getStaffList = async () => {
  return await db.collection('staffs').orderBy('createTime', 'desc').get();
};

const addStaff = async (event, openid) => {
  const isAdmin = await checkIsAdmin(openid);
  if (!isAdmin) {
    return { success: false, error: '您没有权限操作' };
  }

  return await db.collection('staffs').add({
    data: event.data
  });
};

const updateStaff = async (event, openid) => {
  const isAdmin = await checkIsAdmin(openid);
  if (!isAdmin) {
    return { success: false, error: '您没有权限操作' };
  }

  return await db.collection('staffs').doc(event.id).update({
    data: event.data
  });
};

const deleteStaff = async (event, openid) => {
  const isAdmin = await checkIsAdmin(openid);
  if (!isAdmin) {
    return { success: false, error: '您没有权限操作' };
  }

  return await db.collection('staffs').doc(event.id).remove()
  // .update({
  //   data: {
  //     status: 'inactive',
  //     updateTime: new Date()
  //   }
  // });
};

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

const createCanteenCollections = async () => {
  try {
    await db.createCollection("menus");
    await db.createCollection("orders");
    await db.createCollection("evaluations");
    await db.createCollection("users");
    await db.createCollection("configs");
    await db.createCollection("staffs");

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

const updateDeadlineConfig = async (event, openid) => {
  const isAdmin = await checkIsAdmin(openid);
  if (!isAdmin) {
    return { success: false, error: '您没有权限修改设置' };
  }

  const { breakfast_deadline, lunch_deadline, dinner_deadline } = event.data;

  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(breakfast_deadline) || !timeRegex.test(lunch_deadline) || !timeRegex.test(dinner_deadline)) {
    return { success: false, error: '时间格式不正确' };
  }

  try {
    const configRes = await db.collection('configs').where({ key: 'order_deadline' }).get();
    
    if (configRes.data.length > 0) {
      await db.collection('configs').doc(configRes.data[0]._id).update({
        data: {
          breakfast_deadline,
          lunch_deadline,
          dinner_deadline,
          updateTime: new Date()
        }
      });
    } else {
      await db.collection('configs').add({
        data: {
          key: 'order_deadline',
          breakfast_deadline,
          lunch_deadline,
          dinner_deadline,
          updateTime: new Date()
        }
      });
    }

    return { success: true };
  } catch (e) {
    console.error('更新截止时间失败', e);
    return { success: false, error: '保存失败：' + (e.errMsg || e.message) };
  }
};

const selectRecord = async () => {
  return await db.collection("sales").get();
};

const updateRecord = async (event) => {
  try {
    for (let i = 0; i < event.data.length; i++) {
      await db
        .collection("sales")
        .where({
          _id: event.data[i]._id,
        })
        .update({
          data: {
            sales: event.data[i].sales,
          },
        });
    }
    return {
      success: true,
      data: event.data,
    };
  } catch (e) {
    return {
      success: false,
      errMsg: e,
    };
  }
};

const insertRecord = async (event) => {
  try {
    const insertRecord = event.data;
    await db.collection("sales").add({
      data: {
        region: insertRecord.region,
        city: insertRecord.city,
        sales: Number(insertRecord.sales),
      },
    });
    return {
      success: true,
      data: event.data,
    };
  } catch (e) {
    return {
      success: false,
      errMsg: e,
    };
  }
};

const deleteRecord = async (event) => {
  try {
    await db
      .collection("sales")
      .where({
        _id: event.data._id,
      })
      .remove();
    return {
      success: true,
    };
  } catch (e) {
    return {
      success: false,
      errMsg: e,
    };
  }
};

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  switch (event.type) {
    case "getOpenId":
      return await getOpenId();
    case "getPhoneNumber":
      return await getPhoneNumber(event);
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
    case "selectRecord":
      return await selectRecord();
    case "updateRecord":
      return await updateRecord(event);
    case "insertRecord":
      return await insertRecord(event);
    case "deleteRecord":
      return await deleteRecord(event);
  }
};
