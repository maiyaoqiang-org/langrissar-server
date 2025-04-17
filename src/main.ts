import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
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
  await app.listen(3000, '0.0.0.0');
}
bootstrap();
