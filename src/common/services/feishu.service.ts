import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class FeishuService {
  private readonly webhookUrl = 'https://open.feishu.cn/open-apis/bot/v2/hook/77f093f4-a3a6-41cc-8f38-167cdcb49b8c'; // 替换为你的飞书机器人 webhook 地址

  async sendMessage(content: string) {
    try {
      await axios.post(this.webhookUrl, {
        msg_type: 'text',
        content: {
          text: content
        }
      });
    } catch (error) {
      console.error('发送飞书消息失败:', error);
      throw error;
    }
  }
}