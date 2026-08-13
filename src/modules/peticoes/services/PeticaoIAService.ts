import axios from 'axios';
import { AppError, HttpException } from '../../../core/exceptions/HttpException';

const OPENAI_API_URL = process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions';
const OPENAI_MODEL = 'gpt-4.1';

export const PeticaoIAService = {
  async gerar(tipo: string, prompt: string): Promise<string> {
    if (!tipo?.trim() || !prompt?.trim()) {
      throw new AppError('Tipo e descrição do caso são obrigatórios');
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new HttpException(500, 'Geração de petição por IA não está configurada');
    }

    try {
      const response = await axios.post(
        OPENAI_API_URL,
        {
          model: OPENAI_MODEL,
          messages: [
            { role: 'system', content: buildSystemPrompt(tipo) },
            { role: 'user', content: `Caso do cliente: ${prompt}` },
          ],
          response_format: { type: 'text' },
        },
        {
          timeout: 60000,
          headers: { Authorization: `Bearer ${apiKey}` },
        }
      );

      return response.data?.choices?.[0]?.message?.content || '';
    } catch (err) {
      throw new HttpException(502, 'Erro ao gerar petição com IA. Tente novamente.');
    }
  },
};

function buildSystemPrompt(tipo: string): string {
  return `Você é um advogado especialista em direito brasileiro.

  Sua tarefa é gerar um MODELO DE PETIÇÃO JURÍDICA.

  IMPORTANTE:
  - A resposta deve ser SOMENTE uma STRING em HTML.
  - NÃO utilize markdown.
  - NÃO utilize blocos de código.
  - NÃO explique nada antes ou depois.
  - Retorne apenas o HTML puro.

  Regras de formatação:
  - Utilize apenas HTML simples compatível com editores rich text.
  - Use principalmente as seguintes tags:
  <p>, <strong>, <em>, <h2>, <h3>, <ul>, <ol>, <li>, <br>

  Estrutura obrigatória da petição:
  1. Endereçamento
  2. Qualificação das partes
  3. Dos fatos
  4. Do direito
  5. Dos pedidos
  6. Valor da causa
  7. Fechamento (Termos em que pede deferimento)

  Regras de estilo:
  - Use parágrafos <p>
  - Use <strong> para títulos importantes
  - Use <h3> para seções
  - Separe seções com espaçamento
  - Linguagem jurídica formal brasileira

  Tipo de petição:
  ${tipo}

  Retorne um modelo completo com conteúdo realista.`;
}
