import * as winston from 'winston';
import 'winston-daily-rotate-file';

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
          }),
          // 普通日志文件输出
          new winston.transports.DailyRotateFile({
            filename: 'logs/app-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            maxFiles: '7d',
            maxSize: '20m',
            zippedArchive: true,
          }),
          // 错误日志单独记录
          new winston.transports.DailyRotateFile({
            filename: 'logs/error-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            maxFiles: '7d',
            maxSize: '20m',
            level: 'error',
            zippedArchive: true,
          })
        ]
      });
    }
    return LoggerService.instance;
  }
}