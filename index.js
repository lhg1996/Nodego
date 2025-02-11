import fs from 'fs';
import axios from 'axios';
import { URL } from 'url';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { HttpProxyAgent } from 'http-proxy-agent';
import chalk from 'chalk';
import displayBanner from './banner.js';

class NodeGoPinger {
    constructor(token, proxyUrl = null) {
        this.apiBaseUrl = 'https://nodego.ai/api';
        this.bearerToken = token;
        this.agent = proxyUrl ? this.createProxyAgent(proxyUrl) : null;
        this.lastPingTimestamp = 0;
        this.tasksList = [
            { code: 'T001', name: '验证邮箱' },
            { code: 'T002', name: '加入 Telegram 频道' },
            { code: 'T003', name: '加入 Telegram 群组' },
            { code: 'T004', name: '提升 Telegram 频道' },
            { code: 'T005', name: '关注我们在 X 上' },
            { code: 'T006', name: '评价 Chrome 扩展' },
            { code: 'T007', name: '加入 Telegram MiniApp' },
            { code: 'T009', name: '加入 Discord 频道' },
            { code: 'T010', name: '将 NodeGo.Ai 添加到名称中' },
            { code: 'T011', name: '在 X 上分享推荐链接' },
            { code: 'T012', name: '转发美国' },
            { code: 'T014', name: '评论并标签 3 个朋友' },
            { code: 'T100', name: '邀请 1 个朋友' },
            { code: 'T101', name: '邀请 3 个朋友' },
            { code: 'T102', name: '邀请 5 个朋友' },
            { code: 'T103', name: '邀请 10 个朋友' }
        ];
    }

    createProxyAgent(proxyUrl) {
        try {
            const parsedUrl = new URL(proxyUrl);
            
            if (proxyUrl.startsWith('socks')) {
                return new SocksProxyAgent(parsedUrl);
            } else if (proxyUrl.startsWith('http')) {
                return {
                    httpAgent: new HttpProxyAgent(parsedUrl),
                    httpsAgent: new HttpsProxyAgent(parsedUrl)
                };
            } else {
                const httpUrl = `http://${proxyUrl}`;
                const httpParsedUrl = new URL(httpUrl);
                return {
                    httpAgent: new HttpProxyAgent(httpParsedUrl),
                    httpsAgent: new HttpsProxyAgent(httpParsedUrl)
                };
            }
        } catch (error) {
            console.error(chalk.red('无效的代理 URL:'), error.message);
            return null;
        }
    }

    async makeRequest(method, endpoint, data = null) {
        const config = {
            method,
            url: `${this.apiBaseUrl}${endpoint}`,
            headers: {
                'Authorization': `Bearer ${this.bearerToken}`,
                'Content-Type': 'application/json',
                'Accept': '*/*'
            },
            ...(data && { data }),
            timeout: 30000
        };

        if (this.agent) {
            if (this.agent.httpAgent) {
                config.httpAgent = this.agent.httpAgent;
                config.httpsAgent = this.agent.httpsAgent;
            } else {
                config.httpAgent = this.agent;
                config.httpsAgent = this.agent;
            }
        }

        try {
            return await axios(config);
        } catch (error) {
            if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
                throw new Error(`代理连接失败: ${error.message}`);
            }
            throw error;
        }
    }

    async getUserInfo() {
        try {
            const response = await this.makeRequest('GET', '/user/me');
            const metadata = response.data.metadata;
            return {
                username: metadata.username,
                email: metadata.email,
                totalPoint: metadata.rewardPoint,
                socialTasks: metadata.socialTask || [],
                nodes: metadata.nodes.map(node => ({
                    id: node.id,
                    totalPoint: node.totalPoint,
                    todayPoint: node.todayPoint,
                    isActive: node.isActive
                }))
            };
        } catch (error) {
            console.error(chalk.red('获取用户信息失败:'), error.message);
            throw error;
        }
    }

    async ping() {
        try {
            const currentTime = Date.now();
            
            if (currentTime - this.lastPingTimestamp < 3000) {
                await new Promise(resolve => setTimeout(resolve, 3000 - (currentTime - this.lastPingTimestamp)));
            }

            const response = await this.makeRequest('POST', '/user/nodes/ping', { type: 'extension' });
            
            this.lastPingTimestamp = Date.now();
            
            return {
                statusCode: response.data.statusCode,
                message: response.data.message,
                metadataId: response.data.metadata.id
            };
        } catch (error) {
            console.error(chalk.red(`Ping 失败: ${error.message}`));
            throw error;
        }
    }

    async dailyCheckin() {
        try {
            const response = await this.makeRequest('POST', '/user/checkin');
            return {
                statusCode: response.data.statusCode,
                message: response.data.message,
                userData: response.data.metadata.user
            };
        } catch (error) {
            const statusCode = error.response?.data?.statusCode || error.response?.status || 500;
            const message = error.response?.data?.message || error.message;
            throw {
                statusCode,
                message,
                error: true
            };
        }
    }

    async claimTask(taskId) {
        try {
            const response = await this.makeRequest('POST', '/user/task', { taskId });
            return {
                statusCode: response.data.statusCode,
                message: response.data.message,
                userData: response.data.metadata?.user
            };
        } catch (error) {
            const statusCode = error.response?.data?.statusCode || error.response?.status || 500;
            const message = error.response?.data?.message || error.message;
            throw {
                statusCode,
                message,
                error: true
            };
        }
    }

    async processTasks(completedTasks) {
        const results = [];
        
        for (const task of this.tasksList) {
            if (!completedTasks.includes(task.code)) {
                try {
                    await new Promise(resolve => setTimeout(resolve, 1000)); // 任务之间延迟 1 秒
                    const result = await this.claimTask(task.code);
                    results.push({
                        code: task.code,
                        name: task.name,
                        status: '成功',
                        statusCode: result.statusCode,
                        message: result.message
                    });
                    console.log(chalk.green(`✓ 任务 ${task.code} (${task.name}):`));
                    console.log(chalk.green(`  状态: ${result.statusCode}`));
                    console.log(chalk.green(`  信息: ${result.message}`));
                } catch (error) {
                    results.push({
                        code: task.code,
                        name: task.name,
                        status: '失败',
                        statusCode: error.statusCode,
                        message: error.message
                    });
                    const errorColor = error.statusCode >= 500 ? 'red' : 'yellow';
                    console.log(chalk[errorColor](`⨯ 任务 ${task.code} (${task.name}):`));
                    console.log(chalk[errorColor](`  状态: ${error.statusCode}`));
                    console.log(chalk[errorColor](`  信息: ${error.message}`));
                }
            } else {
                results.push({
                    code: task.code,
                    name: task.name,
                    status: '跳过',
                    statusCode: 200,
                    message: '任务已完成'
                });
                console.log(chalk.white(`⚡ 任务 ${task.code} (${task.name}): 已完成`));
            }
        }
        
        return results;
    }
}

class MultiAccountPinger {
    constructor() {
        this.accounts = this.loadAccounts();
        this.isRunning = true;
    }

    loadAccounts() {
        try {
            const accountData = fs.readFileSync('data.txt', 'utf8')
                .split('\n')
                .filter(line => line.trim());
            
            const proxyData = fs.existsSync('proxies.txt') 
                ? fs.readFileSync('proxies.txt', 'utf8')
                    .split('\n')
                    .filter(line => line.trim())
                : [];
            
            return accountData.map((token, index) => ({
                token: token.trim(),
                proxy: proxyData[index] || null
            }));
        } catch (error) {
            console.error(chalk.red('读取账户数据时出错:'), error);
            process.exit(1);
        }
    }

    async processInitialTasks(account) {
        const pinger = new NodeGoPinger(account.token, account.proxy);
        
        try {
            console.log(chalk.white('='.repeat(50)));
            
            // 获取用户信息
            const userInfo = await pinger.getUserInfo();
            console.log(chalk.cyan(`账户初始化: ${userInfo.username} (${userInfo.email})`));
            
            // 执行每日签到
            try {
                const checkinResponse = await pinger.dailyCheckin();
                console.log(chalk.green(`每日签到:`));
                console.log(chalk.green(`  状态: ${checkinResponse.statusCode}`));
                console.log(chalk.green(`  信息: ${checkinResponse.message}`));
            } catch (error) {
                console.log(chalk.yellow(`每日签到:`));
                console.log(chalk.yellow(`  状态: ${error.statusCode}`));
                console.log(chalk.yellow(`  信息: ${error.message}`));
            }

            // 处理所有可用任务
            console.log(chalk.white('\n处理初始任务...'));
            await pinger.processTasks(userInfo.socialTasks || []);

            console.log(chalk.green('\n初始任务已完成'));
            console.log(chalk.white('='.repeat(50)));
        } catch (error) {
            console.error(chalk.red(`处理初始任务时出错: ${error.message}`));
            console.log(chalk.white('='.repeat(50)));
        }
    }

    async processPing(account) {
        const pinger = new NodeGoPinger(account.token, account.proxy);
        
        try {
            const userInfo = await pinger.getUserInfo();
            console.log(chalk.cyan(`\nPing 操作: 账户 ${userInfo.username}`));
            
            const pingResponse = await pinger.ping();
            console.log(chalk.green(`Ping 状态:`));
            console.log(chalk.green(`  状态: ${pingResponse.statusCode}`));
            console.log(chalk.green(`  信息: ${pingResponse.message}`));
            
            // 显示节点状态
            const updatedUserInfo = await pinger.getUserInfo();
            if (updatedUserInfo.nodes.length > 0) {
                console.log(chalk.magenta('节点状态:'));
                updatedUserInfo.nodes.forEach((node, index) => {
                    console.log(`  节点 ${index + 1}: 今天获得 ${node.todayPoint} 积分`);
                });
            }
        } catch (error) {
            console.error(chalk.red(`Ping 账户时出错: ${error.message}`));
        }
    }

    async runPinger() {
        displayBanner();
        
        process.on('SIGINT', () => {
            console.log(chalk.yellow('\n正在优雅关闭...'));
            this.isRunning = false;
            setTimeout(() => process.exit(0), 1000);
        });

        // 初始处理 - 只运行一次
        console.log(chalk.yellow('\n🚀 正在执行初始设置和任务...'));
        for (const account of this.accounts) {
            if (!this.isRunning) break;
            await this.processInitialTasks(account);
        }

        // 启动定时 Ping
        console.log(chalk.yellow('\n⚡ 启动定时 Ping 循环...'));
        while (this.isRunning) {
            console.log(chalk.white(`\n⏰ Ping 循环开始于 ${new Date().toLocaleString()}`));
            
            for (const account of this.accounts) {
                if (!this.isRunning) break;
                await this.processPing(account);
            }

            if (this.isRunning) {
                console.log(chalk.gray('\n等待 15 秒后开始下一循环...'));
                await new Promise(resolve => setTimeout(resolve, 15000));
            }
        }
    }
}

// 启动多账户 Ping 操作
const multiPinger = new MultiAccountPinger();
multiPinger.runPinger();
