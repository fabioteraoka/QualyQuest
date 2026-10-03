import {
  ImpactoBase,
  ImpactoTecnico,
  ImpactoQualificacao,
  ImpactoTreinamento,
  ImpactoFerramenta,
  ImpactoOrdemServico,
  ImpactoContextoQualidadeOS,
} from '../types/impactoMro';

export const IMPACTO_BASES: ImpactoBase[] = [
  {
    id: 'base_vcp',
    codigo: 'VCP',
    nome: 'Base Operacional Viracopos - Hangar 1',
    cidade: 'Campinas',
    uf: 'SP',
    ativo: true,
    capacidadeSimultanea: 6,
    urlNavegavel: 'https://mro.impactoaviation.com.br/bases/vcp',
  },
  {
    id: 'base_sdu',
    codigo: 'SDU',
    nome: 'Base de Manutenção de Linha Santos Dumont',
    cidade: 'Rio de Janeiro',
    uf: 'RJ',
    ativo: true,
    capacidadeSimultanea: 3,
    urlNavegavel: 'https://mro.impactoaviation.com.br/bases/sdu',
  },
  {
    id: 'base_bsb',
    codigo: 'BSB',
    nome: 'Base Brasília - Manutenção e Suporte AOG',
    cidade: 'Brasília',
    uf: 'DF',
    ativo: true,
    capacidadeSimultanea: 2,
    urlNavegavel: 'https://mro.impactoaviation.com.br/bases/bsb',
  },
];

export const IMPACTO_TECNICOS: ImpactoTecnico[] = [
  {
    id: 'tec_imp_001',
    nome: 'Carlos Eduardo Silva',
    cpfMascarado: '***.492.818-**',
    cht: 'CHT-145892',
    chtValidade: '2027-08-30',
    categoriasCht: ['CEL', 'GMP', 'AVI'],
    funcao: 'Inspetor Chefe de Manutenção / RT',
    baseId: 'base_vcp',
    baseNome: 'Viracopos (VCP)',
    email: 'carlos.silva@impactoaviation.com.br',
    ativo: true,
    urlNavegavel: 'https://mro.impactoaviation.com.br/tecnicos/tec_imp_001',
  },
  {
    id: 'tec_imp_002',
    nome: 'Mariana Mendes Rocha',
    cpfMascarado: '***.103.958-**',
    cht: 'CHT-198421',
    chtValidade: '2026-11-15',
    categoriasCht: ['AVI', 'CEL'],
    funcao: 'Especialista em Aviônica & Instrumentos',
    baseId: 'base_vcp',
    baseNome: 'Viracopos (VCP)',
    email: 'mariana.mendes@impactoaviation.com.br',
    ativo: true,
    urlNavegavel: 'https://mro.impactoaviation.com.br/tecnicos/tec_imp_002',
  },
  {
    id: 'tec_imp_003',
    nome: 'Roberto Alcantara Pinto',
    cpfMascarado: '***.883.210-**',
    cht: 'CHT-112450',
    chtValidade: '2026-05-10', // Atenção: expira em breve
    categoriasCht: ['GMP', 'CEL'],
    funcao: 'Mecânico Sênior de Motores & Célula',
    baseId: 'base_sdu',
    baseNome: 'Santos Dumont (SDU)',
    email: 'roberto.alcantara@impactoaviation.com.br',
    ativo: true,
    urlNavegavel: 'https://mro.impactoaviation.com.br/tecnicos/tec_imp_003',
  },
  {
    id: 'tec_imp_004',
    nome: 'Lucas Antunes Ferreira',
    cpfMascarado: '***.519.340-**',
    cht: 'CHT-230911',
    chtValidade: '2028-02-20',
    categoriasCht: ['CEL'],
    funcao: 'Mecânico Pleno de Estruturas Aeronáuticas',
    baseId: 'base_bsb',
    baseNome: 'Brasília (BSB)',
    email: 'lucas.antunes@impactoaviation.com.br',
    ativo: true,
    urlNavegavel: 'https://mro.impactoaviation.com.br/tecnicos/tec_imp_004',
  },
];

export const IMPACTO_QUALIFICACOES: ImpactoQualificacao[] = [
  {
    id: 'qual_imp_801',
    tecnicoId: 'tec_imp_001',
    tecnicoNome: 'Carlos Eduardo Silva',
    titulo: 'Qualificação Tipo Boeing 737CL / 737NG (CFM56)',
    tipo: 'AERONAVE',
    emissor: 'Impacto Aviation Training Center / Boeing',
    dataEmissao: '2023-04-10',
    dataValidade: '2027-04-10',
    status: 'VIGENTE',
    urlNavegavel: 'https://mro.impactoaviation.com.br/qualificacoes/qual_imp_801',
  },
  {
    id: 'qual_imp_802',
    tecnicoId: 'tec_imp_001',
    tecnicoNome: 'Carlos Eduardo Silva',
    titulo: 'Qualificação Tipo Embraer E190 / E195-E2 (PW1900G)',
    tipo: 'AERONAVE',
    emissor: 'Embraer Training Center',
    dataEmissao: '2024-01-15',
    dataValidade: '2028-01-15',
    status: 'VIGENTE',
    urlNavegavel: 'https://mro.impactoaviation.com.br/qualificacoes/qual_imp_802',
  },
  {
    id: 'qual_imp_803',
    tecnicoId: 'tec_imp_002',
    tecnicoNome: 'Mariana Mendes Rocha',
    titulo: 'Especialista em Aviônica Honeywell Primus Epic',
    tipo: 'AVIONICS',
    emissor: 'Honeywell Aerospace',
    dataEmissao: '2024-06-20',
    dataValidade: '2027-06-20',
    status: 'VIGENTE',
    urlNavegavel: 'https://mro.impactoaviation.com.br/qualificacoes/qual_imp_803',
  },
  {
    id: 'qual_imp_804',
    tecnicoId: 'tec_imp_003',
    tecnicoNome: 'Roberto Alcantara Pinto',
    titulo: 'Manutenção de Motores CFM56-7B Nível Básico e Avançado',
    tipo: 'MOTOR',
    emissor: 'CFM International',
    dataEmissao: '2023-09-01',
    dataValidade: '2026-09-01',
    status: 'VIGENTE',
    urlNavegavel: 'https://mro.impactoaviation.com.br/qualificacoes/qual_imp_804',
  },
];

export const IMPACTO_TREINAMENTOS: ImpactoTreinamento[] = [
  {
    id: 'tr_imp_501',
    tecnicoId: 'tec_imp_001',
    tecnicoNome: 'Carlos Eduardo Silva',
    cursoNome: 'Fatores Humanos na Manutenção Aeronáutica (HF - Recorrente)',
    codigoCurso: 'HF-2025',
    cargaHoraria: 16,
    dataConclusao: '2025-05-12',
    dataValidade: '2027-05-12',
    entidadeInstrutora: 'Impacto Training Academy',
    aprovado: true,
    urlNavegavel: 'https://mro.impactoaviation.com.br/treinamentos/tr_imp_501',
  },
  {
    id: 'tr_imp_502',
    tecnicoId: 'tec_imp_002',
    tecnicoNome: 'Mariana Mendes Rocha',
    cursoNome: 'EWIS - Electrical Wiring Interconnection System (Grupos 1 e 2)',
    codigoCurso: 'EWIS-2025',
    cargaHoraria: 24,
    dataConclusao: '2025-03-18',
    dataValidade: '2027-03-18',
    entidadeInstrutora: 'Impacto Training Academy',
    aprovado: true,
    urlNavegavel: 'https://mro.impactoaviation.com.br/treinamentos/tr_imp_502',
  },
  {
    id: 'tr_imp_503',
    tecnicoId: 'tec_imp_003',
    tecnicoNome: 'Roberto Alcantara Pinto',
    cursoNome: 'Fuel Tank Safety (FTS Fase 2)',
    codigoCurso: 'FTS-2024',
    cargaHoraria: 8,
    dataConclusao: '2024-08-10',
    dataValidade: '2026-08-10',
    entidadeInstrutora: 'Impacto Training Academy',
    aprovado: true,
    urlNavegavel: 'https://mro.impactoaviation.com.br/treinamentos/tr_imp_503',
  },
];

export const IMPACTO_FERRAMENTAS: ImpactoFerramenta[] = [
  {
    id: 'ferr_imp_101',
    codigo: 'TORQ-001',
    descricao: 'Torquímetro de Estalo 20 a 100 Nm (1/2")',
    fabricante: 'Stahlwille Manoskop',
    numeroSerie: 'ST-984210',
    baseId: 'base_vcp',
    baseNome: 'Viracopos (VCP)',
    localizacao: 'Armário A1 - Ferramentaria VCP',
    statusCalibracao: 'CALIBRADO',
    dataUltimaCalibracao: '2026-01-10',
    dataProximaCalibracao: '2026-07-10',
    certificadoNumero: 'CAL-2026-0041',
    laboratorioCalibracao: 'RBC Metrologia Aeronáutica',
    urlNavegavel: 'https://mro.impactoaviation.com.br/ferramentas/ferr_imp_101',
  },
  {
    id: 'ferr_imp_102',
    codigo: 'TORQ-002',
    descricao: 'Torquímetro de Precisão 5 a 25 Nm (3/8")',
    fabricante: 'Snap-on TechAngle',
    numeroSerie: 'SN-441092',
    baseId: 'base_vcp',
    baseNome: 'Viracopos (VCP)',
    localizacao: 'Armário A1 - Ferramentaria VCP',
    statusCalibracao: 'CALIBRADO',
    dataUltimaCalibracao: '2026-02-15',
    dataProximaCalibracao: '2026-08-15',
    certificadoNumero: 'CAL-2026-0188',
    laboratorioCalibracao: 'RBC Metrologia Aeronáutica',
    urlNavegavel: 'https://mro.impactoaviation.com.br/ferramentas/ferr_imp_102',
  },
  {
    id: 'ferr_imp_103',
    codigo: 'MULT-014',
    descricao: 'Multímetro Digital True RMS Calibrado',
    fabricante: 'Fluke 87V',
    numeroSerie: 'FLK-778210',
    baseId: 'base_vcp',
    baseNome: 'Viracopos (VCP)',
    localizacao: 'Bancada Aviônica - Sala Limpa',
    statusCalibracao: 'CALIBRADO',
    dataUltimaCalibracao: '2025-11-20',
    dataProximaCalibracao: '2026-11-20',
    certificadoNumero: 'CAL-2025-9921',
    laboratorioCalibracao: 'Fluke Calibration Lab',
    urlNavegavel: 'https://mro.impactoaviation.com.br/ferramentas/ferr_imp_103',
  },
  {
    id: 'ferr_imp_104',
    codigo: 'MAN-PRESS-003',
    descricao: 'Manômetro Diferencial de Pressão Hidráulica 0-5000 PSI',
    fabricante: 'Wika Industrial',
    numeroSerie: 'WK-332910',
    baseId: 'base_sdu',
    baseNome: 'Santos Dumont (SDU)',
    localizacao: 'Carrinho Hidráulico H-02',
    statusCalibracao: 'VENCIDO',
    dataUltimaCalibracao: '2025-08-01',
    dataProximaCalibracao: '2026-02-01', // Vencido
    certificadoNumero: 'CAL-2025-4190',
    laboratorioCalibracao: 'Metrologia Sudeste',
    urlNavegavel: 'https://mro.impactoaviation.com.br/ferramentas/ferr_imp_104',
  },
];

export const IMPACTO_ORDENS_SERVICO: ImpactoOrdemServico[] = [
  {
    id: 'os_imp_2026_0982',
    numero: 'OS-2026-0982',
    titulo: 'Check C Programado - Aeronave Embraer E195-E2 (PR-AZL)',
    descricao: 'Manutenção periódica pesada Check C (7.500 FH), inspeção estrutural de empenagem, revisão de atuadores de spoilers e teste aviônico de barramento AFDX.',
    prefixoAeronave: 'PR-AZL',
    modeloAeronave: 'Embraer E195-E2',
    numeroSerieAeronave: '19020088',
    clienteNome: 'Azul Linhas Aéreas Brasileiras',
    baseId: 'base_vcp',
    baseNome: 'Viracopos - Hangar 1',
    tipoManutencao: 'Manutenção Pesada (Check C)',
    tecnicoResponsavelId: 'tec_imp_001',
    tecnicoResponsavelNome: 'Carlos Eduardo Silva',
    equipeTecnicaIds: ['tec_imp_001', 'tec_imp_002'],
    dataAbertura: '2026-03-10',
    dataPrevisaoConclusao: '2026-04-05',
    status: 'EM_ANDAMENTO',
    prioridade: 'URGENTE',
    urlNavegavel: 'https://mro.impactoaviation.com.br/os/OS-2026-0982',
  },
  {
    id: 'os_imp_2026_1044',
    numero: 'OS-2026-1044',
    titulo: 'Reparo AOG - Substituição do Atuador do Trem de Pouso Principal',
    descricao: 'Substituição não programada de atuador de recolhimento do trem de pouso principal direito após reporte de indicação transitória no EICAS.',
    prefixoAeronave: 'PR-GUQ',
    modeloAeronave: 'Boeing 737-800',
    numeroSerieAeronave: '34952',
    clienteNome: 'GOL Linhas Aéreas',
    baseId: 'base_vcp',
    baseNome: 'Viracopos - Hangar 1',
    tipoManutencao: 'Manutenção Corretiva (AOG)',
    tecnicoResponsavelId: 'tec_imp_001',
    tecnicoResponsavelNome: 'Carlos Eduardo Silva',
    equipeTecnicaIds: ['tec_imp_001', 'tec_imp_003'],
    dataAbertura: '2026-03-28',
    dataPrevisaoConclusao: '2026-03-31',
    status: 'INSPECAO_QUALIDADE',
    prioridade: 'AOG',
    urlNavegavel: 'https://mro.impactoaviation.com.br/os/OS-2026-1044',
  },
  {
    id: 'os_imp_2026_1102',
    numero: 'OS-2026-1102',
    titulo: 'Inspeção de Linha de 100h / 30 Dias - Caravan EX (PT-MEP)',
    descricao: 'Inspeção periódica de célula e motor PT6A-140, verificação de comandos de voo e pesagem de extintores portáteis.',
    prefixoAeronave: 'PT-MEP',
    modeloAeronave: 'Cessna 208B Grand Caravan EX',
    numeroSerieAeronave: '208B5240',
    clienteNome: 'Azul Conecta',
    baseId: 'base_sdu',
    baseNome: 'Santos Dumont (SDU)',
    tipoManutencao: 'Linha de Voo / Periódica',
    tecnicoResponsavelId: 'tec_imp_003',
    tecnicoResponsavelNome: 'Roberto Alcantara Pinto',
    equipeTecnicaIds: ['tec_imp_003'],
    dataAbertura: '2026-03-25',
    dataConclusao: '2026-03-27',
    status: 'CONCLUIDA',
    prioridade: 'ROTINA',
    urlNavegavel: 'https://mro.impactoaviation.com.br/os/OS-2026-1102',
  },
];

/**
 * Monta o contexto completo de qualidade de uma OS do Impacto Aviation MRO
 */
export function buildContextoQualidadeOS(osId: string): ImpactoContextoQualidadeOS | null {
  const os = IMPACTO_ORDENS_SERVICO.find((o) => o.id === osId || o.numero === osId);
  if (!os) return null;

  const base = IMPACTO_BASES.find((b) => b.id === os.baseId) || IMPACTO_BASES[0];
  const tecResp = IMPACTO_TECNICOS.find((t) => t.id === os.tecnicoResponsavelId) || IMPACTO_TECNICOS[0];
  const equipe = (os.equipeTecnicaIds || [])
    .map((tid) => IMPACTO_TECNICOS.find((t) => t.id === tid))
    .filter(Boolean) as ImpactoTecnico[];

  const tecIds = [tecResp.id, ...equipe.map((e) => e.id)];
  const qualifs = IMPACTO_QUALIFICACOES.filter((q) => tecIds.includes(q.tecnicoId));
  const treinos = IMPACTO_TREINAMENTOS.filter((t) => tecIds.includes(t.tecnicoId));

  // Ferramentas aplicadas na OS
  const ferramentas = os.id === 'os_imp_2026_0982'
    ? [IMPACTO_FERRAMENTAS[0], IMPACTO_FERRAMENTAS[1], IMPACTO_FERRAMENTAS[2]]
    : [IMPACTO_FERRAMENTAS[0], IMPACTO_FERRAMENTAS[3]];

  // Alertas detectados automaticamente
  const alertas: any[] = [];
  ferramentas.forEach((f) => {
    if (f.statusCalibracao === 'VENCIDO') {
      alertas.push({
        tipo: 'FERRAMENTA_VENCIDA',
        severidade: 'CRITICO',
        mensagem: `Ferramenta ${f.codigo} (${f.descricao}) utilizada na OS com calibração expirada em ${f.dataProximaCalibracao}.`,
        itemReferencia: f.codigo,
      });
    }
  });

  if (os.prioridade === 'AOG') {
    alertas.push({
      tipo: 'PRAZO_AOG',
      severidade: 'ALTO',
      mensagem: `Aeronave em condição AOG (${os.prefixoAeronave}). Liberação de voo requer inspeção de qualidade dupla conforme MOE 5.2.`,
      itemReferencia: os.numero,
    });
  }

  return {
    ordemServico: os,
    base,
    tecnicoResponsavel: tecResp,
    equipeTecnica: equipe,
    qualificacoesEnvolvidas: qualifs,
    treinamentosEnvolvidos: treinos,
    ferramentasUtilizadas: ferramentas,
    etapasManutencao: [
      {
        id: 'etp_01',
        descricao: 'Abertura de painéis de acesso e desenergização dos barramentos elétricos',
        executadoPor: tecResp.nome,
        tecnicoId: tecResp.id,
        dataExecucao: os.dataAbertura,
        status: 'INSPECIONADO',
        inspetorAprovador: 'Insp. Chefe Roberto Silva (CHT-09941)',
      },
      {
        id: 'etp_02',
        descricao: 'Torqueamento de porcas castelo da união articulada com chave dinamométrica',
        executadoPor: equipe[1]?.nome || tecResp.nome,
        tecnicoId: equipe[1]?.id || tecResp.id,
        dataExecucao: os.dataAbertura,
        status: 'EXECUTADO',
      },
      {
        id: 'etp_03',
        descricao: 'Teste funcional sob pressão hidráulica nominal (3.000 PSI) com verificação de vazamentos',
        executadoPor: tecResp.nome,
        tecnicoId: tecResp.id,
        status: 'PENDENTE',
      },
    ],
    discrepanciasManutencao: [
      {
        id: 'disc_01',
        codigo: 'DISC-EICAS-32',
        descricao: 'Fiação do sensor de proximidade (Proximity Sensor) com atrito superficial contra o suporte da baia',
        itemAta: 'ATA 32 - Landing Gear',
        acaoTomada: 'Isolamento com fita auto-aglomerante e ajuste de folga de chicote conforme EWIS',
        dataRegistro: os.dataAbertura,
        resolvida: true,
      },
    ],
    pecasSubstituidas: [
      {
        partNumber: '190-88410-001',
        serialNumberRemovido: 'SN-REM-8812',
        serialNumberInstalado: 'SN-NEW-9940',
        descricao: 'Actuator Assembly - Hydraulic Retract',
        certificacaoForm1: 'ANAC Form F-100 / EASA Form 1 No. 2026-904',
        lote: 'LOT-2026-B',
      },
    ],
    alertasQualidadeDetectados: alertas,
    resumoAuditavel: `Ordem de Serviço ${os.numero} vinculada à aeronave ${os.prefixoAeronave} (${os.modeloAeronave}). Executada na base ${base.nome} sob responsabilidade técnica de ${tecResp.nome} (${tecResp.cht}). Foram empregadas ${ferramentas.length} ferramentas calibradas e 1 peça crítica substituída com rastreabilidade de Form 1.`,
    metadadosConsulta: {
      consultadoEm: new Date().toISOString(),
      fonteOficial: 'Impacto Aviation MRO',
      statusConexao: 'ONLINE',
      versaoApi: 'v1.4-official',
    },
  };
}
