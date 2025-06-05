import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { LoggerService } from './logger.service';

@Injectable()
export class FeishuService {
  private readonly webhookUrl = 'https://open.feishu.cn/open-apis/bot/v2/hook/77f093f4-a3a6-41cc-8f38-167cdcb49b8c';
  private readonly logger = LoggerService.getInstance();
  private readonly maxRetries = 5;
  private readonly retryDelay = 10000; // 10秒

  sendMessage(content: string) {
    let retryCount = 0;
    
    const send = () => {
      if (retryCount >= this.maxRetries) return;
      
      axios.post(this.webhookUrl, {
        msg_type: 'text',
        content: {
          text: content + (retryCount > 0 ? `\n(重试次数: ${retryCount})` : '')
        }
      })
      .then(res => {
        if (res.data?.code === 0 && res.data?.msg === 'success') {
          this.logger.info(`发送飞书消息成功:${JSON.stringify(res.data)}`);
        } else {
          throw new Error(`飞书接口返回错误: ${JSON.stringify(res.data)}`);
        }
      })
      .catch(error => {
        retryCount++;
        this.logger.error(`发送飞书消息失败(尝试 ${retryCount}/${this.maxRetries}): ${error.message}`);
        
        if (retryCount < this.maxRetries) {
          setTimeout(send, this.retryDelay);
        } else {
          this.logger.error(`发送飞书消息最终失败: ${error.message}`);
        }
      });
    };

    send();
  }
}