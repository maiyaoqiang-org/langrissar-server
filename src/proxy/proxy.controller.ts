import { Controller, Get, Post, All, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import axios, { AxiosRequestConfig } from 'axios';

@Controller('proxy')
export class ProxyController {
  @All()
  async proxyRequest(@Req() req: Request, @Res() res: Response) {
    try {
      // 从请求头获取目标URL
      const targetUrl = req.headers['x-target-url'] as string;
      if (!targetUrl) {
        return res.status(400).json({
          code: -1,
          message: '缺少目标URL'
        });
      }

      // 构建请求配置
      const config: AxiosRequestConfig = {
        method: req.method,
        url: targetUrl,
        headers: {
          ...req.headers as Record<string, string>,
          host: new URL(targetUrl).host,
        },
        params: req.query,
        data: req.body,
        responseType: 'json' as const,
      };

      // 删除不需要的请求头
      if (config.headers) {
        delete (config.headers as Record<string, string>)['x-target-url'];
        delete (config.headers as Record<string, string>)['host'];
        delete (config.headers as Record<string, string>)['origin'];
        delete (config.headers as Record<string, string>)['referer'];
      }

      // 发送请求
      const response = await axios(config);

      // 返回响应
      res.status(response.status).json({
        code: 0,
        data: response.data,
        message: 'success'
      });
    } catch (error) {
      res.status(500).json({
        code: -1,
        message: '请求失败',
        error: error.message
      });
    }
  }
}