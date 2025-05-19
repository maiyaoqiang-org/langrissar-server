import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ClassSerializerInterceptor, ValidationPipe, Logger, ConsoleLogger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { LoggerService } from './common/services/logger.service';

class CustomLogger extends ConsoleLogger {
  getTimestamp() {
    const localeStringOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric' as const,
      month: '2-digit' as const,
      day: '2-digit' as const,
      hour: '2-digit' as const,
      minute: '2-digit' as const,
      second: '2-digit' as const,
      hour12: false
    };
    return new Date().toLocaleString('zh-CN', localeStringOptions).replace(',', '');
  }
}

async function bootstrap() {
  // 设置时区为上海
  process.env.TZ = 'Asia/Shanghai';
  
  const app = await NestFactory.create(AppModule, {
    logger: new CustomLogger(),
  });
  
  // 启用基本的 CORS 支持，让浏览器处理跨域限制
  app.enableCors();
  
  // 只在非生产环境启用 Swagger
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Langrisser API')
      .setDescription('Langrisser 游戏 API 文档')
      .setVersion('1.0')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);
  }

  app.useGlobalInterceptors(new ClassSerializerInterceptor(new Reflector()));
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,       // 自动删除 DTO 外的字段
      // forbidNonWhitelisted: true, // 拒绝包含非白名单字段的请求
    }),
  );
  app.useGlobalInterceptors(new LoggingInterceptor());
  await app.listen(3000, '0.0.0.0');
}
bootstrap();

const logger = LoggerService.getInstance();

// 替换全局的 console.log
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleInfo = console.info;

console.log = (...args) => {
  logger.info(args);
  originalConsoleLog.apply(console, args);
};

console.error = (...args) => {
  logger.error(args);
  originalConsoleError.apply(console, args);
};

console.warn = (...args) => {
  logger.warn(args);
  originalConsoleWarn.apply(console, args);
};

console.info = (...args) => {
  logger.info(args);
  originalConsoleInfo.apply(console, args);
};
