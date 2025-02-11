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
            { code: 'T001', name: 'Verify Email' },
            { code: 'T002', name: 'Join Telegram Channel' },
            { code: 'T003', name: 'Join Telegram Group' },
            { code: 'T004', name: 'Boost Telegram Channel' },
            { code: 'T005', name: 'Follow us on X' },
            { code: 'T006', name: 'Rate Chrome Extension' },
            { code: 'T007', name: 'Join Telegram MiniApp' },
            { code: 'T009', name: 'Join Discord Channel' },
            { code: 'T010', name: 'Add NodeGo.Ai to name' },
            { code: 'T011', name: 'Share Referral Link on X' },
            { code: 'T012', name: 'Retweet US' },
            { code: 'T014', name: 'Comment and Tag 3 friends' },
            { code: 'T100', name: 'Invite 1 friend' },
            { code: 'T101', name: 'Invite 3 friends' },
            { code: 'T102', name: 'Invite 5 friends' },
            { code: 'T103', name: 'Invite 10 friends' }
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
            console.error(chalk.red('Invalid proxy URL:'), error.message);
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
                throw new Error(`Proxy connection failed: ${error.message}`);
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
            console.error(chalk.red('Failed to fetch user info:'), error.message);
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
            console.error(chalk.red(`Ping failed: ${error.message}`));
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
                    await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay between tasks
                    const result = await this.claimTask(task.code);
                    results.push({
                        code: task.code,
                        name: task.name,
                        status: 'success',
                        statusCode: result.statusCode,
                        message: result.message
                    });
                    console.log(chalk.green(`✓ Task ${task.code} (${task.name}):`));
                    console.log(chalk.green(`  Status: ${result.statusCode}`));
                    console.log(chalk.green(`  Message: ${result.message}`));
                } catch (error) {
                    results.push({
                        code: task.code,
                        name: task.name,
                        status: 'failed',
                        statusCode: error.statusCode,
                        message: error.message
                    });
                    const errorColor = error.statusCode >= 500 ? 'red' : 'yellow';
                    console.log(chalk[errorColor](`⨯ Task ${task.code} (${task.name}):`));
                    console.log(chalk[errorColor](`  Status: ${error.statusCode}`));
                    console.log(chalk[errorColor](`  Message: ${error.message}`));
                }
            } else {
                results.push({
                    code: task.code,
                    name: task.name,
                    status: 'skipped',
                    statusCode: 200,
                    message: 'Task already completed'
                });
                console.log(chalk.white(`⚡ Task ${task.code} (${task.name}): Already completed`));
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
            console.error(chalk.red('Error reading accounts:'), error);
            process.exit(1);
        }
    }

    async processInitialTasks(account) {
        const pinger = new NodeGoPinger(account.token, account.proxy);
        
        try {
            console.log(chalk.white('='.repeat(50)));
            
            // Get initial user info
            const userInfo = await pinger.getUserInfo();
            console.log(chalk.cyan(`Initial setup for account: ${userInfo.username} (${userInfo.email})`));
            
            // Perform daily check-in
            try {
                const checkinResponse = await pinger.dailyCheckin();
                console.log(chalk.green(`Daily Check-in:`));
                console.log(chalk.green(`  Status: ${checkinResponse.statusCode}`));
                console.log(chalk.green(`  Message: ${checkinResponse.message}`));
            } catch (error) {
                console.log(chalk.yellow(`Daily Check-in:`));
                console.log(chalk.yellow(`  Status: ${error.statusCode}`));
                console.log(chalk.yellow(`  Message: ${error.message}`));
            }

            // Process all available tasks
            console.log(chalk.white('\nProcessing initial tasks...'));
            await pinger.processTasks(userInfo.socialTasks || []);

            console.log(chalk.green('\nInitial tasks completed'));
            console.log(chalk.white('='.repeat(50)));
        } catch (error) {
            console.error(chalk.red(`Error processing initial tasks: ${error.message}`));
            console.log(chalk.white('='.repeat(50)));
        }
    }

    async processPing(account) {
        const pinger = new NodeGoPinger(account.token, account.proxy);
        
        try {
            const userInfo = await pinger.getUserInfo();
            console.log(chalk.cyan(`\nPinging for account: ${userInfo.username}`));
            
            const pingResponse = await pinger.ping();
            console.log(chalk.green(`Ping Status:`));
            console.log(chalk.green(`  Status: ${pingResponse.statusCode}`));
            console.log(chalk.green(`  Message: ${pingResponse.message}`));
            
            // Display node status
            const updatedUserInfo = await pinger.getUserInfo();
            if (updatedUserInfo.nodes.length > 0) {
                console.log(chalk.magenta('Nodes Status:'));
                updatedUserInfo.nodes.forEach((node, index) => {
                    console.log(`  Node ${index + 1}: ${node.todayPoint} points today`);
                });
            }
        } catch (error) {
            console.error(chalk.red(`Error pinging account: ${error.message}`));
        }
    }

    async runPinger() {
        displayBanner();
        
        process.on('SIGINT', () => {
            console.log(chalk.yellow('\nGracefully shutting down...'));
            this.isRunning = false;
            setTimeout(() => process.exit(0), 1000);
        });

        // Initial processing - run once
        console.log(chalk.yellow('\n🚀 Performing initial setup and tasks...'));
        for (const account of this.accounts) {
            if (!this.isRunning) break;
            await this.processInitialTasks(account);
        }

        // Continue with regular pinging
        console.log(chalk.yellow('\n⚡ Starting regular ping cycle...'));
        while (this.isRunning) {
            console.log(chalk.white(`\n⏰ Ping Cycle at ${new Date().toLocaleString()}`));
            
            for (const account of this.accounts) {
                if (!this.isRunning) break;
                await this.processPing(account);
            }

            if (this.isRunning) {
                console.log(chalk.gray('\nWaiting 15 seconds before next cycle...'));
                await new Promise(resolve => setTimeout(resolve, 15000));
            }
        }
    }
}

// Run the multi-account pinger
const multiPinger = new MultiAccountPinger();
multiPinger.runPinger();
