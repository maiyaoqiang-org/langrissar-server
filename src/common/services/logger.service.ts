import * as winston from 'winston';
import Transport from 'winston-transport';

// 先创建一个简单的控制台日志记录器
export class LoggerService {
  private static instance: winston.Logger;

  public static getInstance(): winston.Logger {
    if (!LoggerService.instance) {
      LoggerService.instance = winston.createLogger({
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.printf(({ timestamp, level, message }) => {
            return `${timestamp} ${level}: ${message}`;
          })
        ),
        transports: [
          // 控制台输出
          new winston.transports.Console({
            format: winston.format.simple(),
          })
        ]
      });

      // 异步加载 Loki transport
      import('winston-loki').then((LokiModule) => {
        const LokiTransport = LokiModule.default;
        LoggerService.instance.add(
          new LokiTransport({
            host: process.env.LOKI_HOST || 'http://localhost:3100',
            labels: { 
              app: 'langrissar-server',
              environment: process.env.NODE_ENV || 'development'
            },
            json: true,
            format: winston.format.json(),
            replaceTimestamp: true,
            onConnectionError: (err) => console.error(err)
          })
        );
      }).catch((err) => {
        console.error('加载 Loki transport 失败:', err);
      });
    }
    return LoggerService.instance;
  }
}