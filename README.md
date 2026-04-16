# 食堂订餐小程序

<div align="center">

一个基于微信小程序云开发的食堂订餐管理系统

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.6.0-green.svg)](package.json)
[![Platform](https://img.shields.io/badge/platform-WeChat-green.svg)](https://developers.weixin.qq.com/miniprogram/dev/framework/)

[功能特性](#功能特性) • [快速开始](#快速开始) • [部署指南](#部署指南) • [使用文档](#使用文档)

</div>

---

## 📖 项目简介

食堂订餐小程序是一个专为企事业单位食堂设计的订餐管理系统。通过微信小程序实现员工在线订餐、食堂菜单管理、订餐数据统计等功能，帮助食堂更好地管理用餐需求，减少食物浪费，提升用餐体验。

### 核心优势

- 🚀 **零服务器成本**：基于微信云开发，无需购买和维护服务器
- 🔐 **安全可靠**：微信原生认证，数据存储在云端
- 📱 **即开即用**：微信扫码即可使用，无需下载安装
- 🎯 **角色管理**：支持多角色权限控制（普通员工、厨房、管理员）
- 📊 **数据导出**：支持导出订餐数据为Excel/CSV格式
- 🔔 **智能提醒**：自动发送订餐提醒和用餐提醒

---

## ✨ 功能特性

### 用户端功能

- **身份验证**：微信手机号授权验证，确保用户身份真实
- **在线订餐**：查看每日菜单，选择菜品订餐
- **订单管理**：查看历史订单，取消预约（截止时间前）
- **菜品评价**：对已完成的订单进行星级评分和文字评价
- **意见建议**：提交意见建议，帮助食堂改进
- **订餐统计**：查看个人订餐统计数据
- **提醒设置**：开启/关闭订餐提醒和用餐提醒

### 管理端功能

#### 厨房工作人员（kitchen）

- **菜单管理**：设置每日早中晚三餐菜单
- **订餐名单**：查看每日订餐情况，统计每道菜需要准备的份数
- **菜品评价**：查看菜品评价统计，了解用户反馈
- **订餐设置**：设置各餐次的截止时间和开饭时间
- **菜品管理**：维护菜品库，支持增删改查和批量操作
- **意见建议**：查看用户提交的意见建议

#### 管理员（admin）

- **用户管理**：管理单位人员列表，设置用户角色
- **数据导出**：导出订餐数据为Excel/CSV格式

### 系统功能

- **定时提醒**：
  - 订餐提醒：每晚20:00自动提醒未订餐用户
  - 用餐提醒：开饭前自动提醒已订餐用户
- **订阅消息**：支持多种订阅消息模板
- **权限控制**：基于角色的访问控制

---

## 🛠 技术栈

| 类别 | 技术 | 说明 |
|------|------|------|
| 前端 | 微信小程序原生开发 | WXML + WXSS + JavaScript |
| 后端 | 微信云开发 | 云函数、云数据库、云存储 |
| 数据库 | 云数据库 | NoSQL文档型数据库 |
| 消息推送 | 微信订阅消息 | 模板消息推送 |
| 定时任务 | 云函数定时触发器 | Cron表达式配置 |

---

## 📁 项目结构

```
miniprogram-1/
├── miniprogram/                 # 小程序前端代码
│   ├── app.js                  # 应用入口
│   ├── app.json                # 应用配置
│   ├── app.wxss                # 全局样式
│   ├── config.js               # 配置文件
│   ├── utils/                  # 工具类
│   │   ├── auth.js            # 权限检查
│   │   ├── dateUtil.js        # 日期处理
│   │   ├── httpUtil.js        # HTTP请求
│   │   └── initUtil.js        # 初始化工具
│   ├── pages/                  # 页面目录
│   │   ├── auth/              # 身份验证
│   │   ├── order/             # 订餐页面
│   │   ├── history/           # 历史订单
│   │   ├── profile/           # 个人中心
│   │   ├── admin/             # 管理后台
│   │   ├── menu/              # 菜单管理
│   │   ├── orderList/         # 订餐名单
│   │   ├── statistics/        # 菜品评价
│   │   ├── settings/          # 订餐设置
│   │   ├── userManage/        # 用户管理
│   │   ├── dishManage/        # 菜品管理
│   │   ├── dataExport/        # 数据导出
│   │   ├── evaluate/          # 评价页面
│   │   ├── feedback/          # 意见建议
│   │   └── ...                # 其他页面
│   └── images/                 # 图片资源
├── cloudfunctions/              # 云函数目录
│   ├── userFunctions/          # 用户相关
│   ├── orderFunctions/         # 订单相关
│   ├── menuFunctions/          # 菜单管理
│   ├── configFunctions/        # 配置管理
│   ├── dishFunctions/          # 菜品管理
│   ├── exportFunctions/        # 数据导出
│   ├── mealReminder/           # 用餐提醒
│   ├── orderReminder/          # 订餐提醒
│   └── sendSubscribeMessage/   # 订阅消息
├── cloudbaserc.json            # 云开发配置
├── package.json                # 项目依赖
├── 需求文档.md                  # 需求文档
├── 项目开发文档.md              # 开发文档
└── DEPLOY.md                   # 部署指南
```

---

## 🚀 快速开始

### 前置要求

- Node.js v10.0 或以上版本
- 微信开发者工具
- 微信小程序账号（已认证）
- 已开通云开发环境

### 安装步骤

#### 1. 克隆项目

```bash
git clone https://github.com/mwq95/canteen-order-wxapp.git
cd canteen-order-wxapp
```

#### 2. 安装依赖

```bash
npm install
```

#### 3. 导入项目

1. 打开微信开发者工具
2. 导入项目，选择项目根目录
3. 填写你的 AppID
4. 点击"导入"

#### 4. 开通云开发

1. 在微信开发者工具中，点击"云开发"按钮
2. 开通云开发环境
3. 记录环境ID

#### 5. 配置环境ID

编辑 `cloudbaserc.json`，将 `envId` 替换为你的云开发环境ID：

```json
{
  "version": "2.0",
  "envId": "your-env-id",
  ...
}
```

#### 6. 部署云函数

**方式一：使用微信开发者工具**

1. 在云函数目录右键
2. 选择"上传并部署：云端安装依赖"
3. 等待部署完成

**方式二：使用命令行**

```bash
# 安装云开发 CLI
npm install -g @cloudbase/cli

# 登录
tcb login

# 部署所有云函数
npm run deploy:functions
```

#### 7. 初始化数据库

1. 在小程序中，使用管理员账号登录
2. 系统会自动创建所需的数据库集合

#### 8. 配置订阅消息

1. 登录[微信公众平台](https://mp.weixin.qq.com/)
2. 进入"功能" -> "订阅消息"
3. 申请以下模板：
   - 用餐提醒模板
   - 订餐提醒模板
4. 将模板ID填入 `miniprogram/config.js`

#### 9. 配置定时触发器

在云开发控制台配置定时触发器：

**mealReminder（用餐提醒）**
- breakfastReminder: `0 30 7 * * * *`（每天7:30）
- lunchReminder: `0 30 11 * * * *`（每天11:30）
- dinnerReminder: `0 0 17 * * * *`（每天17:00）

**orderReminder（订餐提醒）**
- orderReminder: `0 0 20 * * * *`（每天20:00）

---

## 📋 部署指南

详细的部署指南请参考 [DEPLOY.md](DEPLOY.md)

### 部署检查清单

- [ ] 已开通云开发环境
- [ ] 已部署所有云函数
- [ ] 已配置定时触发器
- [ ] 已申请订阅消息模板
- [ ] 已在 staffs 集合中添加管理员记录
- [ ] 已使用管理员账号完成首次登录

---

## 📚 使用文档

### 用户角色说明

| 角色 | 说明 | 权限范围 |
|------|------|----------|
| staff | 普通员工 | 订餐、查看订单、评价、提交意见建议 |
| kitchen | 厨房工作人员 | staff权限 + 菜单管理、订餐名单、菜品管理、菜品评价、订餐设置 |
| admin | 管理员 | kitchen权限 + 用户管理、数据导出 |

### 数据库集合说明

| 集合名 | 说明 |
|--------|------|
| users | 已验证用户集合 |
| staffs | 单位人员列表 |
| menus | 菜单集合 |
| orders | 订单集合 |
| evaluations | 评价集合 |
| configs | 配置集合 |
| feedbacks | 意见建议集合 |
| dishes | 菜品库集合 |

### 云函数说明

详细云函数API文档请参考 [项目开发文档.md](项目开发文档.md)

---

## 🔧 配置说明

### 敏感信息说明

本项目包含敏感配置文件，这些文件已被 ` .gitignore` 排除，不会提交到仓库。首次使用时需要手动配置：

| 文件 | 说明 | 模板文件 |
|------|------|----------|
| `cloudbaserc.json` | 云开发环境ID | `cloudbaserc.example.json` |
| `project.config.json` | 小程序 AppID | `project.config.example.json` |
| `miniprogram/config.js` | 订阅消息模板ID | `miniprogram/config.example.js` |

**配置步骤**：

1. 复制模板配置文件：
```bash
cp cloudbaserc.example.json cloudbaserc.json
cp project.config.example.json project.config.json
cp miniprogram/config.example.js miniprogram/config.js
```

2. 编辑各配置文件，填入你的信息：
   - `cloudbaserc.json`：填入云开发环境ID
   - `project.config.json`：填入微信小程序 AppID
   - `miniprogram/config.js`：填入订阅消息模板ID

### 订阅消息模板配置

编辑 `miniprogram/config.js`：

```javascript
module.exports = {
  templates: {
    mealReminder: '用餐提醒模板ID',
    orderReminder: '订餐提醒模板ID'
  }
}
```

### 截止时间配置

在小程序管理后台的"订餐设置"页面配置各餐次的：
- 订餐截止时间
- 开饭时间

---

## 📝 开发指南

### 本地开发

1. 在微信开发者工具中打开项目
2. 修改代码后自动编译
3. 在模拟器中预览效果

### 云函数调试

1. 在云函数目录右键
2. 选择"开启云函数本地调试"
3. 在调试面板中测试云函数

### 代码规范

- 使用 ESLint 进行代码检查
- 遵循微信小程序开发规范
- 云函数统一使用 async/await

---

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

### 提交 Issue

- 描述问题或建议
- 提供复现步骤（如果是bug）
- 附上截图（如果有）

### 提交 Pull Request

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

---

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

---


<div align="center">

**⭐ 如果这个项目对你有帮助，请给一个 Star ⭐**

</div>
