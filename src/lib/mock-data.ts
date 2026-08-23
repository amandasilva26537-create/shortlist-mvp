export type DiscType = "D" | "I" | "S" | "C" | "DI" | "DC" | "SC" | "IS" | "CS" | "ID";

export type ChecklistStatus = "yes" | "partial" | "no";

export interface Client {
  id: string;
  name: string;
  logo?: string;
  contactName: string;
  email: string;
  phone: string;
  activeJobs: number;
  shortlists: number;
}

export interface Job {
  id: string;
  clientId: string;
  title: string;
  area: string;
  workModel: "Presencial" | "Híbrido" | "Remoto";
  salaryMin: number;
  salaryMax: number;
  description: string;
  mustHave: string[];
  niceToHave: string[];
  status: "open" | "closed";
  openedAt: string;
}

export interface Candidate {
  id: string;
  fullName: string;
  photo?: string;
  currentRole: string;
  currentCompany: string;
  city: string;
  workModel: "Presencial" | "Híbrido" | "Remoto";
  salaryExpectation: number;
  age?: number;
  availability: string;
  linkedin: string;
  disc: DiscType;
  discScores: { d: number; i: number; s: number; c: number };
  overallMatch: number;
  headline: string;
  miniBio: string;
  summary: string[]; // 4 bullets
  hardSkills: { name: string; level: number }[];
  softSkills: { name: string; level: number }[];
  culturalFit: number;
  experienceYears: number;
  communication: number;
  leadership: number;
  checklist: { requirement: string; status: ChecklistStatus }[];
  radar: { competency: string; value: number }[];
  achievements: { label: string; value: string }[];
  experiences: {
    company: string;
    role: string;
    period: string;
    deliveries: string[];
    results: string[];
  }[];
  education: { institution: string; degree: string; period: string }[];
  certifications: string[];
  languages: { name: string; level: string }[];
  strengths: string[];
  attentionPoints: string[];
  risks: string[];
  potential: string;
  suggestedQuestions: string[];
}

export interface Shortlist {
  id: string;
  jobId: string;
  clientId: string;
  version: number;
  status: "draft" | "published";
  shareToken: string;
  candidateIds: string[];
  createdAt: string;
  finalists: number;
}

export const clients: Client[] = [
  {
    id: "c1",
    name: "Equatorial Energia",
    contactName: "Juliana Ramos",
    email: "juliana@equatorial.com.br",
    phone: "+55 98 99999-1010",
    activeJobs: 3,
    shortlists: 5,
  },
  {
    id: "c2",
    name: "Vale S.A.",
    contactName: "Rodrigo Menezes",
    email: "rodrigo@vale.com",
    phone: "+55 21 98888-2020",
    activeJobs: 2,
    shortlists: 3,
  },
  {
    id: "c3",
    name: "Ambev",
    contactName: "Carla Souza",
    email: "carla.souza@ambev.com.br",
    phone: "+55 11 97777-3030",
    activeJobs: 1,
    shortlists: 2,
  },
  {
    id: "c4",
    name: "Suzano",
    contactName: "Marcos Lima",
    email: "marcos@suzano.com.br",
    phone: "+55 11 96666-4040",
    activeJobs: 2,
    shortlists: 4,
  },
];

export const jobs: Job[] = [
  {
    id: "j1",
    clientId: "c1",
    title: "Gerente de Operações Comerciais",
    area: "Comercial",
    workModel: "Híbrido",
    salaryMin: 22000,
    salaryMax: 28000,
    description:
      "Liderança da operação comercial regional com foco em performance, expansão de carteira e desenvolvimento de time.",
    mustHave: [
      "10+ anos em posições de liderança comercial",
      "Experiência no setor de energia ou utilities",
      "Formação superior completa",
      "Inglês avançado",
    ],
    niceToHave: [
      "MBA em Gestão",
      "Vivência internacional",
      "Experiência com transformação digital",
    ],
    status: "open",
    openedAt: "2026-03-01",
  },
  {
    id: "j2",
    clientId: "c1",
    title: "Head de People & Culture",
    area: "RH",
    workModel: "Híbrido",
    salaryMin: 28000,
    salaryMax: 35000,
    description: "Liderança estratégica de RH regional com foco em cultura e talent management.",
    mustHave: ["8+ anos em RH estratégico", "Experiência em cultura organizacional"],
    niceToHave: ["Pós em Gestão de Pessoas"],
    status: "open",
    openedAt: "2026-03-10",
  },
  {
    id: "j3",
    clientId: "c2",
    title: "Diretor de Sustentabilidade",
    area: "ESG",
    workModel: "Presencial",
    salaryMin: 45000,
    salaryMax: 60000,
    description: "Definição da agenda ESG global da companhia.",
    mustHave: ["15+ anos em sustentabilidade corporativa"],
    niceToHave: ["Inglês fluente", "Espanhol"],
    status: "open",
    openedAt: "2026-02-15",
  },
];

const baseChecklist = (job: Job) =>
  job.mustHave.map((r, i) => ({
    requirement: r,
    status: (i === 0 ? "yes" : i === 1 ? "yes" : i === 2 ? "yes" : "partial") as ChecklistStatus,
  }));

export const candidates: Candidate[] = [
  {
    id: "cand1",
    fullName: "Amanda Ribeiro",
    photo:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=facearea&facepad=3&w=400&h=400&q=80",
    currentRole: "Gerente Comercial Sr.",
    currentCompany: "Enel Distribuição",
    city: "São Luís, MA",
    workModel: "Híbrido",
    salaryExpectation: 26000,
    availability: "30 dias",
    linkedin: "https://linkedin.com/in/amanda-ribeiro",
    disc: "DI",
    discScores: { d: 82, i: 74, s: 42, c: 55 },
    overallMatch: 92,
    headline: "Líder comercial com histórico de crescimento acima de 30% em contas B2B",
    miniBio:
      "12 anos no setor de energia, com foco em transformação de operações comerciais e desenvolvimento de líderes de alta performance.",
    summary: [
      "12 anos liderando operações comerciais no setor de energia",
      "Escalou receita regional de R$ 180M para R$ 320M em 3 anos",
      "Formou 4 gerentes hoje em posições C-level em concorrentes",
      "MBA pela Fundação Dom Cabral, inglês avançado",
    ],
    hardSkills: [
      { name: "Gestão Comercial B2B", level: 95 },
      { name: "Análise de P&L", level: 88 },
      { name: "CRM & Pipeline", level: 82 },
      { name: "Negociação Complexa", level: 90 },
    ],
    softSkills: [
      { name: "Liderança", level: 92 },
      { name: "Comunicação Executiva", level: 88 },
      { name: "Pensamento Estratégico", level: 85 },
      { name: "Resiliência", level: 90 },
    ],
    culturalFit: 88,
    experienceYears: 12,
    communication: 90,
    leadership: 92,
    checklist: baseChecklist(jobs[0]!),
    radar: [
      { competency: "Liderança", value: 92 },
      { competency: "Estratégia", value: 85 },
      { competency: "Comunicação", value: 88 },
      { competency: "Execução", value: 90 },
      { competency: "Gestão", value: 87 },
      { competency: "Relacionamento", value: 85 },
      { competency: "Técnico", value: 82 },
      { competency: "Fit Cultural", value: 88 },
    ],
    achievements: [
      { label: "Maior Resultado", value: "+R$ 140M em 3 anos" },
      { label: "Maior Projeto", value: "Rollout comercial em 5 estados" },
      { label: "Maior Equipe", value: "62 pessoas diretas + indiretas" },
      { label: "Maior Conquista", value: "Prêmio CEO 2024 — Melhor Região" },
    ],
    experiences: [
      {
        company: "Enel Distribuição",
        role: "Gerente Comercial Sr.",
        period: "2020 — Presente",
        deliveries: [
          "Redesenho do go-to-market regional",
          "Implantação de metodologia de forecast",
          "Estruturação de time de key accounts",
        ],
        results: [
          "Crescimento de 78% na receita B2B",
          "NPS de contas estratégicas subiu de 42 para 71",
          "Turnover do time reduziu de 22% para 8%",
        ],
      },
      {
        company: "Neoenergia",
        role: "Coordenadora Comercial",
        period: "2016 — 2020",
        deliveries: ["Gestão de carteira industrial", "Novos produtos de gestão de energia"],
        results: ["Margem +12pp", "3 contratos âncora fechados"],
      },
    ],
    education: [
      { institution: "Fundação Dom Cabral", degree: "MBA Executivo", period: "2020 — 2022" },
      { institution: "UFMA", degree: "Engenharia de Produção", period: "2008 — 2013" },
    ],
    certifications: ["Green Belt Six Sigma", "Executive Coaching — SBCoaching"],
    languages: [
      { name: "Português", level: "Nativo" },
      { name: "Inglês", level: "Avançado (C1)" },
      { name: "Espanhol", level: "Intermediário (B1)" },
    ],
    strengths: [
      "Alta capacidade de execução sob pressão",
      "Forma líderes com consistência",
      "Leitura estratégica de contas complexas",
    ],
    attentionPoints: [
      "Tendência a centralizar decisões em momentos de estresse",
      "Preferência por ambientes estruturados",
    ],
    risks: ["Ainda não teve exposição internacional plena"],
    potential: "Sucessora natural para posições de diretoria em 2-3 anos.",
    suggestedQuestions: [
      "Conte sobre uma decisão comercial difícil que exigiu recuo estratégico.",
      "Como você forma sucessores em times de alta performance?",
      "Descreva uma negociação em que precisou envolver múltiplos stakeholders.",
    ],
  },
  {
    id: "cand2",
    fullName: "Rafael Nogueira",
    photo:
      "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=facearea&facepad=3&w=400&h=400&q=80",
    currentRole: "Head Comercial",
    currentCompany: "CPFL Energia",
    city: "Campinas, SP",
    workModel: "Híbrido",
    salaryExpectation: 27500,
    availability: "45 dias",
    linkedin: "https://linkedin.com/in/rafael-nogueira",
    disc: "DC",
    discScores: { d: 78, i: 40, s: 38, c: 82 },
    overallMatch: 87,
    headline: "Executivo comercial orientado a dados e transformação digital",
    miniBio:
      "15 anos entre energia e utilities, especializado em reestruturação de operações e implantação de CRM em escala.",
    summary: [
      "15 anos entre energia e utilities",
      "Liderou implantação de CRM para 480 vendedores",
      "Reduziu ciclo médio de venda em 34%",
      "MBA + Harvard Executive Program",
    ],
    hardSkills: [
      { name: "Gestão Comercial B2B", level: 90 },
      { name: "Análise de Dados", level: 92 },
      { name: "CRM & Pipeline", level: 95 },
      { name: "Negociação Complexa", level: 84 },
    ],
    softSkills: [
      { name: "Liderança", level: 82 },
      { name: "Pensamento Analítico", level: 94 },
      { name: "Comunicação Executiva", level: 78 },
      { name: "Adaptabilidade", level: 80 },
    ],
    culturalFit: 78,
    experienceYears: 15,
    communication: 78,
    leadership: 82,
    checklist: [
      { requirement: jobs[0]!.mustHave[0]!, status: "yes" },
      { requirement: jobs[0]!.mustHave[1]!, status: "yes" },
      { requirement: jobs[0]!.mustHave[2]!, status: "yes" },
      { requirement: jobs[0]!.mustHave[3]!, status: "yes" },
    ],
    radar: [
      { competency: "Liderança", value: 82 },
      { competency: "Estratégia", value: 90 },
      { competency: "Comunicação", value: 78 },
      { competency: "Execução", value: 88 },
      { competency: "Gestão", value: 85 },
      { competency: "Relacionamento", value: 74 },
      { competency: "Técnico", value: 92 },
      { competency: "Fit Cultural", value: 78 },
    ],
    achievements: [
      { label: "Maior Resultado", value: "+R$ 210M em 4 anos" },
      { label: "Maior Projeto", value: "Implantação CRM 480 usuários" },
      { label: "Maior Equipe", value: "48 pessoas diretas" },
      { label: "Maior Conquista", value: "Top Performer LatAm 2023" },
    ],
    experiences: [
      {
        company: "CPFL Energia",
        role: "Head Comercial",
        period: "2019 — Presente",
        deliveries: [
          "Reestruturação da operação comercial",
          "Implantação de Salesforce em escala",
          "Programa de dados & analytics",
        ],
        results: [
          "Ciclo médio de venda -34%",
          "Receita B2B +52%",
          "Forecast accuracy passou de 62% para 89%",
        ],
      },
    ],
    education: [
      { institution: "FGV", degree: "MBA Executivo", period: "2015 — 2017" },
      { institution: "Unicamp", degree: "Engenharia Elétrica", period: "2005 — 2010" },
    ],
    certifications: ["Harvard Executive Program", "Salesforce Certified Admin"],
    languages: [
      { name: "Português", level: "Nativo" },
      { name: "Inglês", level: "Fluente (C2)" },
    ],
    strengths: [
      "Domínio profundo de dados e CRM",
      "Excelente estruturador de processos",
      "Visão sistêmica de operação comercial",
    ],
    attentionPoints: [
      "Estilo analítico pode parecer distante em times relacionais",
      "Menor tolerância a ambiguidade",
    ],
    risks: ["Alinhamento cultural com times mais informais"],
    potential: "Perfil forte para posições de COO em operações comerciais complexas.",
    suggestedQuestions: [
      "Como equilibra decisão orientada a dados com sensibilidade humana?",
      "Que sinais indicam para você que um processo precisa ser redesenhado?",
    ],
  },
  {
    id: "cand3",
    fullName: "Beatriz Almeida",
    photo:
      "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=facearea&facepad=3&w=400&h=400&q=80",
    currentRole: "Gerente Regional",
    currentCompany: "Light SESA",
    city: "Rio de Janeiro, RJ",
    workModel: "Presencial",
    salaryExpectation: 24000,
    availability: "Imediata",
    linkedin: "https://linkedin.com/in/beatriz-almeida",
    disc: "IS",
    discScores: { d: 45, i: 82, s: 78, c: 40 },
    overallMatch: 81,
    headline: "Gestora regional com forte capacidade de engajamento e construção de times",
    miniBio: "10 anos de experiência em gestão de operações comerciais regionais.",
    summary: [
      "10 anos em operações comerciais regionais",
      "Construiu times do zero em 3 praças",
      "Reconhecida por engajamento e retenção",
      "Formação em Administração + certificações em liderança",
    ],
    hardSkills: [
      { name: "Gestão Comercial B2B", level: 82 },
      { name: "Gestão de Pessoas", level: 92 },
      { name: "CRM & Pipeline", level: 74 },
      { name: "Negociação", level: 80 },
    ],
    softSkills: [
      { name: "Liderança inspiracional", level: 92 },
      { name: "Comunicação", level: 90 },
      { name: "Empatia", level: 94 },
      { name: "Resolução de conflitos", level: 88 },
    ],
    culturalFit: 92,
    experienceYears: 10,
    communication: 90,
    leadership: 88,
    checklist: [
      { requirement: jobs[0]!.mustHave[0]!, status: "yes" },
      { requirement: jobs[0]!.mustHave[1]!, status: "yes" },
      { requirement: jobs[0]!.mustHave[2]!, status: "yes" },
      { requirement: jobs[0]!.mustHave[3]!, status: "no" },
    ],
    radar: [
      { competency: "Liderança", value: 88 },
      { competency: "Estratégia", value: 74 },
      { competency: "Comunicação", value: 90 },
      { competency: "Execução", value: 82 },
      { competency: "Gestão", value: 90 },
      { competency: "Relacionamento", value: 94 },
      { competency: "Técnico", value: 72 },
      { competency: "Fit Cultural", value: 92 },
    ],
    achievements: [
      { label: "Maior Resultado", value: "+R$ 82M em 2 anos" },
      { label: "Maior Projeto", value: "Abertura de 3 regionais" },
      { label: "Maior Equipe", value: "38 pessoas diretas" },
      { label: "Maior Conquista", value: "eNPS +48 sustentado por 3 anos" },
    ],
    experiences: [
      {
        company: "Light SESA",
        role: "Gerente Regional",
        period: "2021 — Presente",
        deliveries: ["Reestruturação da regional Norte-RJ", "Programa de mentoria interno"],
        results: ["Turnover -46%", "Metas batidas em 11 de 12 trimestres"],
      },
    ],
    education: [{ institution: "PUC-Rio", degree: "Administração", period: "2010 — 2014" }],
    certifications: ["Liderança 4.0 — HSM"],
    languages: [
      { name: "Português", level: "Nativo" },
      { name: "Inglês", level: "Intermediário (B1)" },
    ],
    strengths: [
      "Constrói cultura em times novos rapidamente",
      "Alta empatia e leitura emocional",
      "Retenção excepcional de talentos",
    ],
    attentionPoints: [
      "Inglês em desenvolvimento",
      "Menor exposição a análises quantitativas avançadas",
    ],
    risks: ["Inglês pode limitar exposição a fóruns globais"],
    potential: "Excelente para posições regionais com foco em cultura e engajamento.",
    suggestedQuestions: [
      "Como você constrói cultura em um time recém-formado?",
      "Descreva um conflito difícil que precisou mediar entre pares.",
    ],
  },
];

export const shortlists: Shortlist[] = [
  {
    id: "s1",
    jobId: "j1",
    clientId: "c1",
    version: 2,
    status: "published",
    shareToken: "eq-gcom-2026-a1b2",
    candidateIds: ["cand1", "cand2", "cand3"],
    createdAt: "2026-03-18",
    finalists: 2,
  },
  {
    id: "s2",
    jobId: "j3",
    clientId: "c2",
    version: 1,
    status: "draft",
    shareToken: "vale-esg-c3d4",
    candidateIds: ["cand1", "cand2"],
    createdAt: "2026-03-22",
    finalists: 0,
  },
];

export const activities = [
  { id: "a1", who: "Amanda Ribeiro", what: "foi aprovada", when: "há 2h", where: "Equatorial · Gerente Comercial" },
  { id: "a2", who: "Rafael Nogueira", what: "avançou para 2ª entrevista", when: "há 5h", where: "Equatorial · Gerente Comercial" },
  { id: "a3", who: "Shortlist v2", what: "foi publicada", when: "ontem", where: "Equatorial · Gerente Comercial" },
  { id: "a4", who: "Beatriz Almeida", what: "recebeu comentário", when: "ontem", where: "Equatorial · Gerente Comercial" },
  { id: "a5", who: "Nova vaga", what: "foi aberta", when: "há 2 dias", where: "Vale · Diretor de Sustentabilidade" },
];

export const kpis = {
  activeClients: 4,
  openJobs: 8,
  shortlistsSent: 17,
  interviews: 34,
  hires: 6,
  avgProcessDays: 24,
};

export function getClient(id: string) {
  return clients.find((c) => c.id === id);
}
export function getJob(id: string) {
  return jobs.find((j) => j.id === id);
}
export function getCandidate(id: string) {
  return candidates.find((c) => c.id === id);
}
export function getShortlist(id: string) {
  return shortlists.find((s) => s.id === id);
}
export function getShortlistByToken(token: string) {
  return shortlists.find((s) => s.shareToken === token);
}
