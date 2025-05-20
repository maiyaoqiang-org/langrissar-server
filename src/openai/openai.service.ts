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
import { QueryChatRecordDto } from "./dto/query-chat-record.dto";
import * as ExcelJS from 'exceljs'; // 导入 exceljs
import * as fs from 'fs'; // 导入 fs 模块
import * as path from 'path'; // 导入 path 模块

@Injectable()
export class OpenAIService {
  private openai: OpenAI;
  private readonly logger = LoggerService.getInstance();

  constructor(
    @InjectRepository(Openai)
    private openaiRepository: Repository<Openai>,
    @InjectRepository(ChatRecord)
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

  /**
   * 分页查询聊天记录
   * @param queryDto 查询参数
   * @returns 聊天记录列表和总数
   */
  async findChatRecords(queryDto: QueryChatRecordDto) {
    const query = this.chatRecordRepository
      .createQueryBuilder("chatRecord")
      .leftJoinAndSelect("chatRecord.openaiConfig", "openaiConfig") // 如果需要关联查询配置信息
      .leftJoinAndSelect("chatRecord.user", "user") // 如果需要关联查询用户信息
      .orderBy("chatRecord.createdAt", "DESC");

    // 添加过滤条件
    if (queryDto.requestContent) {
      query.andWhere("chatRecord.requestContent LIKE :requestContent", {
        requestContent: `%${queryDto.requestContent}%`,
      });
    }
    if (queryDto.responseContent) {
      query.andWhere("chatRecord.responseContent LIKE :responseContent", {
        responseContent: `%${queryDto.responseContent}%`,
      });
    }
    if (queryDto.status) {
      query.andWhere("chatRecord.status = :status", { status: queryDto.status });
    }
    if (queryDto.openaiConfigId) {
      query.andWhere("chatRecord.openaiConfigId = :openaiConfigId", {
        openaiConfigId: queryDto.openaiConfigId,
      });
    }
    if (queryDto.userId) {
      query.andWhere("chatRecord.userId = :userId", { userId: queryDto.userId });
    }

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

  /**
   * 导出聊天记录到Excel
   * @param queryDto 包含导出日期和过滤条件的查询参数
   * @returns Excel 文件 Buffer
   */
  async exportChatRecords(queryDto: QueryChatRecordDto & { exportDate: string }): Promise<Buffer> {
    const { exportDate, ...filterParams } = queryDto;

    // 构建日期范围查询条件
    const startDate = new Date(exportDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(exportDate);
    endDate.setHours(23, 59, 59, 999);

    const query = this.chatRecordRepository
      .createQueryBuilder("chatRecord")
      .leftJoinAndSelect("chatRecord.openaiConfig", "openaiConfig")
      .leftJoinAndSelect("chatRecord.user", "user")
      .where("chatRecord.createdAt BETWEEN :startDate AND :endDate", { startDate, endDate }) // 按日期过滤
      .orderBy("chatRecord.createdAt", "ASC"); // 按时间正序排列

    // 添加其他过滤条件 (与 findChatRecords 类似)
    if (filterParams.requestContent) {
      query.andWhere("chatRecord.requestContent LIKE :requestContent", {
        requestContent: `%${filterParams.requestContent}%`,
      });
    }
    if (filterParams.responseContent) {
      query.andWhere("chatRecord.responseContent LIKE :responseContent", {
        responseContent: `%${filterParams.responseContent}%`,
      });
    }
    if (filterParams.status) {
      query.andWhere("chatRecord.status = :status", { status: filterParams.status });
    }
    if (filterParams.openaiConfigId) {
      query.andWhere("chatRecord.openaiConfigId = :openaiConfigId", {
        openaiConfigId: filterParams.openaiConfigId,
      });
    }
    if (filterParams.userId) {
      query.andWhere("chatRecord.userId = :userId", { userId: filterParams.userId });
    }


    const records = await query.getMany();

    // 创建 Excel 工作簿和工作表
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('聊天记录');

    // 定义列
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: '模型', key: 'model', width: 20 },
      { header: '请求内容', key: 'requestContent', width: 50 },
      { header: '响应内容', key: 'responseContent', width: 50 },
      { header: '状态', key: 'status', width: 15 },
      { header: '错误信息', key: 'errorMessage', width: 30 },
      { header: '创建时间', key: 'createdAt', width: 20 },
      // { header: '用户', key: 'username', width: 15 }, // 如果关联了用户
    ];

    // 添加数据行
    records.forEach(record => {
      worksheet.addRow({
        id: record.id,
        model: record.openaiConfig?.model || 'N/A', // 如果关联了配置
        requestContent: record.requestContent,
        responseContent: record.responseContent,
        status: record.status,
        errorMessage: record.errorMessage,
        createdAt: record.createdAt.toISOString(), // 或者根据需要格式化日期
        // username: record.user?.username || 'N/A', // 如果关联了用户
      });
    });

    // 生成 Buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as Buffer;
  }
}
