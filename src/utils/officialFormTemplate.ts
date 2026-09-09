import { NCRecord, OrganizationRecord } from '../types';
import { formatarData } from './qualityHelpers';
import { getImpactoLogoSVGString } from '../components/ImpactoLogo';

/**
 * Generates an exact, self-contained, print-perfect HTML representation
 * of the official SGQ F 001-29 Non-Conformity Form.
 */
export function generateOfficialFormHTML(nc: NCRecord, organization?: OrganizationRecord | null): string {
  const isPreventiva = nc.tipoAcao === 'Preventiva';
  const isCorretiva = nc.tipoAcao === 'Corretiva' || !isPreventiva;

  const isDoc = nc.verificacaoEficacia?.metodo === 'Documental';
  const isVisual = nc.verificacaoEficacia?.metodo === 'Visual';
  const isEntrevista = nc.verificacaoEficacia?.metodo === 'Entrevista';
  const isOutro = nc.verificacaoEficacia?.metodo === 'Outro';

  const isEncerradoSim = nc.verificacaoEficacia?.encerrado === 'SIM';
  const isEncerradoNao = nc.verificacaoEficacia?.encerrado === 'NÃO';

  const cincoPorques = nc.analiseCausaRaiz?.cincoPorques || [];
  
  // Dynamic Organization Logo or Aeronautical Badge
  const orgName = organization?.name || 'Organização SGQ';
  const orgLogoUrl = organization?.logoUrl || organization?.configuration?.identidadeVisual?.logoUrl;
  const isImpacto = Boolean(organization && (organization.id === 'org_impacto_aviation' || (organization.name && organization.name.toLowerCase().includes('impacto'))));
  const sigla = organization?.configuration?.identidadeVisual?.siglaAeronautica || (organization?.name ? orgName.substring(0, 3).toUpperCase() : 'SGQ');
  const primaryColor = organization?.configuration?.identidadeVisual?.corPrimaria || '#1e3a8a';

  let logoMarkup = '';
  if (orgLogoUrl) {
    logoMarkup = `<img src="${orgLogoUrl}" alt="${orgName}" style="max-height: 54px; max-width: 210px; object-fit: contain; margin: 0 auto; display: block;" />`;
  } else if (isImpacto) {
    logoMarkup = getImpactoLogoSVGString(210, 58);
  } else {
    logoMarkup = `
      <div style="display: flex; align-items: center; justify-content: center; gap: 8px; padding: 4px 0;">
        <svg width="34" height="34" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="40" height="40" rx="8" fill="${primaryColor}" />
          <path d="M20 8L30 14V22C30 27.5 25.7 32.5 20 34C14.3 32.5 10 27.5 10 22V14L20 8Z" stroke="#ffffff" stroke-width="2" stroke-linejoin="round" fill="${primaryColor}"/>
          <path d="M15 21L18.5 24.5L25 18" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <div style="text-align: left;">
          <div style="font-size: 14px; font-weight: 900; color: #0f172a; line-height: 1.1; letter-spacing: -0.02em;">${orgName}</div>
          <div style="font-size: 9px; font-weight: 700; color: ${primaryColor}; text-transform: uppercase; letter-spacing: 0.05em;">SGQ AERONÁUTICO • ${sigla}</div>
        </div>
      </div>
    `;
  }

  return `
  <div class="rnc-official-form">
    <!-- Header Block -->
    <table class="rnc-table rnc-header-table">
      <tr>
        <td class="rnc-logo-cell">
          <div class="rnc-logo-box">
            ${logoMarkup}
          </div>
        </td>
        <td class="rnc-title-cell">
          REGISTRO DE NÃO CONFORMIDADE
        </td>
      </tr>
    </table>

    <!-- Subtitle Banner -->
    <div class="rnc-subtitle-banner">
      REGISTRO DE NÃO CONFORMIDADE, AÇÃO CORRETIVA OU PREVENTIVA
    </div>

    <!-- Metadata Line -->
    <table class="rnc-table rnc-meta-table">
      <tr>
        <td style="width: 35%;">Data Emissão: <strong>${nc.dataEmissaoFormulario || '02/09/2025'}</strong></td>
        <td style="width: 35%; text-align: center;">Revisão: <strong>${nc.revisao || '00'}</strong></td>
        <td style="width: 30%; text-align: right;">Página: <strong>1 de 1</strong></td>
      </tr>
    </table>

    <!-- Title & Type of Action -->
    <table class="rnc-table">
      <tr>
        <td style="width: 70%; vertical-align: middle;">
          <strong>Título:</strong> ${nc.titulo || '-'}
        </td>
        <td style="width: 30%; vertical-align: middle;">
          <div style="font-size: 11px; line-height: 1.6;">
            <div>Preventiva <strong>${isPreventiva ? '( X )' : '( &nbsp; )'}</strong></div>
            <div>Corretiva <strong>${isCorretiva ? '( X )' : '( &nbsp; )'}</strong></div>
          </div>
        </td>
      </tr>
    </table>

    <!-- Nº da NC -->
    <div class="rnc-row-box" style="background-color: #f8fafc;">
      <strong>Nº da NC:</strong> <span style="font-size: 14px; font-weight: bold; color: #1e3a8a;">${nc.numeroNC || '-'}</span>
      ${nc.normaReferencia ? `<span style="margin-left: 20px; font-size: 12px; color: #334155;">(Norma / Ref: <strong>${nc.normaReferencia}</strong>)</span>` : ''}
      ${nc.setor ? `<span style="margin-left: 15px; font-size: 12px; color: #334155;">| Setor: <strong>${nc.setor}</strong></span>` : ''}
    </div>

    <!-- 1. DESCRIÇÃO DA NÃO CONFORMIDADE -->
    <div class="rnc-section-header">1. DESCRIÇÃO DA NÃO CONFORMIDADE</div>
    <div class="rnc-section-content" style="min-height: 80px;">
      ${(nc.descricaoNC || 'Sem descrição cadastrada.').replace(/\n/g, '<br/>')}
    </div>

    <!-- Avaliação de Risco e Prazo -->
    <div class="rnc-row-box" style="border-top: 1px solid #000000; background-color: #f8fafc;">
      <strong>Avaliação de Risco (Severidade x Probabilidade):</strong>
      <span class="rnc-risk-badge">${nc.avaliacaoRiscoInicial?.codigo || '2C'}</span>
      <span style="color: #475569; font-size: 12px;">(Classificação: <strong>${nc.avaliacaoRiscoInicial?.nivel || 'Médio'}</strong>)</span>
    </div>

    <div class="rnc-row-box" style="border-top: 1px solid #000000;">
      <strong>Prazo de Resposta da NC:</strong> ${formatarData(nc.prazoResposta)}
    </div>

    <table class="rnc-table" style="border-top: 1px solid #000000;">
      <tr>
        <td style="width: 50%;"><strong>Data:</strong> ${formatarData(nc.dataIdentificacao)}</td>
        <td style="width: 50%;"><strong>Auditor:</strong> ${nc.auditor || '-'}</td>
      </tr>
    </table>

    <!-- 2. PRÉ-ANÁLISE DA CAUSA E AÇÃO DE CONTENÇÃO -->
    <div class="rnc-section-header">2. PRÉ-ANÁLISE DA CAUSA E AÇÃO DE CONTENÇÃO:</div>
    <div class="rnc-section-content" style="min-height: 65px;">
      ${nc.preAnaliseContencao?.descricao ? `
        <div>${nc.preAnaliseContencao.descricao.replace(/\n/g, '<br/>')}</div>
        <div style="margin-top: 8px; font-size: 11px; color: #475569;">
          <strong>Responsável Contenção:</strong> ${nc.preAnaliseContencao.responsavel || '-'} |
          <strong>Prazo Limite:</strong> ${formatarData(nc.preAnaliseContencao.dataLimite)} |
          <strong>Status:</strong> ${nc.preAnaliseContencao.status || 'Pendente'}
        </div>
      ` : '<span style="color: #94a3b8; font-style: italic;">Nenhuma ação de contenção registrada.</span>'}
    </div>

    <!-- 3. ANÁLISE DA CAUSA RAIZ -->
    <div class="rnc-section-header">3. ANÁLISE DA CAUSA RAIZ:</div>
    <div class="rnc-section-content" style="min-height: 75px;">
      ${cincoPorques.length > 0 ? `
        <div style="font-weight: bold; font-size: 11px; text-transform: uppercase; color: #475569; margin-bottom: 6px;">
          Metodologia dos 5 Porquês:
        </div>
        ${cincoPorques.map((pq, idx) => `
          <div style="padding-left: 10px; border-left: 3px solid #cbd5e1; margin-bottom: 4px; font-size: 12px;">
            <strong>${idx + 1}º Porquê:</strong> ${pq}
          </div>
        `).join('')}
      ` : ''}

      ${nc.analiseCausaRaiz?.detalhes ? `
        <div style="margin-top: 8px; font-size: 12px;">
          <strong>Conclusão da Causa Raiz:</strong> ${nc.analiseCausaRaiz.detalhes}
        </div>
      ` : ''}

      ${!cincoPorques.length && !nc.analiseCausaRaiz?.detalhes ? `
        <span style="color: #94a3b8; font-style: italic;">Em fase de investigação de causa raiz.</span>
      ` : ''}
    </div>

    <!-- 4. AÇÃO CORRETIVA -->
    <div class="rnc-section-header">4. AÇÃO CORRETIVA:</div>
    <div class="rnc-section-content" style="min-height: 75px;">
      ${nc.acaoCorretiva?.descricao ? `
        <div>${nc.acaoCorretiva.descricao.replace(/\n/g, '<br/>')}</div>
        ${nc.acaoCorretiva.comoSeraFeito ? `
          <div style="margin-top: 6px; font-size: 12px; color: #334155;">
            <strong>Como será feito:</strong> ${nc.acaoCorretiva.comoSeraFeito}
          </div>
        ` : ''}
      ` : '<span style="color: #94a3b8; font-style: italic;">Plano de ação corretiva pendente de elaboração.</span>'}
    </div>

    <table class="rnc-table" style="border-top: 1px solid #000000;">
      <tr>
        <td style="width: 45%;"><strong>Responsável:</strong> ${nc.responsavel || nc.acaoCorretiva?.responsavel || '-'}</td>
        <td style="width: 25%;"><strong>Data:</strong> ${formatarData(nc.acaoCorretiva?.dataPrazo) || '-'}</td>
        <td style="width: 30%;"><strong>Assinatura:</strong> <span style="font-style: italic; font-size: 11px;">${nc.acaoCorretiva?.assinaturaResponsavel || '-'}</span></td>
      </tr>
    </table>

    <!-- 6. VERIFICAÇÃO DA EFICÁCIA -->
    <div class="rnc-section-header">6. VERIFICAÇÃO DA EFICÁCIA:</div>
    <table class="rnc-table" style="text-align: center; font-size: 12px;">
      <tr>
        <td style="width: 25%;"><strong>${isDoc ? '( X )' : '( &nbsp; )'}</strong> Documental</td>
        <td style="width: 25%;"><strong>${isVisual ? '( X )' : '( &nbsp; )'}</strong> Visual</td>
        <td style="width: 25%;"><strong>${isEntrevista ? '( X )' : '( &nbsp; )'}</strong> Entrevista</td>
        <td style="width: 25%;"><strong>${isOutro ? '( X )' : '( &nbsp; )'}</strong> Outro: <u>${nc.verificacaoEficacia?.outroMetodoDetalhe || '________'}</u></td>
      </tr>
    </table>

    <div class="rnc-row-box" style="border-top: 1px solid #000000;">
      <strong>Avaliação de Risco após tratamento da NC:</strong>
      <span class="rnc-risk-badge">${nc.verificacaoEficacia?.avaliacaoRiscoResidual?.codigo || '-'}</span>
      ${nc.verificacaoEficacia?.avaliacaoRiscoResidual?.nivel ? `
        <span style="color: #475569; font-size: 12px;">(Residual: <strong>${nc.verificacaoEficacia.avaliacaoRiscoResidual.nivel}</strong>)</span>
      ` : ''}
    </div>

    <div class="rnc-row-box" style="border-top: 1px solid #000000;">
      <strong>Encerrado:</strong>
      <span style="margin: 0 10px;"><strong>${isEncerradoSim ? '■' : '□'}</strong> SIM</span>
      <span style="margin: 0 10px;"><strong>${isEncerradoNao ? '■' : '□'}</strong> NÃO</span>
      <span style="margin-left: 20px;">
        <strong>Motivo / Evidências:</strong> ${nc.verificacaoEficacia?.motivo || nc.verificacaoEficacia?.evidencias || '-'}
      </span>
    </div>

    <table class="rnc-table" style="border-top: 1px solid #000000;">
      <tr>
        <td style="width: 50%;"><strong>Data:</strong> ${formatarData(nc.verificacaoEficacia?.dataVerificacao) || '-'}</td>
        <td style="width: 50%;"><strong>Auditor:</strong> ${nc.verificacaoEficacia?.auditorVerificador || nc.auditor || '-'}</td>
      </tr>
    </table>

    <!-- Footer -->
    <table class="rnc-table rnc-footer-table">
      <tr>
        <td style="width: 33%; font-weight: bold;">${nc.codigoFormulario || 'F 001-29'}</td>
        <td style="width: 34%; text-align: center; font-weight: bold;">R${nc.revisao || '00'}</td>
        <td style="width: 33%; text-align: right; font-weight: bold;">${nc.dataEmissaoFormulario || '02/09/2025'}</td>
      </tr>
    </table>
  </div>
  `;
}

/**
 * Returns the complete standalone HTML page ready for printing or rendering into PDF.
 */
export function getFullOfficialDocumentHTML(nc: NCRecord, organization?: OrganizationRecord | null): string {
  const content = generateOfficialFormHTML(nc, organization);

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Ficha_RNC_${nc.numeroNC || 'registro'}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 8mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: Arial, Helvetica, "Segoe UI", system-ui, sans-serif;
      font-size: 12px;
      color: #000000;
      background-color: #ffffff;
      margin: 0;
      padding: 10px;
    }
    .rnc-official-form {
      width: 100%;
      max-width: 820px;
      margin: 0 auto;
      border: 2px solid #000000;
      background: #ffffff;
      color: #000000;
    }
    .rnc-table {
      width: 100%;
      border-collapse: collapse;
    }
    .rnc-table td {
      border: 1px solid #000000;
      padding: 6px 8px;
      vertical-align: top;
      font-size: 12px;
    }
    .rnc-header-table td {
      border-top: none;
      border-left: none;
      border-right: none;
    }
    .rnc-logo-cell {
      width: 35%;
      text-align: center;
      vertical-align: middle !important;
      border-right: 1px solid #000000 !important;
      padding: 10px !important;
    }
    .rnc-logo-box {
      font-size: 24px;
      font-weight: 900;
      font-style: italic;
      letter-spacing: -0.5px;
      color: #1e3a8a;
    }
    .rnc-logo-e {
      color: #2563eb;
      font-size: 28px;
      font-weight: 900;
      font-style: normal;
    }
    .rnc-title-cell {
      width: 65%;
      text-align: center;
      vertical-align: middle !important;
      font-size: 16px;
      font-weight: bold;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      padding: 12px 8px !important;
    }
    .rnc-subtitle-banner {
      border-top: 1px solid #000000;
      border-bottom: 1px solid #000000;
      padding: 5px 8px;
      text-align: center;
      font-weight: bold;
      font-size: 11px;
      text-transform: uppercase;
      background-color: #f1f5f9;
      letter-spacing: 0.5px;
    }
    .rnc-meta-table td {
      border: none;
      border-bottom: 1px solid #000000;
      padding: 4px 8px;
      font-size: 11px;
    }
    .rnc-meta-table td:not(:last-child) {
      border-right: 1px solid #000000;
    }
    .rnc-row-box {
      padding: 6px 8px;
      font-size: 12px;
    }
    .rnc-section-header {
      background-color: #e2e8f0;
      border-top: 1px solid #000000;
      border-bottom: 1px solid #000000;
      padding: 4px 8px;
      font-weight: bold;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .rnc-section-content {
      padding: 8px 10px;
      font-size: 12px;
      line-height: 1.45;
    }
    .rnc-risk-badge {
      display: inline-block;
      padding: 1px 6px;
      font-weight: bold;
      font-size: 12px;
      background: #e2e8f0;
      border: 1px solid #94a3b8;
      border-radius: 3px;
      margin: 0 4px;
    }
    .rnc-footer-table {
      border-top: 1px solid #000000;
    }
    .rnc-footer-table td {
      border: none;
      padding: 5px 8px;
      font-size: 10px;
      color: #334155;
    }
    .no-print {
      margin-bottom: 16px;
      text-align: center;
    }
    .btn-print {
      background: #1d4ed8;
      color: #ffffff;
      border: none;
      padding: 10px 24px;
      font-size: 14px;
      font-weight: bold;
      border-radius: 6px;
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(0,0,0,0.15);
    }
    .btn-print:hover {
      background: #1e40af;
    }
    @media print {
      body {
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
      .rnc-official-form {
        border: 2px solid #000000 !important;
        box-shadow: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="no-print">
    <button class="btn-print" onclick="window.print()">🖨️ Imprimir / Salvar em PDF</button>
  </div>
  ${content}
</body>
</html>
  `;
}
