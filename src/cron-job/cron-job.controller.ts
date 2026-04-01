import { Controller, Get, Post, Put, Delete, Body, Param, Query, ParseIntPipe } from '@nestjs/common';
import { CronJobService } from './cron-job.service';
import { CreateCronJobDto } from './dto/create-cron-job.dto';
import { UpdateCronJobDto } from './dto/update-cron-job.dto';
import { QueryCronJobDto } from './dto/query-cron-job.dto';
import { QueryCronJobLogDto } from './dto/query-cron-job-log.dto';
import { Public } from '../auth/public.decorator';

@Controller('cron-job')
export class CronJobController {
  constructor(private readonly cronJobService: CronJobService) {}

  @Post()
  create(@Body() createCronJobDto: CreateCronJobDto) {
    return this.cronJobService.create(createCronJobDto);
  }

  @Get()
  findAll(@Query() query: QueryCronJobDto) {
    return this.cronJobService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.cronJobService.findOne(id);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateCronJobDto: UpdateCronJobDto) {
    return this.cronJobService.update(id, updateCronJobDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.cronJobService.remove(id);
  }

  @Put(':id/toggle')
  toggleStatus(@Param('id', ParseIntPipe) id: number) {
    return this.cronJobService.toggleStatus(id);
  }

  @Post(':id/execute')
  manualExecute(@Param('id', ParseIntPipe) id: number) {
    return this.cronJobService.manualExecute(id);
  }

  @Get(':id/stats')
  getStats(@Param('id', ParseIntPipe) id: number) {
    return this.cronJobService.getJobStats(id);
  }

  @Get('logs/list')
  getLogs(@Query() query: QueryCronJobLogDto) {
    return this.cronJobService.getLogs(query);
  }

  @Post('validate-cron')
  validateCron(@Body('expression') expression: string) {
    return this.cronJobService.validateCron(expression);
  }
}
