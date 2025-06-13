import { Injectable, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as NacosClient from "nacos";
import { LoggerService } from "../common/services/logger.service";
import { defaultConfigs } from "./defaultConfigs";

const useNacos = false

interface NacosConfigOptions {
  defaultValue?: any;
  parseJson?: boolean;
}

@Injectable()
export class NacosService implements OnModuleInit {
  private readonly logger = LoggerService.getInstance();
  private configClient: any;
  private configs: Map<string, string> = new Map();
  private defaultConfigs: Record<string, string> = defaultConfigs;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    // 仅非本地环境初始化 nacos
    if (useNacos) {
      try {
        this.configClient = new NacosClient.NacosConfigClient({
          serverAddr: this.configService.get<string>("NACOS_SERVER_ADDR"),
          namespace: this.configService.get<string>("NACOS_NAMESPACE"),
        });

        await this.configClient.ready();
        this.logger.info("Nacos 配置客户端初始化成功");
      } catch (error) {
        this.logger.error(`Nacos 配置客户端初始化失败: ${error.message}`);
      }
    }
  }

  /**
   * 加载配置并缓存
   * @param configKey 配置键名
   * @param dataId Nacos dataId
   * @param group Nacos group
   */
  async loadConfig(dataId: string, group: string): Promise<void> {
    if (!useNacos) {
      // 本地环境直接用本地配置
      if (this.defaultConfigs[dataId]) {
        this.configs.set(dataId, this.defaultConfigs[dataId]);
        this.logger.info(`本地环境加载本地配置 ${dataId}`);
      }
      return;
    }
    try {
      const value = await this.configClient.getConfig(dataId, group);
      if (value) {
        this.configs.set(dataId, value);
        this.logger.info(`成功加载配置 ${dataId} 从 Nacos`);
      } else if (this.defaultConfigs[dataId]) {
        // Nacos 没有值 fallback 到本地
        this.configs.set(dataId, this.defaultConfigs[dataId]);
        this.logger.warn(`Nacos 未获取到 ${dataId}，使用本地配置`);
      }

      // 监听配置变更
      this.configClient.subscribe(
        {
          dataId,
          group,
        },
        (content: string) => {
          this.configs.set(dataId, content);
          this.logger.info(`配置 ${dataId} 已更新`);
        }
      );
    } catch (error) {
      this.logger.error(`加载配置 ${dataId} 失败: ${error.message}`);
      // 失败时 fallback 到本地
      if (this.defaultConfigs[dataId]) {
        this.configs.set(dataId, this.defaultConfigs[dataId]);
        this.logger.warn(`加载配置 ${dataId} 失败，使用本地配置`);
      }
    }
  }

  /**
   * 获取配置值
   * @param key 配置键名
   * @param options 配置选项，包含 defaultValue 和 parseJson
   * @returns 配置值
   */
  getConfig(key: string, options?: NacosConfigOptions): any {
    const { defaultValue = "", parseJson = true } = options || {};
    const value = this.configs.get(key) || this.defaultConfigs[key] || defaultValue;
    
    // 如果启用了JSON解析，尝试将字符串解析为JSON对象
    if (parseJson && typeof value === 'string') {
      try {
        // 检查字符串是否像JSON（以{开头和}结尾，或以[开头和]结尾）
        if ((value.trim().startsWith('{') && value.trim().endsWith('}')) ||
            (value.trim().startsWith('[') && value.trim().endsWith(']'))) {
          return JSON.parse(value);
        }
      } catch (error) {
        this.logger.warn(`配置 ${key} 解析JSON失败: ${error.message}`);
      }
    }
    
    return value;
  }

  /**
   * 异步获取配置值，如果配置未加载则先加载
   * @param dataId Nacos dataId
   * @param group Nacos group
   * @param options 配置选项，包含 defaultValue 和 parseJson
   * @returns 配置值或默认值
   */
  async getConfigAsync(
    dataId: string,
    group: string,
    options?: NacosConfigOptions
  ): Promise<any> {
    if (!this.configs.has(dataId)) {
      this.logger.info(`配置 ${dataId} 未加载，正在加载...`);
      await this.loadConfig(dataId, group);
    }
    return this.getConfig(dataId, options);
  }
}
