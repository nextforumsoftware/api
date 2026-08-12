import { v4 as uuidv4 } from 'uuid';
import { ILike } from 'typeorm';
import { Jurisprudencia } from '../models/Jurisprudencia';
import { JurisprudenciaRepository } from '../repositories/JurisprudenciaRepository';
import { OrigemJurisprudenciaEnum } from '../models/OrigemJurisprudenciaEnum';
import { TipoAcaoJurisprudenciaEnum } from '../models/TipoAcaoJurisprudenciaEnum';
import { uploadFile, deleteFile } from '../../../controllers/s3Controller';

type ListFilters = {
  termo?: string;
  tribunal?: string;
  tipoAcao?: string;
}

const EXTENSAO_POR_MIME_TYPE: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
};

export const JurisprudenciaService = {
  async list(
    tenantId: string,
    page: number = 1,
    rpp: number = 20,
    filters: ListFilters = {}
  ): Promise<{ list: Jurisprudencia[], more: boolean, page: number, rpp: number }> {
    const { termo, tribunal, tipoAcao } = filters;

    const baseWhere: any = {
      tenantId,
      ...(tribunal && { tribunal: ILike(`%${tribunal}%`) }),
      ...(tipoAcao && { tipoAcao: validarTipoAcao(tipoAcao) }),
    };

    const where = termo
      ? [
          { ...baseWhere, titulo: ILike(`%${termo}%`) },
          { ...baseWhere, ementa: ILike(`%${termo}%`) },
          { ...baseWhere, numeroProcesso: ILike(`%${termo}%`) },
          { ...baseWhere, tema: ILike(`%${termo}%`) },
        ]
      : [baseWhere];

    const [list, total] = await JurisprudenciaRepository.findAndCount({
      where,
      skip: (page - 1) * rpp,
      take: rpp,
      order: { 
        favorito: -1,
        createdAt: 'DESC' 
      },
    });

    return { list, more: page * rpp < total, page, rpp };
  },

  async get(tenantId: string, id: string): Promise<Jurisprudencia> {
    if (id == null) throw { status: 400, message: "Jurisprudência não encontrada" };

    const jurisprudencia = await JurisprudenciaRepository.findOneBy({ id, tenantId });
    if (!jurisprudencia) throw { status: 404, message: "Jurisprudência não encontrada" };

    return jurisprudencia;
  },

  async create(
    tenantId: string,
    userId: string,
    data: Partial<Jurisprudencia>,
    file?: Express.Multer.File
  ): Promise<Jurisprudencia> {
    if (!data.titulo) throw { status: 400, message: "Título é obrigatório" };

    const temLink = !!data.link;
    const temArquivo = !!file;

    if (temLink === temArquivo) {
      throw { status: 400, message: "Informe um link ou envie um arquivo, não os dois" };
    }

    const novaJurisprudencia: Partial<Jurisprudencia> = {
      id: uuidv4(),
      tenantId,
      createdByUserId: userId,
      titulo: data.titulo,
      tipoAcao: data.tipoAcao !== undefined ? validarTipoAcao(data.tipoAcao) : TipoAcaoJurisprudenciaEnum.OUTROS,
      favorito: data.favorito ?? false,
      ...(data.tribunal !== undefined && { tribunal: data.tribunal }),
      ...(data.numeroProcesso !== undefined && { numeroProcesso: data.numeroProcesso }),
      ...(data.ementa !== undefined && { ementa: data.ementa }),
      ...(data.tema !== undefined && { tema: data.tema }),
      ...(data.dataJulgamento !== undefined && { dataJulgamento: data.dataJulgamento }),
      ...(data.relator !== undefined && { relator: data.relator }),
      ...(data.orgaoJulgador !== undefined && { orgaoJulgador: data.orgaoJulgador }),
      ...(data.anotacaoPessoal !== undefined && { anotacaoPessoal: data.anotacaoPessoal }),
    };

    if (temLink) {
      novaJurisprudencia.origem = OrigemJurisprudenciaEnum.LINK;
      novaJurisprudencia.link = validarUrl(data.link!);
    } else {
      const arquivoSalvo = await enviarArquivoParaS3(file!);
      novaJurisprudencia.origem = OrigemJurisprudenciaEnum.UPLOAD;
      novaJurisprudencia.arquivoUrl = arquivoSalvo.url;
      novaJurisprudencia.arquivoChaveS3 = arquivoSalvo.chave;
      novaJurisprudencia.arquivoNomeOriginal = arquivoSalvo.nomeOriginal;
    }

    const jurisprudencia = JurisprudenciaRepository.create(novaJurisprudencia);
    return JurisprudenciaRepository.save(jurisprudencia);
  },

  async update(tenantId: string, id: string, data: Partial<Jurisprudencia>): Promise<Jurisprudencia> {
    const jurisprudencia = await JurisprudenciaRepository.findOneBy({ id, tenantId });
    if (!jurisprudencia) throw { status: 404, message: "Jurisprudência não encontrada" };

    const camposEditaveis: Partial<Jurisprudencia> = {
      ...(data.titulo !== undefined && { titulo: data.titulo }),
      ...(data.tribunal !== undefined && { tribunal: data.tribunal }),
      ...(data.numeroProcesso !== undefined && { numeroProcesso: data.numeroProcesso }),
      ...(data.ementa !== undefined && { ementa: data.ementa }),
      ...(data.tema !== undefined && { tema: data.tema }),
      ...(data.dataJulgamento !== undefined && { dataJulgamento: data.dataJulgamento }),
      ...(data.relator !== undefined && { relator: data.relator }),
      ...(data.orgaoJulgador !== undefined && { orgaoJulgador: data.orgaoJulgador }),
      ...(data.tipoAcao !== undefined && { tipoAcao: validarTipoAcao(data.tipoAcao) }),
      ...(data.anotacaoPessoal !== undefined && { anotacaoPessoal: data.anotacaoPessoal }),
      ...(data.favorito !== undefined && { favorito: data.favorito }),
    };

    JurisprudenciaRepository.merge(jurisprudencia, camposEditaveis);
    return JurisprudenciaRepository.save(jurisprudencia);
  },

  async remove(tenantId: string, id: string): Promise<void> {
    const jurisprudencia = await JurisprudenciaRepository.findOneBy({ id, tenantId });
    if (!jurisprudencia) throw { status: 404, message: "Jurisprudência não encontrada" };

    if (jurisprudencia.arquivoChaveS3) {
      const resultado = await deleteFile(jurisprudencia.arquivoChaveS3);
      if (!resultado.success) {
        console.error(`Falha ao excluir arquivo ${jurisprudencia.arquivoChaveS3} do S3: ${resultado.error}`);
      }
    }

    await JurisprudenciaRepository.remove(jurisprudencia);
  },
};

function validarTipoAcao(tipoAcao: string): TipoAcaoJurisprudenciaEnum {
  if (!Object.values(TipoAcaoJurisprudenciaEnum).includes(tipoAcao as TipoAcaoJurisprudenciaEnum)) {
    throw { status: 400, message: "Tipo de ação inválido" };
  }
  return tipoAcao as TipoAcaoJurisprudenciaEnum;
}

function validarUrl(link: string): string {
  try {
    const url = new URL(link);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error('protocolo não suportado');
    }
    return link;
  } catch {
    throw { status: 400, message: "Link informado não é uma URL válida" };
  }
}

async function enviarArquivoParaS3(file: Express.Multer.File) {
  const extensao = EXTENSAO_POR_MIME_TYPE[file.mimetype];
  if (!extensao) {
    throw { status: 400, message: "Tipo de arquivo não permitido" };
  }

  const header = file.buffer.toString('hex', 0, 4);
  const assinaturaValida = /^(25504446|504b0304|d0cf11e0)/.test(header);
  if (!assinaturaValida) {
    throw { status: 400, message: "Arquivo com formato interno inválido" };
  }

  const fileNameKey = `jurisprudencias/${uuidv4()}.${extensao}`;

  const uploadResult = await uploadFile({
    fileName: file.originalname,
    fileNameKey,
    fileType: file.mimetype,
    buffer: file.buffer,
  });

  if (!uploadResult.success) {
    throw { status: 500, message: "Erro no upload do arquivo" };
  }

  return {
    url: uploadResult.data!.fileUrl,
    chave: fileNameKey,
    nomeOriginal: Buffer.from(file.originalname, 'latin1').toString('utf8'),
  };
}
