import axios from "axios";
import { HttpException, NotFoundException } from "../exceptions/HttpException";
import { normalizarNumeroProcesso } from "../utils/normalizarNumeroProcesso";
import { resolveTribunalAlias } from "../utils/resolveTribunalAlias";

const DATAJUD_BASE_URL = process.env.DATAJUD_BASE_URL || "https://api-publica.datajud.cnj.jus.br";
const DATAJUD_TIMEOUT_EM_MS = 15000;

export type ComplementoDatajud = {
  codigo: number;
  valor: number;
  nome: string;
  descricao: string;
};

export type MovimentoDatajud = {
  codigo: number;
  nome: string;
  dataHora: string;
  complementosTabelados?: ComplementoDatajud[];
  orgaoJulgador?: {
    codigo: string;
    nome: string;
  };
};

export type ProcessoDatajud = {
  numeroProcesso: string;
  movimentos?: MovimentoDatajud[];
};

export const DatajudService = {
  async consultarProcesso(numeroProcesso: string): Promise<ProcessoDatajud> {
    const apiKey = process.env.DATAJUD_API_KEY;
    if (!apiKey) {
      console.error("DATAJUD_API_KEY não configurada");
      throw new HttpException(500, "Não foi possível consultar o DataJud.");
    }

    const numeroNormalizado = normalizarNumeroProcesso(numeroProcesso);
    const alias = resolveTribunalAlias(numeroNormalizado);

    try {
      const resposta = await axios.post(
        `${DATAJUD_BASE_URL}/api_publica_${alias}/_search`,
        { query: { match: { numeroProcesso: numeroNormalizado } } },
        {
          timeout: DATAJUD_TIMEOUT_EM_MS,
          headers: {
            Authorization: `APIKey ${apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      const fonte = resposta.data?.hits?.hits?.[0]?._source;
      if (!fonte) throw new NotFoundException("Processo não localizado no DataJud.");

      return fonte;
    } catch (erro: any) {
      if (erro instanceof HttpException) throw erro;
      throw traduzirErro(erro, alias);
    }
  },
};

function traduzirErro(erro: any, alias: string): HttpException {
  const status = erro?.response?.status;

  if (erro?.code === "ECONNABORTED") {
    console.error(`Timeout ao consultar o DataJud (${alias})`);
    return new HttpException(504, "Não foi possível consultar o DataJud agora. Tente novamente mais tarde.");
  }

  if (status === 401 || status === 403) {
    console.error(`DataJud recusou a credencial (${alias}), status ${status}`);
    return new HttpException(500, "Não foi possível consultar o DataJud.");
  }

  if (status === 429) {
    console.error(`Limite de consultas ao DataJud atingido (${alias})`);
    return new HttpException(429, "Não foi possível consultar o DataJud agora. Tente novamente mais tarde.");
  }

  if (status >= 500) {
    console.error(`DataJud indisponível (${alias}), status ${status}`);
    return new HttpException(502, "Não foi possível consultar o DataJud agora. Tente novamente mais tarde.");
  }

  console.error(`Falha ao consultar o DataJud (${alias}), status ${status ?? "sem resposta"}`);
  return new HttpException(502, "Não foi possível consultar o DataJud.");
}
