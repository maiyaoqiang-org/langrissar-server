import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { LoggerService } from './logger.service';
import { FEISHU_WEBHOOK_URL } from '../../config/baseConfig';

@Injectable()
export class FeishuService {
  private readonly logger = LoggerService.getInstance();
  private readonly maxRetries = 5;
  private readonly retryDelay = 10000; // 10秒

  constructor() {}

  sendMessage(content: string) {
    let retryCount = 0;
    
    const send = async () => {
      if (retryCount >= this.maxRetries) return;
      
      try {
        // 从 Nacos 异步获取 webhookUrl，如果未加载则先加载
        const webhookUrl = FEISHU_WEBHOOK_URL
        
        const response = await axios.post(webhookUrl, {
          msg_type: 'text',
          content: {
            text: content + (retryCount > 0 ? `\n(重试次数: ${retryCount})` : '')
          }
        });
        
        if (response.data?.code === 0 && response.data?.msg === 'success') {
          this.logger.info(`发送飞书消息成功:${JSON.stringify(response.data)}`);
        } else {
          throw new Error(`飞书接口返回错误: ${JSON.stringify(response.data)}`);
        }
      } catch (error) {
        retryCount++;
        this.logger.error(`发送飞书消息失败(尝试 ${retryCount}/${this.maxRetries}): ${error.message}`);
        
        if (retryCount < this.maxRetries) {
          await new Promise(resolve => setTimeout(resolve, this.retryDelay));
          await send();
        } else {
          this.logger.error(`发送飞书消息最终失败: ${error.message}`);
        }
      }
    };

    send();
  }
}