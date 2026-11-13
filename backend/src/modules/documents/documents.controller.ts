import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseInterceptors,
  UploadedFile,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { DocumentsService } from './documents.service.js';
import { PdfIntelligenceService } from './pdf-intelligence.service.js';
import {
  CreateDocumentDto,
  PdfIntelligenceRequestDto,
  UpdateDocumentHealthDto,
} from './dto/create-document.dto.js';

@Controller('documents')
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly pdfIntelligenceService: PdfIntelligenceService,
  ) {}

  @Post('pdf-classify')
  @UseInterceptors(FileInterceptor('file'))
  async classifyAndRenamePdf(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: PdfIntelligenceRequestDto,
  ) {
    return this.pdfIntelligenceService.classifyAndRenamePdf(file, dto);
  }

  @Post('invoice-audit')
  @UseInterceptors(FileInterceptor('file'))
  async auditInvoicePdf(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: PdfIntelligenceRequestDto,
  ) {
    return this.pdfIntelligenceService.auditInvoicePdf(file, dto);
  }

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateDocumentDto,
  ) {
    return this.documentsService.create(file, dto);
  }

  @Get()
  async findAll(
    @Query('category') category?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.documentsService.findAll({ category, status, search });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.documentsService.findOne(id);
  }

  @Post(':id/verify-integrity')
  async verifyIntegrity(@Param('id') id: string) {
    return this.documentsService.verifyIntegrity(id);
  }

  @Post(':id/recover')
  async recover(
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ) {
    return this.documentsService.recover(id, reason);
  }

  @Patch(':id/health')
  async updateHealth(
    @Param('id') id: string,
    @Body() dto: UpdateDocumentHealthDto,
  ) {
    return this.documentsService.updateHealth(id, dto);
  }

  @Delete(':id')
  async softDelete(@Param('id') id: string) {
    return this.documentsService.softDelete(id);
  }

  @Get(':id/download')
  async downloadFile(
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const { stream, fileName, mimeType } = await this.documentsService.getFileStream(id);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    stream.pipe(res);
  }
}
