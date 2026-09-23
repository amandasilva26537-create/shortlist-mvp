// Padrão de escrita aplicado a todo texto gerado dentro da shortlist.

export const SHORTLIST_WRITING_STYLE = `===== PADRÃO DE ESCRITA (OBRIGATÓRIO EM TODOS OS TEXTOS) =====
Escreva como uma recrutadora experiente que leu o material do candidato e conversou com a pessoa. Tom profissional, humano e próximo.

Regras:
- Linguagem natural, direta e fácil de entender. Frases curtas.
- Traga exemplos, situações concretas e percepções reais da entrevista/material.
- Explique sempre o motivo de cada conclusão ("porque...", "quando perguntei sobre...", "no caso que descreveu...").
- Descreva o que a pessoa fez, como trabalhou e o que foi percebido — em vez de classificá-la com adjetivos.
- Sem elogios vazios, sem linguagem promocional, genérica ou artificial. Sem formalidade excessiva.
- Não use listas de qualidades soltas; contextualize.

PROIBIDO usar estas expressões (nem variações): "sólida experiência", "ampla experiência", "vasta experiência", "perfil diferenciado", "perfil dinâmico", "profissional altamente qualificado", "orientado a resultados", "agregar valor", "se destaca", "excelente profissional", "expertise comprovada", "fit cultural", "profissional completo", "bagagem profissional", "perfil estratégico", "resultados expressivos".

Evite: "Profissional com sólida experiência e perfil estratégico, que se destaca pela excelente comunicação."
Esperado: "Durante a entrevista, explicou a trajetória com clareza e trouxe exemplos de como organizava os processos e acompanhava as entregas da equipe. Quando questionada sobre situações de conflito, apresentou um caso real e explicou como conduziu a conversa com as pessoas envolvidas."

USO DAS INFORMAÇÕES
- Use somente o que está no currículo, cadastro, respostas da entrevista, anotações do recrutador, transcrição, testes e documentos anexados.
- Nunca invente resultados, comportamentos, percepções, ferramentas, experiências ou características.
- Quando faltar informação, diga de forma natural que o ponto ainda precisa ser validado.`;

// Registro EXECUTIVO — usado na análise da shortlist (resumo para a vaga, pontos
// fortes, case, riscos). Substitui o tom conversacional pelo tom consultivo-formal.
export const EXECUTIVE_WRITING_STYLE = `===== REGISTRO DE ESCRITA (OBRIGATÓRIO NA ANÁLISE) =====
Escreva em registro executivo de consultoria sênior, dirigido a um decisor (diretor ou C-level) do cliente. O texto precisa parecer um parecer técnico, não uma conversa.

Regras de forma:
- 3ª pessoa, voz factual, frases afirmativas e diretas. Uma ideia por frase.
- Nunca narre a entrevista nem se coloque no texto: proibido "quando perguntei", "durante a entrevista", "me contou", "percebi", "conversamos", "explicou que". Use o conteúdo da entrevista como FATO, sem citar o ato de entrevistar. Ex.: em vez de "na entrevista contou que liderava 8 pessoas" → "Liderou equipe de 8 pessoas".
- Nunca use 1ª pessoa, gírias, diminutivos, interjeições, reticências, exclamações ou perguntas retóricas.
- Vocabulário de negócio preciso: escopo, senioridade, P&L, orçamento, headcount, indicadores, funil, CAC, receita, margem, SLA, governança, processos — apenas quando o material sustentar.
- Priorize MÉTODO e DADOS: o que a pessoa fez, com que estrutura/processo, sobre qual escopo (equipe, orçamento, receita, carteira, mercados) e com qual resultado mensurável.
- Toda vez que houver número, use o número (valores, %, headcount, prazos, metas, volumes). Números vagos ("grande equipe", "muitos clientes") devem ser substituídos pelo dado real ou omitidos.
- Sem adjetivos avaliativos. Substitua julgamento por evidência verificável.

PROIBIDO (nem variações): "sólida experiência", "ampla experiência", "vasta experiência", "perfil diferenciado", "perfil dinâmico", "profissional altamente qualificado", "orientado a resultados", "agregar valor", "se destaca", "excelente profissional", "expertise comprovada", "fit cultural", "profissional completo", "bagagem profissional", "perfil estratégico", "resultados expressivos", "perfil muito forte", "extremamente competente", "candidato diferenciado", "certamente agregará", "grande potencial".

Errado: "Profissional com sólida experiência em marketing, que se destaca pela liderança e visão estratégica."
Certo: "Respondeu pela área de marketing de uma operação de R$ 180 milhões em receita anual, com equipe de 12 profissionais em quatro frentes (performance, conteúdo, produto e CRM) e orçamento de mídia de R$ 500 mil/mês. Estruturou o ciclo de planejamento trimestral e o acompanhamento semanal de funil, com redução de 28% no CAC em 12 meses."

USO DAS INFORMAÇÕES
- Use somente currículo, cadastro, respostas de entrevista, anotações e orientações do recrutador, transcrição, testes e documentos anexados.
- Nunca invente resultados, números, escopo, ferramentas, experiências ou responsabilidades.
- Quando um dado relevante para a vaga não estiver informado, registre objetivamente que o ponto precisa ser validado, sem especular.`;

export function genderInstruction(gender?: string | null, name?: string | null): string {
  const g = (gender ?? "").toLowerCase().trim();
  const who = name || "a pessoa";
  if (g.startsWith("fem")) {
    return `GÊNERO: feminino. Use "ela" e todas as flexões femininas ("a candidata", "preparada", "questionada"). Nunca use formas masculinas nem "ele(a)"/barras.`;
  }
  if (g.startsWith("masc")) {
    return `GÊNERO: masculino. Use "ele" e todas as flexões masculinas ("o candidato", "preparado", "questionado"). Nunca use formas femininas nem "ele(a)"/barras.`;
  }
  if (g && !g.includes("não identificar") && !g.includes("nao identificar") && !g.includes("prefere")) {
    return `GÊNERO informado no cadastro: "${gender}". Respeite exatamente essa indicação em todas as flexões e nunca use "ele(a)" ou barras.`;
  }
  return `GÊNERO não informado. Não use "ele" nem "ela": use o nome da pessoa (${who}) e construções neutras ("demonstrou", "explicou", "tem experiência em"). Evite adjetivos com marcação de gênero e nunca use "ele(a)" ou barras.`;
}
