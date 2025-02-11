# NodeGo 自动机器人

NodeGo 平台的自动机器人，支持多个账户和代理配置（HTTP/SOCKS）。

## 功能

- 支持多账户
- 支持 HTTP 和 SOCKS 代理
- 自动定期 ping
- 带彩色输出的详细日志
- 账户状态监控
- 优雅关机处理

## 前提条件

- Node.js (v16 或更高版本)
- npm（节点软件包管理器）

## 安装

1. 克隆版本库：
```
git clone https://github.com/lhg1996/Nodego.git
```
```
cd Nodego-auto
```

2. 安装依赖项：
```
npm install
```

## 配置

1. 在项目根目录下创建 `data.txt`：
   - 每行添加一个 NodeGo 标记
   - 例如
     ```
     token1
     token2
     token3
     ```

2.（可选）在项目根目录下创建 `proxies.txt`：
   - 每行添加一个代理
   - 支持 HTTP 和 SOCKS 代理
   - 例如
     ```
     http://ip1:port1
     socks5://ip2:port2
     socks4://ip3:port3
     ```

## 使用方法

运行机器人：
```bash
node index.js
```

机器人将
- 加载 data.txt 中的所有账户
- 从 proxies.txt 中关联代理（如果有的话
- 每 15 秒开始定期 ping
- 显示每个账户的详细状态信息

## 输出信息

对于每个账户，机器人会显示
- 用户名
- 电子邮件
- 节点信息
  - 节点 ID
  - 总积分
  - 今日积分
  - 活跃状态
- 帐户总点数
- Ping 状态和响应

## 疑难解答

常见问题和解决方案：

1. 代理连接
