import { v4 as uuidv4 } from 'uuid';
import { PastaRepository } from '../../pasta/repositories/PastaRepository';
import { Arquivo } from '../models/Arquivo';
import { ArquivoRepository } from '../repositories/ArquivoRepository';
import { uploadFile } from '../../../controllers/s3Controller';

export const ArquivoService = {

  async list(tenantId: string, pastaId: string): Promise<Arquivo[]> {
    const pasta = await PastaRepository.findOneBy({ id: pastaId, tenantId });
    if (!pasta) {
      throw { status: 404, message: "Pasta não encontrada" };
    }

    return ArquivoRepository.findBy({ pastaId, tenantId });
  },

  async get(tenantId: string, arquivoId: string): Promise<Arquivo> {
    if (arquivoId == null) {
      throw { status: 400, message: "ID do arquivo é obrigatório" };
    }

    const arquivo = await ArquivoRepository.findOneBy({ id: arquivoId, tenantId });
    if (!arquivo) {
      throw { status: 404, message: "Arquivo não encontrado" };
    }

    return arquivo;
  },

  async create(tenantId: string, pastaId: string, file?: Express.Multer.File): Promise<Arquivo> {
    if (!file) throw { status: 400, message: "Nenhum arquivo enviado." };

    const pasta = await PastaRepository.findOneBy({ id: pastaId, tenantId });
    if (!pasta) throw { status: 404, message: "Pasta não encontrada" };

    const allowedMimeTypes = [
      'application/pdf',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'text/csv', 'text/plain',
      'video/mp4',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw { status: 400, message: 'Tipo de arquivo não permitido' };
    }

    const isVideo = file.mimetype === 'video/mp4';

    let buffer = file.buffer;
    if (buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
      buffer = buffer.subarray(3);
    }

    const textBased = ['text/csv', 'text/plain'].includes(file.mimetype);

    if (isVideo) {
      const isValidVideo = buffer.toString('ascii', 4, 8) === 'ftyp';

      if (!isValidVideo) {
        throw { status: 400, message: 'Arquivo com formato interno inválido' };
      }
    } else if (!textBased) {
      const header = buffer.toString('hex', 0, 4);
      const isKnown = /^(25504446|89504e47|ffd8ff|47494638|52494646|504b0304|d0cf11e0)/.test(header);

      if (!isKnown) {
        console.error(`Assinatura inválida: ${header} para tipo ${file.mimetype}`);
        throw { status: 400, message: 'Arquivo com formato interno inválido' };
      }
    }

    const extensionMap: Record<string, string> = {
      'application/pdf': 'pdf',
      'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp',
      'application/vnd.ms-excel': 'xls',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'text/csv': 'csv',
      'text/plain': 'txt',
      'video/mp4': 'mp4',
    };

    const extension = extensionMap[file.mimetype] || 'bin';
    const fileNameKey = `${uuidv4()}.${extension}`;
    const fileName = file.filename

    const uploadResult = await uploadFile({
      fileName,
      fileNameKey,
      fileType: file.mimetype,
      buffer: buffer,
    });

    if (!uploadResult.success) {
      throw { status: 500, message: "Erro no upload do arquivo" };
    }

    const newArquivo = ArquivoRepository.create({
      id: uuidv4(),
      pastaId,
      tenantId,
      nome: Buffer.from(file.originalname, 'latin1').toString('utf8'),
      nomeFisico: fileNameKey,
      url: uploadResult.data?.fileUrl!
    });

    await PastaRepository.update(pastaId, { dataUltimaModificacao: new Date() });

    return ArquivoRepository.save(newArquivo);
  },

  async update(tenantId: string, arquivoId: string, data: Partial<Arquivo>): Promise<Arquivo> {
    const arquivo = await ArquivoRepository.findOneBy({ id: arquivoId, tenantId });
    if (!arquivo) {
      throw { status: 404, message: "Arquivo não encontrado" };
    }

    ArquivoRepository.merge(arquivo, data);

    if (arquivo.pastaId) {
      await PastaRepository.update(arquivo.pastaId, {
        dataUltimaModificacao: new Date()
      });
    }

    return ArquivoRepository.save(arquivo);
  },

  async remove(tenantId: string, arquivoId: string): Promise<void> {
    const arquivo = await ArquivoRepository.findOneBy({ id: arquivoId, tenantId });
    if (!arquivo) {
      throw { status: 404, message: "Arquivo não encontrado" };
    }

    const pastaId = arquivo.pastaId;

    await ArquivoRepository.remove(arquivo);

    if (pastaId) {
      await PastaRepository.update(pastaId, {
        dataUltimaModificacao: new Date()
      });
    }
  },
};