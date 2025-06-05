import * as winston from 'winston';
import 'winston-daily-rotate-file';
import { inspect } from 'util';

export class LoggerService {
  private static instance: winston.Logger;

  private static formatMessage(message: any): string {
    if (typeof message === 'object' && message !== null) {
      return inspect(message, { depth: 3, colors: true });
    }
    return message;
  }

  public static getInstance(): winston.Logger {
    if (!LoggerService.instance) {
      LoggerService.instance = winston.createLogger({
        format: winston.format.combine(
          winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
          }),
          winston.format.printf(({ timestamp, level, message }) => {
            return `${timestamp} ${level}: ${LoggerService.formatMessage(message)}`;
          })
        ),
        transports: [
          new winston.transports.Console({
            format: winston.format.combine(
              winston.format.colorize(),
              winston.format.timestamp({
                format: 'YYYY-MM-DD HH:mm:ss'
              }),
              winston.format.printf(({ timestamp, level, message }) => {
                return `${timestamp} ${level}: ${LoggerService.formatMessage(message)}`;
              })
            ),
          }),
          new winston.transports.DailyRotateFile({
            filename: 'logs/app-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            maxFiles: '7d',
            maxSize: '20m',
            zippedArchive: true,
          }),
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