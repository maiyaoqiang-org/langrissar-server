import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import OpenAI from "openai";
import { LoggerService } from "../common/services/logger.service";
import { Openai } from "./entities/openai.entity";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { CreateOpenaiDto } from "./dto/create-openai.dto";
import { UpdateOpenaiDto } from "./dto/update-openai.dto";
import { QueryOpenaiDto } from "./dto/query-openai.dto";
import { User } from "src/user/entities/user.entity";
import { ChatRecord } from "./entities/chat-record.entity";

@Injectable()
export class OpenAIService {
  private openai: OpenAI;
  private readonly logger = LoggerService.getInstance();

  constructor(
    @InjectRepository(Openai)
    private openaiRepository: Repository<Openai>,
    @InjectRepository(ChatRecord) // 注入 ChatRecordRepository
    private chatRecordRepository: Repository<ChatRecord>
  ) {
    this.openai = new OpenAI({
      apiKey:
        "pat_cwTGWpIiEJxF1Yx7bXuBA7mCDzj7ovbrfVrmEB4V0LDjYltx3R0LFMFRrl0IGDaR",
      baseURL: "https://moyuan.zeabur.app/v1",
    });
  }

  async chat(content: string) {
    // 创建聊天记录（pending状态）
    const chatRecord = this.chatRecordRepository.create({
      requestContent: content,
      status: "pending",
      // 如果需要记录用户ID，可以在这里添加 user: req.user 或 userId: req.user.id
    });
    await this.chatRecordRepository.save(chatRecord);

    try {
      this.logger.info("OpenAI API 调用开始", { content });

      const completion = await this.openai.chat.completions.create({
        messages: [{ role: "user", content }],
        model: "mengzhan",
        // temperature: 0.7,
        // max_tokens: 1000,
      });

      this.logger.info("OpenAI API 调用成功", {
        response: completion.choices[0].message,
      });
      return { replyContent: completion.choices[0].message.content };
    } catch (error) {
      this.logger.error("OpenAI API 调用失败", { error });

      chatRecord.status = "failed";
      chatRecord.errorMessage = error.message;
      await this.chatRecordRepository.save(chatRecord);

      throw new Error(`OpenAI API 调用失败: ${error.message}`);
    }
  }

  /**
   * 根据配置ID进行OpenAI Chat调用
   * @param id OpenAI配置的ID
   * @param chatPayload OpenAI Chat API的请求体
   * @returns OpenAI Chat API的响应
   */
  async chatWithConfig(id: number, content: string): Promise<any> {
    // 1. 根据ID查询OpenAI配置
    const config = await this.openaiRepository.findOne({ where: { id } });

    if (!config || !config.isActive) {
      throw new Error(`ID为 ${id} 的OpenAI配置不存在或未激活`);
    }

    // 创建聊天记录（pending状态）
    const chatRecord = this.chatRecordRepository.create({
      openaiConfigId: config.id, // 记录使用的配置ID
      requestContent: content,
      status: "pending",
      // 如果需要记录用户ID，可以在这里添加 user: req.user 或 userId: req.user.id
    });
    await this.chatRecordRepository.save(chatRecord);

    // 2. 使用查询到的配置创建OpenAI客户端
    const openai = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL || "https://api.openai.com/v1", // 使用配置中的baseURL，如果没有则使用默认值
    });

    // 3. 调用OpenAI Chat API
    try {
      const completion = await openai.chat.completions.create({
        messages: [{ role: "user", content }],
        model: config.model,
      });
      this.logger.info(
        "OpenAI API 调用成功" +
          {
            response: completion.choices[0].message,
          }.toString()
      );

      // 更新聊天记录（success状态）
      chatRecord.responseContent = completion.choices[0].message.content;
      chatRecord.status = "success";
      await this.chatRecordRepository.save(chatRecord);

      return { replyContent: completion.choices[0].message.content };
    } catch (error) {
      this.logger.error("OpenAI API 调用失败" + error.toString());

      // 更新聊天记录（failed状态）
      chatRecord.status = "failed";
      chatRecord.errorMessage = error.message;
      await this.chatRecordRepository.save(chatRecord);

      throw new Error(`调用OpenAI Chat API失败: ${error.message}`);
    }
  }

  async test(content: string) {
    try {
      return { replyContent: `老子为什么要${content}` };
    } catch (error) {
      this.logger.error("OpenAI API 调用失败", { error });
      throw new Error(`OpenAI API 调用失败: ${error.message}`);
    }
  }

  async create(createOpenaiDto: CreateOpenaiDto) {
    const openai = this.openaiRepository.create(createOpenaiDto);
    return this.openaiRepository.save(openai);
  }

  async update(id: number, updateOpenaiDto: UpdateOpenaiDto) {
    const openai = await this.openaiRepository.findOne({ where: { id } });

    if (!openai) {
      throw new BadRequestException("OpenAI配置不存在");
    }

    Object.assign(openai, updateOpenaiDto);
    return this.openaiRepository.save(openai);
  }

  async findAll(user: User, queryDto: QueryOpenaiDto) {
    const query = this.openaiRepository
      .createQueryBuilder("openai")
      .orderBy("openai.createdAt", "DESC");

    // 添加基本查询条件
    if (queryDto.model) {
      query.andWhere("openai.model = :model", { model: queryDto.model });
    }

    if (queryDto.isActive !== undefined) {
      query.andWhere("openai.isActive = :isActive", {
        isActive: queryDto.isActive,
      });
    }

    // 权限控制：
    // 如果需要根据用户角色或关联用户进行过滤，可以在这里添加逻辑
    // 例如：非管理员用户只能看到 isActive 为 true 的配置
    // if (!user.role || user.role !== 'admin') {
    //    query.andWhere('openai.isActive = true');
    // }

    const page = Number(queryDto.page) || 1;
    const pageSize = Number(queryDto.pageSize) || 10;
    const [items, total] = await query
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOne(id: number) {
    return this.openaiRepository.findOne({ where: { id } });
  }

  async remove(id: number) {
    const openai = await this.findOne(id);
    if (!openai) {
      throw new BadRequestException("OpenAI配置不存在");
    }
    return this.openaiRepository.softRemove(openai);
  }
}
