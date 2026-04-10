import os
import re

def add_comments_to_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    filename = os.path.basename(file_path)
    page_name = filename.replace('.js', '')
    
    # 页面描述映射
    page_descriptions = {
        'auth': '身份验证页面 - 用于员工手机号验证和身份绑定',
        'index': '首页 - 展示每日菜单信息',
        'order': '订餐页面 - 用户选择菜品和提交订单',
        'history': '历史订单页面 - 查看历史订餐记录',
        'profile': '个人中心页面 - 用户信息展示和设置',
        'admin': '管理后台首页 - 管理员功能入口',
        'menu': '菜单管理页面 - 管理员编辑每日菜单',
        'statistics': '统计页面 - 查看评价统计数据',
        'evaluate': '评价页面 - 用户对菜品进行评价',
        'orderList': '订单列表页面 - 管理员查看所有订单',
        'settings': '系统设置页面 - 配置订餐截止时间等',
        'userManage': '用户管理页面 - 管理员管理员工信息',
        'reminderSettings': '提醒设置页面 - 用户配置消息提醒',
        'orderStats': '订单统计页面 - 查看个人订餐统计',
        'help': '帮助页面 - 系统使用说明'
    }
    
    description = page_descriptions.get(page_name, f'{page_name}页面')
    
    new_lines = []
    
    # 添加文件顶部描述
    if not (lines and lines[0].strip().startswith('/*')):
        new_lines.append(f'/*\n')
        new_lines.append(f' * {description}\n')
        new_lines.append(f' */\n\n')
    
    # 数据字段注释
    data_field_comments = {
        'phone': '手机号',
        'loading': '加载状态',
        'checking': '验证检查状态',
        'currentDate': '当前日期',
        'currentDateStr': '当前日期中文显示',
        'menuData': '菜单数据',
        'showInitButton': '是否显示初始化按钮',
        'selectedDate': '选中的日期',
        'selectedDateStr': '选中日期的中文显示',
        'orders': '订单数据',
        'userSelections': '用户选择的菜品',
        'deadlines': '截止时间配置',
        'disabledMeals': '禁用的餐次',
        'orderList': '订单列表',
        'loadingMore': '加载更多状态',
        'page': '当前页码',
        'total': '总数',
        'hasMore': '是否有更多数据',
        'userInfo': '用户信息',
        'staffName': '员工姓名',
        'maskedPhone': '脱敏手机号',
        'roleText': '角色文本',
        'canAccessAdmin': '是否可访问管理后台',
        'isAdmin': '是否为管理员',
        'isPast': '是否为过去的日期',
        'meals': '餐次数据',
        'existingMenuId': '现有菜单ID',
        'newDishName': '新菜品名称',
        'currentMealIndex': '当前餐次索引',
        'showAddDishModal': '是否显示添加菜品弹窗',
        'evalStats': '评价统计数据',
        'showCommentModal': '是否显示评论弹窗',
        'currentComments': '当前评论列表',
        'currentDishName': '当前菜品名称',
        'orderId': '订单ID',
        'orderData': '订单数据',
        'ratings': '评分数据',
        'comments': '评论数据',
        'itemEvaluated': '已评价的项目',
        'evaluatedRatings': '已评价的评分',
        'evaluatedComments': '已评价的评论',
        'viewMode': '查看模式',
        'showDetail': '是否显示详情',
        'selectedMealType': '选中的餐次类型',
        'mealStats': '餐次统计',
        'breakfastDeadline': '早餐截止时间',
        'lunchDeadline': '午餐截止时间',
        'dinnerDeadline': '晚餐截止时间',
        'breakfastMealStart': '早餐开餐时间',
        'lunchMealStart': '午餐开餐时间',
        'dinnerMealStart': '晚餐开餐时间',
        'configId': '配置ID',
        'staffList': '员工列表',
        'filteredStaffList': '筛选后的员工列表',
        'showModal': '是否显示弹窗',
        'isEdit': '是否为编辑模式',
        'editingId': '编辑中的ID',
        'formData': '表单数据',
        'roleOptions': '角色选项',
        'statusOptions': '状态选项',
        'roleIndex': '角色索引',
        'statusIndex': '状态索引',
        'searchKeyword': '搜索关键词',
        'selectedIds': '选中的ID',
        'selectedCount': '选中数量',
        'isAllSelected': '是否全选',
        'orderReminder': '订餐提醒',
        'mealReminder': '用餐提醒',
        'thirtyDayRange': '30天日期范围',
        'thirtyDayCount': '30天订单数',
        'totalCount': '总订单数',
        'showKitchen': '是否显示厨房功能',
        'showAdmin': '是否显示管理员功能'
    }
    
    # 方法注释
    method_comments = {
        'onLoad': '页面加载时调用',
        'onShow': '页面显示时调用',
        'onReady': '页面渲染完成时调用',
        'onHide': '页面隐藏时调用',
        'onUnload': '页面卸载时调用',
        'onPullDownRefresh': '下拉刷新时调用',
        'onReachBottom': '上拉触底时调用',
        'initDate': '初始化日期',
        'initPage': '初始化页面',
        'loadMenu': '加载菜单数据',
        'loadOrders': '加载订单数据',
        'loadData': '加载数据',
        'loadUserInfo': '加载用户信息',
        'checkIfVerified': '检查是否已验证',
        'checkRole': '检查用户角色',
        'checkAdminAccess': '检查管理员访问权限',
        'checkPageAccess': '检查页面访问权限',
        'checkDisabledMeals': '检查禁用的餐次',
        'redirectToOrderPage': '跳转到订单页面',
        'onPhoneInput': '手机号输入事件',
        'getPhoneNumber': '获取手机号',
        'verifyByPhoneNumber': '通过手机号验证',
        'onManualVerify': '手动验证',
        'validatePhone': '验证手机号格式',
        'verifyStaff': '验证员工身份',
        'showLoading': '显示加载提示',
        'hideLoading': '隐藏加载提示',
        'showToast': '显示提示消息',
        'showModal': '显示模态框',
        'prevDay': '切换到前一天',
        'nextDay': '切换到后一天',
        'initDatabase': '初始化数据库',
        'goToOrder': '跳转到订餐页面',
        'goToMenu': '跳转到菜单管理页面',
        'goToStatistics': '跳转到统计页面',
        'goToOrderList': '跳转到订单列表页面',
        'goToSettings': '跳转到设置页面',
        'goToUserManage': '跳转到用户管理页面',
        'goToReminder': '跳转到提醒设置页面',
        'goToStats': '跳转到统计页面',
        'goToHelp': '跳转到帮助页面',
        'goToAdmin': '跳转到管理后台',
        'goToEvaluations': '跳转到评价页面',
        'toggleDish': '切换菜品选择状态',
        'submitOrder': '提交订单',
        'requestSubscribeMessageAndSubmit': '请求订阅消息并提交订单',
        'doSubmitOrder': '执行订单提交',
        'sendSubscribeMessage': '发送订阅消息',
        'markDishSelections': '标记菜品选中状态',
        'loadDeadlines': '加载截止时间配置',
        'getMealEndTime': '获取用餐结束时间',
        'getDeadlineTime': '获取截止时间',
        'calculateStatus': '计算订单状态',
        'getOrderActionInfo': '获取订单操作信息',
        'processOrders': '处理订单数据',
        'goToEvaluate': '跳转到评价页面',
        'viewEvaluation': '查看评价',
        'cancelOrder': '取消订单',
        'loadStaffList': '加载员工列表',
        'processStaffList': '处理员工列表',
        'onSearchInput': '搜索输入事件',
        'onSearch': '搜索事件',
        'clearSearch': '清除搜索',
        'filterStaffList': '筛选员工列表',
        'toggleSelect': '切换选中状态',
        'toggleSelectAll': '切换全选状态',
        'cancelSelect': '取消选中',
        'getSelectedNames': '获取选中的姓名',
        'batchDeactivate': '批量设为离职',
        'onAddStaff': '添加员工',
        'onEditStaff': '编辑员工',
        'onNameInput': '姓名输入',
        'onRoleChange': '角色选择变化',
        'onStatusChange': '状态选择变化',
        'onCancelModal': '取消弹窗',
        'stopPropagation': '阻止事件冒泡',
        'onConfirmModal': '确认弹窗',
        'showAddDish': '显示添加菜品弹窗',
        'onDishNameInput': '菜品名称输入',
        'addDish': '添加菜品',
        'deleteDish': '删除菜品',
        'cancelAddDish': '取消添加菜品',
        'saveMenu': '保存菜单',
        'loadStatistics': '加载统计数据',
        'viewComments': '查看评论',
        'closeCommentModal': '关闭评论弹窗',
        'loadOrderData': '加载订单数据',
        'loadExistingEvaluations': '加载已有评价',
        'onStarTap': '星级评分点击',
        'onCommentInput': '评论输入',
        'submitDishEvaluation': '提交菜品评价',
        'updateOrderEvaluated': '更新订单评价状态',
        'showMealDetail': '显示餐次详情',
        'backToStats': '返回统计页面',
        'onBreakfastChange': '早餐时间变化',
        'onLunchChange': '午餐时间变化',
        'onDinnerChange': '晚餐时间变化',
        'onBreakfastMealStartChange': '早餐开餐时间变化',
        'onLunchMealStartChange': '午餐开餐时间变化',
        'onDinnerMealStartChange': '晚餐开餐时间变化',
        'validateTimeFormat': '验证时间格式',
        'saveConfig': '保存配置',
        'loadSettings': '加载设置',
        'onOrderReminderChange': '订餐提醒变化',
        'onMealReminderChange': '用餐提醒变化',
        'requestSubscribeAndSave': '请求订阅并保存',
        'saveSetting': '保存设置',
        'setDateRanges': '设置日期范围',
        'loadStats': '加载统计数据',
        'loadThirtyDayStats': '加载30天统计',
        'loadTotalStats': '加载总统计',
        'formatDate': '格式化日期'
    }
    
    i = 0
    n = len(lines)
    
    # 添加文件顶部的注释
    if new_lines:
        lines = new_lines + lines
        n = len(lines)
        i = len(new_lines)
    
    in_data = False
    data_indent = ''
    
    while i < n:
        line = lines[i]
        stripped_line = line.strip()
        
        # 检查是否进入 data 对象
        if stripped_line.startswith('data:') and '{' in stripped_line:
            in_data = True
            # 找到 data 对象的缩进
            data_indent = line[:line.find('data:')]
            new_lines.append(line)
            i += 1
            continue
        
        # 在 data 对象内部，为字段添加注释
        if in_data:
            # 检查是否退出 data 对象
            if stripped_line == '},' or stripped_line == '}':
                in_data = False
                new_lines.append(line)
                i += 1
                continue
            
            # 为数据字段添加注释
            for field, comment in data_field_comments.items():
                field_pattern = rf'^{field}\s*:'
                if re.match(field_pattern, stripped_line) and not stripped_line.startswith('//'):
                    # 找到字段的缩进
                    indent = line[:line.find(stripped_line)]
                    new_lines.append(f'{indent}// {comment}\n')
                    break
            
            new_lines.append(line)
            i += 1
            continue
        
        # 为方法添加注释
        for method, comment in method_comments.items():
            # 匹配方法定义，如 "  onLoad() {" 或 "  async onLoad() {"
            method_pattern = rf'^\s*(async\s+)?{method}\s*\('
            if re.match(method_pattern, line) and not lines[i-1].strip().startswith('//'):
                # 找到方法的缩进
                indent = line[:len(line) - len(line.lstrip())]
                new_lines.append(f'{indent}// {comment}\n')
                break
        
        new_lines.append(line)
        i += 1
    
    # 写入文件
    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    
    print(f'已添加注释到: {file_path}')

# 需要处理的文件列表
files_to_process = [
    '/workspace/miniprogram/pages/auth/auth.js',
    '/workspace/miniprogram/pages/index/index.js',
    '/workspace/miniprogram/pages/order/order.js',
    '/workspace/miniprogram/pages/history/history.js',
    '/workspace/miniprogram/pages/profile/profile.js',
    '/workspace/miniprogram/pages/admin/admin.js',
    '/workspace/miniprogram/pages/menu/menu.js',
    '/workspace/miniprogram/pages/statistics/statistics.js',
    '/workspace/miniprogram/pages/evaluate/evaluate.js',
    '/workspace/miniprogram/pages/orderList/orderList.js',
    '/workspace/miniprogram/pages/settings/settings.js',
    '/workspace/miniprogram/pages/userManage/userManage.js',
    '/workspace/miniprogram/pages/reminderSettings/reminderSettings.js',
    '/workspace/miniprogram/pages/orderStats/orderStats.js',
    '/workspace/miniprogram/pages/help/help.js'
]

print('开始为文件添加中文注释...\n')

for file_path in files_to_process:
    if os.path.exists(file_path):
        add_comments_to_file(file_path)
    else:
        print(f'文件不存在: {file_path}')

print('\n所有文件处理完成！')
