/**
 * 网络请求工具类
 * 主要功能：
 * 1. 封装云函数调用，统一错误处理
 * 2. 实现请求缓存机制
 * 3. 提供便捷的云函数调用方法
 */

/**
 * 调用云函数
 * @param {string} name - 云函数名称
 * @param {Object} data - 云函数参数
 * @param {Object} options - 额外选项
 * @returns {Promise} 云函数调用结果
 */
const callCloudFunction = async (name, data, options = {}) => {
  try {
    const result = await wx.cloud.callFunction({
      name,
      data,
      ...options
    });
    return result.result;
  } catch (error) {
    console.error(`调用云函数 ${name} 失败:`, error);
    throw error;
  }
};

/**
 * 带缓存的云函数调用
 * @param {string} name - 云函数名称
 * @param {Object} data - 云函数参数
 * @param {string} cacheKey - 缓存键
 * @param {number} cacheTime - 缓存时间（毫秒），默认5分钟
 * @returns {Promise} 云函数调用结果
 */
const callCloudFunctionWithCache = async (name, data, cacheKey, cacheTime = 5 * 60 * 1000) => {
  try {
    const cachedData = wx.getStorageSync(cacheKey);
    const now = Date.now();
    
    if (cachedData && (now - cachedData.timestamp) < cacheTime) {
      console.log(`从缓存获取数据: ${cacheKey}`);
      return cachedData.data;
    }
    
    const result = await callCloudFunction(name, data);
    
    wx.setStorageSync(cacheKey, {
      data: result,
      timestamp: now
    });
    
    return result;
  } catch (error) {
    console.error(`带缓存调用云函数 ${name} 失败:`, error);
    throw error;
  }
};

/**
 * 清除指定缓存
 * @param {string} cacheKey - 缓存键
 */
const clearCache = (cacheKey) => {
  wx.removeStorageSync(cacheKey);
};

/**
 * 清除所有缓存
 */
const clearAllCache = () => {
  wx.clearStorageSync();
};

/**
 * 批量调用云函数
 * @param {Array} functions - 云函数调用配置数组
 * @returns {Promise} 所有云函数调用结果的数组
 */
const batchCallCloudFunctions = async (functions) => {
  try {
    const promises = functions.map(({ name, data, options }) => 
      callCloudFunction(name, data, options)
    );
    return await Promise.all(promises);
  } catch (error) {
    console.error('批量调用云函数失败:', error);
    throw error;
  }
};

module.exports = {
  callCloudFunction,
  callCloudFunctionWithCache,
  clearCache,
  clearAllCache,
  batchCallCloudFunctions
};
