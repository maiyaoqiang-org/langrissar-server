import { Injectable, OnModuleInit, OnModuleDestroy, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { CronJob } from 'cron';
import axios from 'axios';
import * as https from 'https';
import * as dayjs from 'dayjs';
import { CronJobEntity, TaskStatus, TaskType } from './entities/cron-job.entity';
import { CronJobLog, LogStatus } from './entities/cron-job-log.entity';
import { CreateCronJobDto } from './dto/create-cron-job.dto';
import { UpdateCronJobDto } from './dto/update-cron-job.dto';
import { QueryCronJobDto } from './dto/query-cron-job.dto';
import { QueryCronJobLogDto } from './dto/query-cron-job-log.dto';
import { LoggerService } from '../common/services/logger.service';

@Injectable()
export class CronJobService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = LoggerService.getInstance();
  private runningJobs: Map<number, CronJob> = new Map();

  constructor(
    @InjectRepository(CronJobEntity)
    private cronJobRepository: Repository<CronJobEntity>,
    @InjectRepository(CronJobLog)
    private cronJobLogRepository: Repository<CronJobLog>,
  ) {}

  async onModuleInit() {
    if (process.env.NODE_ENV === 'test' || process.env.DISABLE_CRON_JOBS === 'true') {
      this.logger.log({ level: 'info', message: '定时任务已禁用，跳过初始化' });
      return;
    }
    await this.loadAllEnabledJobs();
  }

  onModuleDestroy() {
    this.stopAllJobs();
  }

  private async loadAllEnabledJobs() {
    const jobs = await this.cronJobRepository.find({
      where: { status: TaskStatus.ENABLED },
    });
    for (const job of jobs) {
      try {
        await this.startJob(job);
      } catch (error) {
        this.logger.error(`启动任务 ${job.name} 失败: ${error.message}`);
      }
    }
    this.logger.log({ level: 'info', message: `已加载 ${jobs.length} 个定时任务` });
  }

  private stopAllJobs() {
    for (const [id, job] of this.runningJobs) {
      job.stop();
    }
    this.runningJobs.clear();
    this.logger.log({ level: 'info', message: '已停止所有定时任务' });
  }

  private async startJob(jobEntity: CronJobEntity) {
    if (this.runningJobs.has(jobEntity.id)) {
      this.runningJobs.get(jobEntity.id)?.stop();
      this.runningJobs.delete(jobEntity.id);
    }

    const timezone = 'Asia/Shanghai';
    const cronJob = new CronJob(
      jobEntity.cronExpression,
      async () => {
        await this.executeJob(jobEntity.id);
      },
      null,
      true,
      timezone,
    );

    this.runningJobs.set(jobEntity.id, cronJob);

    const nextRunTime = cronJob.nextDate().toJSDate();
    await this.cronJobRepository.update(jobEntity.id, { nextRunTime });

    this.logger.log({ level: 'info', message: `任务 ${jobEntity.name} 已启动，下次执行时间: ${dayjs(nextRunTime).format('YYYY-MM-DD HH:mm:ss')}` });
  }

  private stopJob(jobId: number) {
    if (this.runningJobs.has(jobId)) {
      this.runningJobs.get(jobId)?.stop();
      this.runningJobs.delete(jobId);
    }
  }

  async executeJob(jobId: number, isManual: boolean = false): Promise<CronJobLog> {
    const job = await this.cronJobRepository.findOne({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException('任务不存在');
    }

    const log = this.cronJobLogRepository.create({
      cronJobId: jobId,
      status: LogStatus.RUNNING,
      startTime: new Date(),
      retryTimes: 0,
    });
    await this.cronJobLogRepository.save(log);

    let lastError: string | null = null;
    let retryCount = isManual ? 0 : job.retryCount;

    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        let result: { statusCode: number; response: string };

        if (job.taskType === TaskType.URL) {
          result = await this.executeUrlTask(job);
        } else if (job.taskType === TaskType.CURL) {
          result = await this.executeCurlTask(job);
        } else {
          throw new Error('未知的任务类型');
        }

        log.status = LogStatus.SUCCESS;
        log.statusCode = result.statusCode;
        log.response = result.response;
        log.endTime = new Date();
        log.duration = log.endTime.getTime() - log.startTime.getTime();
        log.retryTimes = attempt;

        await this.cronJobLogRepository.save(log);

        await this.cronJobRepository.update(jobId, {
          lastRunTime: new Date(),
          runCount: () => 'runCount + 1',
          successCount: () => 'successCount + 1',
        });

        this.logger.log({ level: 'info', message: `任务 ${job.name} 执行成功` });
        return log;
      } catch (error) {
        lastError = error.message;
        this.logger.error({ level: 'error', message: `任务 ${job.name} 执行失败 (尝试 ${attempt + 1}/${retryCount + 1}): ${error.message}` });
        
        if (attempt < retryCount) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
    }

    log.status = LogStatus.FAILED;
    log.errorMessage = lastError || '';
    log.endTime = new Date();
    log.duration = log.endTime.getTime() - log.startTime.getTime();
    log.retryTimes = retryCount;
    await this.cronJobLogRepository.save(log);

    await this.cronJobRepository.update(jobId, {
      lastRunTime: new Date(),
      runCount: () => 'runCount + 1',
      failCount: () => 'failCount + 1',
    });

    return log;
  }

  private async executeUrlTask(job: CronJobEntity): Promise<{ statusCode: number; response: string }> {
    const headers = job.headers ? JSON.parse(job.headers) : {};
    const config: any = {
      method: job.httpMethod || 'GET',
      url: job.targetUrl,
      headers,
      timeout: job.timeout || 30000,
      validateStatus: () => true,
    };

    if (job.body && ['POST', 'PUT', 'PATCH'].includes(job.httpMethod?.toUpperCase())) {
      config.data = job.body;
    }

    const response = await axios(config);
    let responseData = '';
    try {
      if (typeof response.data === 'object') {
        responseData = JSON.stringify(response.data, null, 2);
      } else {
        responseData = String(response.data);
      }
    } catch {
      responseData = String(response.data);
    }

    return {
      statusCode: response.status,
      response: responseData.substring(0, 10000),
    };
  }

  private parseCurlArguments(cmd: string): string[] {
    const args: string[] = [];
    let current = '';
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let escaped = false;

    for (let i = 0; i < cmd.length; i++) {
      const char = cmd[i];

      if (escaped) {
        current += char;
        escaped = false;
        continue;
      }

      if (char === '\\') {
        if (inSingleQuote) {
          current += char;
        } else if (i + 1 < cmd.length && (cmd[i + 1] === '\n' || cmd[i + 1] === '\r')) {
          // Skip line continuation
          if (cmd[i + 1] === '\r' && cmd[i + 2] === '\n') i += 2;
          else i++;
        } else {
          escaped = true;
        }
        continue;
      }

      if (char === '^' && !inSingleQuote && i + 1 < cmd.length) {
        if (cmd[i + 1] === '"') {
          // ^" is cmd.exe quote escape — skip ^, let " be processed normally
          continue;
        }
        if (!inDoubleQuote && (cmd[i + 1] === '\n' || cmd[i + 1] === '\r')) {
          // Skip cmd.exe line continuation
          if (cmd[i + 1] === '\r' && cmd[i + 2] === '\n') i += 2;
          else i++;
          continue;
        }
      }

      if (char === "'" && !inDoubleQuote) {
        inSingleQuote = !inSingleQuote;
        continue;
      }

      if (char === '"' && !inSingleQuote) {
        inDoubleQuote = !inDoubleQuote;
        continue;
      }

      if ((char === ' ' || char === '\t' || char === '\n' || char === '\r') && !inSingleQuote && !inDoubleQuote) {
        if (current) {
          args.push(current);
          current = '';
        }
        continue;
      }

      current += char;
    }

    if (current) {
      args.push(current);
    }

    return args;
  }

  private parseCurlToAxiosConfig(args: string[]): { method: string; url: string; headers: Record<string, string>; data?: string; followRedirects: boolean } {
    const config: { method: string; url: string; headers: Record<string, string>; data?: string; followRedirects: boolean } = { method: 'GET', url: '', headers: {}, followRedirects: false };
    let i = 0;

    // Skip 'curl' if present
    if (args[0]?.toLowerCase() === 'curl') i++;

    while (i < args.length) {
      const arg = args[i];

      if (arg === '-X' || arg === '--request') {
        config.method = args[++i]?.toUpperCase() || 'GET';
      } else if (arg === '-H' || arg === '--header') {
        const header = args[++i] || '';
        const colonIdx = header.indexOf(':');
        if (colonIdx > 0) {
          const key = header.substring(0, colonIdx).trim();
          const value = header.substring(colonIdx + 1).trim();
          config.headers[key] = value;
        }
      } else if (arg === '-d' || arg === '--data' || arg === '--data-raw' || arg === '--data-binary') {
        config.data = args[++i] || '';
        if (config.method === 'GET') config.method = 'POST';
      } else if (arg === '-b' || arg === '--cookie') {
        config.headers['Cookie'] = args[++i] || '';
      } else if (arg === '-A' || arg === '--user-agent') {
        config.headers['User-Agent'] = args[++i] || '';
      } else if (arg === '-e' || arg === '--referer') {
        config.headers['Referer'] = args[++i] || '';
      } else if (arg === '-u' || arg === '--user') {
        config.headers['Authorization'] = 'Basic ' + Buffer.from(args[++i] || '').toString('base64');
      } else if (arg === '-L' || arg === '--location') {
        config.followRedirects = true;
      } else if (arg === '-k' || arg === '--insecure') {
        // handled via httpsAgent
      } else if (arg === '--url') {
        config.url = args[++i] || '';
      } else if (arg === '--compressed' || arg === '-s' || arg === '--silent' || arg === '-S' || arg === '--show-error' || arg === '-v' || arg === '--verbose' || arg === '-i' || arg === '--include' || arg === '-N' || arg === '--no-buffer' || arg === '-o' || arg === '--output' || arg === '--progress-bar' || arg === '-g' || arg === '--globoff') {
        // skip these no-value flags
      } else if (!arg.startsWith('-') && !config.url) {
        config.url = arg;
      } else if (arg.startsWith('--')) {
        // unknown long flags - skip value only if it doesn't look like a URL
        if (i + 1 < args.length && !args[i + 1].startsWith('-') && !args[i + 1].startsWith('http')) {
          i++;
        }
      }

      i++;
    }

    // Clean up URL
    if (config.url) {
      config.url = config.url.trim();
      if ((config.url.startsWith("'") && config.url.endsWith("'")) || (config.url.startsWith('"') && config.url.endsWith('"'))) {
        config.url = config.url.slice(1, -1);
      }
    }

    return config;
  }

  private async executeCurlTask(job: CronJobEntity): Promise<{ statusCode: number; response: string }> {
    let cmd = job.curlCommand.trim();

    if (!cmd.toLowerCase().startsWith('curl')) {
      cmd = 'curl ' + cmd;
    }

    const args = this.parseCurlArguments(cmd);
    this.logger.log({ level: 'info', message: `解析curl参数(${args.length}个): ${JSON.stringify(args.slice(0, 15))}` });

    const curlConfig = this.parseCurlToAxiosConfig(args);

    if (!curlConfig.url) {
      return { statusCode: 0, response: `无法从curl命令中解析出URL\n解析到的参数: ${JSON.stringify(args.slice(0, 20))}` };
    }

    this.logger.log({ level: 'info', message: `执行curl请求: ${curlConfig.method} ${curlConfig.url.substring(0, 200)}` });

    // Validate URL before making request
    try {
      new URL(curlConfig.url);
    } catch {
      return { statusCode: 0, response: `URL格式不正确: "${curlConfig.url}"` };
    }

    try {
      const axiosConfig: any = {
        method: curlConfig.method,
        url: curlConfig.url,
        headers: curlConfig.headers,
        timeout: job.timeout || 30000,
        validateStatus: () => true,
        maxRedirects: curlConfig.followRedirects ? 5 : 0,
        httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      };

      if (curlConfig.data) {
        axiosConfig.data = curlConfig.data;
      }

      const response = await axios(axiosConfig);

      let responseData = '';
      try {
        if (typeof response.data === 'object') {
          responseData = JSON.stringify(response.data, null, 2);
        } else {
          responseData = String(response.data);
        }
      } catch {
        responseData = String(response.data);
      }

      return {
        statusCode: response.status,
        response: responseData.substring(0, 10000),
      };
    } catch (error) {
      return {
        statusCode: 0,
        response: `请求失败: ${error.message}`,
      };
    }
  }

  async create(createCronJobDto: CreateCronJobDto) {
    this.validateCronExpression(createCronJobDto.cronExpression);

    const job = this.cronJobRepository.create({
      ...createCronJobDto,
      status: TaskStatus.ENABLED,
      cronDescription: createCronJobDto.cronDescription || this.getCronDescription(createCronJobDto.cronExpression),
    });

    const savedJob = await this.cronJobRepository.save(job);

    await this.startJob(savedJob);

    return savedJob;
  }

  async findAll(query: QueryCronJobDto) {
    const { page = 1, pageSize = 10, name, status, taskType } = query;
    const where: any = {};

    if (name) {
      where.name = Like(`%${name}%`);
    }
    if (status !== undefined) {
      where.status = status;
    }
    if (taskType !== undefined) {
      where.taskType = taskType;
    }

    const [items, total] = await this.cronJobRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return { items, total, page, pageSize };
  }

  async findOne(id: number) {
    const job = await this.cronJobRepository.findOne({ where: { id } });
    if (!job) {
      throw new NotFoundException('任务不存在');
    }
    return job;
  }

  async update(id: number, updateCronJobDto: UpdateCronJobDto) {
    const job = await this.findOne(id);

    if (updateCronJobDto.cronExpression) {
      this.validateCronExpression(updateCronJobDto.cronExpression);
    }

    if (updateCronJobDto.cronExpression && !updateCronJobDto.cronDescription) {
      updateCronJobDto.cronDescription = this.getCronDescription(updateCronJobDto.cronExpression);
    }

    await this.cronJobRepository.update(id, updateCronJobDto);

    const updatedJob = await this.findOne(id);

    if (updatedJob.status === TaskStatus.ENABLED) {
      await this.startJob(updatedJob);
    } else {
      this.stopJob(id);
    }

    return updatedJob;
  }

  async remove(id: number) {
    const job = await this.findOne(id);
    this.stopJob(id);
    await this.cronJobLogRepository.delete({ cronJobId: id });
    await this.cronJobRepository.remove(job);
    return { message: '删除成功' };
  }

  async toggleStatus(id: number) {
    const job = await this.findOne(id);
    const newStatus = job.status === TaskStatus.ENABLED ? TaskStatus.DISABLED : TaskStatus.ENABLED;

    await this.cronJobRepository.update(id, { status: newStatus });

    if (newStatus === TaskStatus.ENABLED) {
      const updatedJob = await this.findOne(id);
      await this.startJob(updatedJob);
    } else {
      this.stopJob(id);
    }

    return { status: newStatus };
  }

  async manualExecute(id: number) {
    return this.executeJob(id, true);
  }

  async getLogs(query: QueryCronJobLogDto) {
    const { page = 1, pageSize = 10, cronJobId, status, startDate, endDate } = query;
    const where: any = {};

    if (cronJobId) {
      where.cronJobId = cronJobId;
    }
    if (status) {
      where.status = status;
    }
    if (startDate && endDate) {
      where.startTime = Between(new Date(startDate), new Date(endDate));
    } else if (startDate) {
      where.startTime = MoreThanOrEqual(new Date(startDate));
    } else if (endDate) {
      where.startTime = LessThanOrEqual(new Date(endDate));
    }

    const [items, total] = await this.cronJobLogRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      relations: ['cronJob'],
    });

    return { items, total, page, pageSize };
  }

  async getJobStats(id: number) {
    const job = await this.findOne(id);
    const recentLogs = await this.cronJobLogRepository.find({
      where: { cronJobId: id },
      order: { createdAt: 'DESC' },
      take: 10,
    });

    const totalLogs = await this.cronJobLogRepository.count({
      where: { cronJobId: id },
    });

    const successLogs = await this.cronJobLogRepository.count({
      where: { cronJobId: id, status: LogStatus.SUCCESS },
    });

    const failedLogs = await this.cronJobLogRepository.count({
      where: { cronJobId: id, status: LogStatus.FAILED },
    });

    return {
      job,
      recentLogs,
      stats: {
        total: totalLogs,
        success: successLogs,
        failed: failedLogs,
        successRate: totalLogs > 0 ? ((successLogs / totalLogs) * 100).toFixed(2) + '%' : '0%',
      },
    };
  }

  private validateCronExpression(expression: string) {
    try {
      new CronJob(expression, () => {}, null, false);
    } catch (error) {
      throw new BadRequestException('cron表达式格式不正确: ' + error.message);
    }
  }

  private getCronDescription(expression: string): string {
    const parts = expression.split(' ');
    if (parts.length !== 5 && parts.length !== 6) {
      return '自定义表达式';
    }

    const [second, minute, hour, dayOfMonth, month, dayOfWeek] = parts.length === 6 
      ? parts 
      : ['0', ...parts];

    const descriptions: string[] = [];

    if (minute === '*' && hour === '*') {
      descriptions.push('每分钟执行');
    } else if (minute.includes('/') && hour === '*') {
      const interval = minute.split('/')[1];
      descriptions.push(`每隔${interval}分钟执行`);
    } else if (minute === '*' && hour.includes('/')) {
      const interval = hour.split('/')[1];
      descriptions.push(`每隔${interval}小时执行`);
    } else if (minute !== '*' && hour !== '*') {
      descriptions.push(`每天${hour}:${minute}执行`);
    } else if (hour === '*' && minute !== '*') {
      descriptions.push(`每小时的${minute}分执行`);
    }

    if (dayOfMonth !== '*' && month === '*') {
      descriptions.push(`每月${dayOfMonth}号`);
    }

    if (dayOfWeek !== '*') {
      const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      const dayName = weekDays[parseInt(dayOfWeek)] || `周${dayOfWeek}`;
      descriptions.push(`每${dayName}`);
    }

    return descriptions.join('，') || '自定义表达式';
  }

  validateCron(expression: string) {
    try {
      this.validateCronExpression(expression);
      const description = this.getCronDescription(expression);
      const job = new CronJob(expression, () => {}, null, false, 'Asia/Shanghai');
      const nextRuns: string[] = [];
      
      for (let i = 0; i < 5; i++) {
        nextRuns.push(job.nextDate().toFormat('yyyy-MM-dd HH:mm:ss'));
      }

      return {
        valid: true,
        description,
        nextRuns,
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message,
      };
    }
  }
}
