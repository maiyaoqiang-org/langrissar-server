import { ForbiddenException, Global, Injectable, Module } from '@nestjs/common';

/**
 * 浏览器任务共享锁：截图与爬虫等需要启动 Chromium 的任务共用一把锁，
 * 保证同一时刻只有一个浏览器任务在运行（服务器内存有限，两个 Chromium 会打满内存）
 */
@Injectable()
export class BrowserTaskLockService {
  /** 当前持有锁的任务名，null 表示空闲 */
  private holder: string | null = null;

  /** 尝试获取锁，已被占用时抛出 403 异常（不排队，直接拒绝） */
  acquire(taskName: string) {
    if (this.holder) {
      throw new ForbiddenException(`服务器正在处理${this.holder}任务，请稍后再试`);
    }
    this.holder = taskName;
  }

  /** 释放锁 */
  release() {
    this.holder = null;
  }
}

/** 全局共享锁模块，各浏览器任务模块可直接注入使用，无需重复 import */
@Global()
@Module({
  providers: [BrowserTaskLockService],
  exports: [BrowserTaskLockService],
})
export class BrowserTaskLockModule {}