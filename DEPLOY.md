# 云函数部署指南

本文档介绍如何使用微信云开发 CLI 部署云函数，无需微信开发者工具。

## 前置要求

- Node.js (v10+)
- npm 或 yarn
- 微信小程序云开发环境已创建

## 第一步：安装云开发 CLI

```bash
# 全局安装云开发 CLI
npm install -g @cloudbase/cli

# 或者使用 yarn
yarn global add @cloudbase/cli
```

## 第二步：登录微信云开发

```bash
# 登录（会打开浏览器进行授权）
tcb login
```

## 第三步：配置环境 ID

编辑 `cloudbaserc.json` 文件，将 `envId` 替换为你的云开发环境 ID：

```json
{
  "version": "2.0",
  "envId": "your-actual-env-id",  // 替换为你的环境 ID
  ...
}
```

**获取环境 ID 的方法：**
1. 登录 [微信云开发控制台](https://console.cloud.tencent.com/tcb)
2. 选择你的环境
3. 在「环境设置」中找到环境 ID

## 第四步：安装项目依赖

```bash
# 在项目根目录执行
npm install
```

## 第五步：部署云函数

### 部署所有云函数

```bash
# 使用 npm 脚本
npm run deploy:functions

# 或者直接使用 tcb 命令
tcb functions:deploy
```

### 部署单个云函数

```bash
# 部署 quickstartFunctions
tcb functions:deploy quickstartFunctions

# 部署 orderFunctions
tcb functions:deploy orderFunctions

# 部署 sendSubscribeMessage
tcb functions:deploy sendSubscribeMessage
```

## 常用命令

| 命令 | 说明 |
|------|------|
| `tcb login` | 登录微信云开发 |
| `tcb logout` | 退出登录 |
| `tcb env:list` | 查看所有环境 |
| `tcb functions:list` | 查看已部署的云函数 |
| `tcb functions:deploy [函数名]` | 部署云函数 |
| `tcb functions:delete [函数名]` | 删除云函数 |
| `tcb functions:code:get [函数名]` | 获取云函数代码 |

## 云函数配置说明

在 `cloudbaserc.json` 中可以配置每个云函数的参数：

```json
{
  "name": "quickstartFunctions",
  "config": {
    "timeout": 60,              // 超时时间（秒）
    "memorySize": 256,          // 内存大小（MB）
    "runtime": "Nodejs10.15"   // 运行时版本
  }
}
```

## 注意事项

1. **首次部署前**：确保已在云开发控制台创建了相应的环境
2. **云函数依赖**：每个云函数目录下的 `package.json` 中的依赖会自动安装
3. **环境变量**：可以在云开发控制台配置环境变量
4. **权限设置**：确保云函数有相应的数据库读写权限

## 故障排查

### 登录失败
- 确保网络连接正常
- 尝试使用 `tcb logout` 后重新登录

### 部署失败
- 检查 `envId` 是否正确
- 查看云函数代码是否有语法错误
- 检查云函数依赖是否正确

### 云函数调用失败
- 检查云函数是否已成功部署
- 查看云函数日志（云开发控制台）
- 确认云函数权限配置正确

## 相关文档

- [云开发 CLI 官方文档](https://docs.cloudbase.net/cli-v2/intro)
- [微信云开发文档](https://developers.weixin.qq.com/miniprogram/dev/wxcloud/basis/getting-started.html)
