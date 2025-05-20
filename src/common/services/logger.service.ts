import * as winston from 'winston';
import Transport from 'winston-transport';
import WinstonLoki from 'winston-loki';

export class LoggerService {
  private static instance: winston.Logger;
  private static readonly MAX_RETRIES = 3;
  private static retryCount = 0;

  private static readonly defaultConfig = {
    loki: {
      host: process.env.LOKI_HOST || 'http://localhost:3100',
      labels: {
        app: 'langrissar-server',
        environment: process.env.NODE_ENV || 'development'
      },
      json: true,
      format: winston.format.json(),
      replaceTimestamp: true,
      interval: 5000,
      batching: true,
      timeout: 10000,
      gracefulShutdown: true
    }
  };

  public static getInstance(): winston.Logger {
    if (!LoggerService.instance) {
      LoggerService.instance = winston.createLogger({
        level: process.env.LOG_LEVEL || 'info',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.printf(({ timestamp, level, message }) => {
            return `${timestamp} ${level}: ${message}`;
          })
        ),
        transports: [
          new winston.transports.Console({
            format: winston.format.simple(),
          })
        ]
      });

      this.initLokiTransport();
    }
    return LoggerService.instance;
  }

  private static initLokiTransport(): void {
    try {
      const lokiTransport = new WinstonLoki(this.defaultConfig.loki);
      
      lokiTransport.on('error', (error) => {
        console.error('Loki transport error:', error);
        this.handleLokiError();
      });

      lokiTransport.on('connect', () => {
        console.log('Successfully connected to Loki');
        this.retryCount = 0;
      });

      LoggerService.instance.add(lokiTransport);
    } catch (error) {
      console.error('Failed to initialize Loki transport:', error);
      this.handleLokiError();
    }
  }

  private static handleLokiError(): void {
    if (this.retryCount < this.MAX_RETRIES) {
      this.retryCount++;
      const retryDelay = Math.min(1000 * Math.pow(2, this.retryCount), 30000);
      console.log(`Retrying Loki connection in ${retryDelay}ms (attempt ${this.retryCount}/${this.MAX_RETRIES})`);
      
      setTimeout(() => {
        this.initLokiTransport();
      }, retryDelay);
    } else {
      console.error('Max retry attempts reached for Loki transport');
    }
  }
}