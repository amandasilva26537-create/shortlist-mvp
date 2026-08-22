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
