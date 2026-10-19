import React, { useMemo, useState } from 'react';
import {
  Check,
  ChevronDown,
  Download,
  Filter,
  Layers,
  MapPin,
  Palette,
  Printer,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Base, ItemStatus, Licenca, Pessoa } from '../types';
import {
  calcularDiasParaVencer,
  calcularStatusLicenca,
  formatarDataBr,
  getStatusColor,
} from '../utils/businessRules';

export const ListaDesignacaoView: React.FC = () => {
  const { db, filtroBase, setFiltroBase, dataReferencia, faixas, triggerPrint } = useApp();

  const [destacarVencimentos, setDestacarVencimentos] = useState<boolean>(true);
  const [imprimirTodasAsBases, setImprimirTodasAsBases] = useState<boolean>(false);

  // Available bases for filter
  const baseOptions = [{ id: 'TOTAL', nome: 'Todas as Bases (TOTAL)' }, ...db.bases];

  // Helper to extract designation row for a mechanic
  const getDesignacaoData = (pessoa: Pessoa) => {
    const desigPessoa = db.designacoesPessoa.find((dp) => dp.pessoa_id === pessoa.id);
    const basesPessoa = db.designacoesBase
      .filter((dbItem) => dbItem.pessoa_id === pessoa.id)
      .map((b) => b.base_id);
    const baseTexto = basesPessoa.length > 0 ? basesPessoa.join('/') : pessoa.base_principal_id;

    const licencasPessoa = db.licencas.filter((l) => l.pessoa_id === pessoa.id);

    // CCT (License numbers)
    const cctAvi = licencasPessoa.find((l) => l.orgao === 'ANAC' && l.tipo === 'CCT' && l.habilitacao === 'AVI');
    const cctCel = licencasPessoa.find((l) => l.orgao === 'ANAC' && l.tipo === 'CCT' && l.habilitacao === 'CEL');
    const cctGmp = licencasPessoa.find((l) => l.orgao === 'ANAC' && l.tipo === 'CCT' && l.habilitacao === 'GMP');

    // CHT (Expiration dates)
    const chtLic = licencasPessoa.find((l) => l.orgao === 'ANAC' && l.tipo === 'CHT');
    const licencaNumero = chtLic?.numero || '';

    const chtAvi = licencasPessoa.find((l) => l.orgao === 'ANAC' && l.tipo === 'CHT' && l.habilitacao === 'AVI');
    const chtCel = licencasPessoa.find((l) => l.orgao === 'ANAC' && l.tipo === 'CHT' && l.habilitacao === 'CEL');
    const chtGmp = licencasPessoa.find((l) => l.orgao === 'ANAC' && l.tipo === 'CHT' && l.habilitacao === 'GMP');

    // FAA AMP
    const faaAmp = licencasPessoa.find((l) => l.orgao === 'FAA' && l.tipo === 'AMP');

    // Funções
    const getFunc = (funcao: string) => {
      const f = db.designacoesFuncao.find((df) => df.pessoa_id === pessoa.id && df.funcao === funcao);
      return f?.valor || '';
    };

    // Aeronaves
    const getAero = (aero: string) => {
      const a = db.designacoesAeronave.find((da) => da.pessoa_id === pessoa.id && da.aeronave === aero);
      return a?.valor || '';
    };

    return {
      pessoa,
      imp: desigPessoa?.imp || '',
      easaType: desigPessoa?.easa_type || 'N/A',
      baseTexto,
      basesList: basesPessoa,
      cctAvi: cctAvi?.numero || '',
      cctCel: cctCel?.numero || '',
      cctGmp: cctGmp?.numero || '',
      licencaNumero,
      chtAvi,
      chtCel,
      chtGmp,
      faaNumero: faaAmp?.numero || '',
      faaExpedicao: faaAmp?.data_expedicao || '',
      // Funções
      executante: getFunc('Executante'),
      supervisor: getFunc('Supervisor'),
      iio: getFunc('IIO'),
      inspetor: getFunc('Inspetor'),
      aprs: getFunc('APRS'),
      // Aeronaves
      b737: getAero('B737'),
      e190: getAero('E190E2'),
      a320: getAero('A320FAM'),
      a330: getAero('A330'),
      b767: getAero('B767'),
      b777: getAero('B777'),
    };
  };

  // Filter persons to display
  const rows = useMemo(() => {
    return db.pessoas
      .filter((p) => {
        // Only active mechanics who have incluir_na_lista !== false
        if (p.categoria !== 'Mecânico') return false;
        const desig = db.designacoesPessoa.find((dp) => dp.pessoa_id === p.id);
        if (desig && !desig.incluir_na_lista) return false;

        // Base filter
        if (filtroBase !== 'TOTAL') {
          const basesPessoa = db.designacoesBase
            .filter((dbItem) => dbItem.pessoa_id === p.id)
            .map((b) => b.base_id);

          // Must be in designacoesBase for that base, or have base_principal_id if none defined
          const hasBaseInDesignacao = basesPessoa.includes(filtroBase);
          const hasBaseInPrincipal = basesPessoa.length === 0 && p.base_principal_id === filtroBase;
          if (!hasBaseInDesignacao && !hasBaseInPrincipal) return false;
        }

        return true;
      })
      .sort((a, b) => a.nome.localeCompare(b.nome))
      .map(getDesignacaoData);
  }, [db.pessoas, db.designacoesPessoa, db.designacoesBase, db.licencas, db.designacoesFuncao, db.designacoesAeronave, filtroBase]);

  // Color helper for CHT dates
  const renderChtDateCell = (lic: Licenca | undefined) => {
    if (!lic || !lic.data_vencimento) {
      return <td className="p-1 text-center font-mono text-[10px] text-slate-400 border border-slate-300">N/A</td>;
    }

    const dataFormatada = formatarDataBr(lic.data_vencimento);

    if (!destacarVencimentos) {
      return (
        <td className="p-1 text-center font-mono text-[10px] text-slate-800 border border-slate-300">
          {dataFormatada}
        </td>
      );
    }

    const status = calcularStatusLicenca(lic, dataReferencia, db.configuracao);
    const colors = getStatusColor(status);

    const isExpired = status === 'Vencido';
    const isWarning = status.startsWith('Vence ≤');

    return (
      <td
        style={
          isExpired || isWarning
            ? { backgroundColor: colors.bg, color: colors.text, fontWeight: isExpired ? 'bold' : '600' }
            : {}
        }
        className="p-1 text-center font-mono text-[10px] border border-slate-300"
      >
        {dataFormatada}
      </td>
    );
  };

  const renderSimNaoCell = (valor: string, bgGray = false) => {
    const isSim = valor === 'SIM';
    const isNao = valor === 'NÃO';
    return (
      <td
        className={`p-1 text-center font-bold text-[10px] border border-slate-300 ${
          bgGray ? 'bg-[#EDEDED]' : ''
        } ${isSim ? 'text-slate-900' : isNao ? 'text-slate-400' : 'text-transparent'}`}
      >
        {valor || '-'}
      </td>
    );
  };

  return (
    <div className="p-6 max-w-[1550px] mx-auto space-y-4">
      {/* Top Screen Controls (Hidden during print) */}
      <div className="no-print bg-white p-4 rounded-lg border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Lista Oficial de Designação e Habilitações</span>
            <span className="text-xs bg-pink-100 text-pink-900 font-semibold px-2 py-0.5 rounded border border-pink-200">
              Formulário Oficial A4 Paisagem
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Documento de conformidade técnica para atendimento aos requisitos ANAC e EASA 145.1003.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* Base selector */}
          <div className="flex items-center gap-1.5 text-xs">
            <MapPin className="w-4 h-4 text-sky-800" />
            <span className="font-semibold text-slate-700">Filtrar Base:</span>
            <select
              value={filtroBase}
              onChange={(e) => setFiltroBase(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-sky-600 cursor-pointer"
            >
              {baseOptions.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.id === 'TOTAL' ? 'TOTAL (Todas as Bases)' : `${b.id} - ${b.nome}`}
                </option>
              ))}
            </select>
          </div>

          {/* Toggle Destacar Vencimentos */}
          <div className="flex items-center gap-2 text-xs">
            <Palette className="w-4 h-4 text-slate-500" />
            <span className="font-medium text-slate-700">Destacar Vencimentos:</span>
            <div className="inline-flex rounded border border-slate-300 bg-slate-50 p-0.5 text-xs font-semibold">
              <button
                onClick={() => setDestacarVencimentos(true)}
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  destacarVencimentos ? 'bg-sky-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                SIM
              </button>
              <button
                onClick={() => setDestacarVencimentos(false)}
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  !destacarVencimentos ? 'bg-slate-800 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                NÃO (Formal)
              </button>
            </div>
          </div>

          {/* Print Button */}
          <button
            onClick={triggerPrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-sky-900 text-white rounded-md text-xs font-semibold hover:bg-sky-800 transition-colors cursor-pointer shadow-xs"
          >
            <Printer className="w-4 h-4 text-sky-300" />
            <span>Imprimir Lista (A4 Paisagem)</span>
          </button>
        </div>
      </div>

      {/* Screen Warning when rows > 40 */}
      {rows.length > db.configuracao.limite_linhas_pagina && (
        <div className="no-print bg-amber-50 border border-amber-200 text-amber-900 px-4 py-2 rounded-md text-xs flex items-center justify-between">
          <span>
            Atenção: A lista atual possui <strong>{rows.length}</strong> mecânicos. Para caber perfeitamente em 1 página impressa, o limite recomendado é de até 40 linhas (ou utilize o filtro por Base).
          </span>
          <button
            onClick={() => setFiltroBase('REC')}
            className="text-amber-950 font-bold underline hover:text-amber-800 cursor-pointer ml-2"
          >
            Filtrar base REC (7 mecânicos)
          </button>
        </div>
      )}

      {/* Printable Sheet Container */}
      <div className="print-container bg-white p-6 rounded-lg border border-slate-200 shadow-sm print:p-0 print:border-none print:shadow-none">
        {/* Official Header */}
        <div className="flex items-center justify-between pb-3 border-b-2 border-slate-900 mb-2">
          {/* Company Brand & Logo */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-sky-950 text-white flex flex-col items-center justify-center font-black rounded border border-slate-900">
              <span className="text-sm tracking-tighter leading-none">IMPACTO</span>
              <span className="text-[8px] font-sans tracking-widest text-sky-300">AVIATION</span>
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight text-slate-900 leading-none">
                IMPACTO AVIATION SERVIÇOS AERONÁUTICOS
              </h2>
              <p className="text-[10px] font-bold text-slate-700 tracking-wide mt-0.5">
                ORGANIZAÇÃO DE MANUTENÇÃO AERONÁUTICA — ANAC / EASA PART 145.1003
              </p>
              <p className="text-[9px] text-slate-500 font-medium">
                LISTA OFICIAL DE DESIGNAÇÃO TÉCNICA E HABILITAÇÃO DE PESSOAL CERTIFICADOR
              </p>
            </div>
          </div>

          {/* Reference and Scope Metadata */}
          <div className="text-right text-[11px] leading-tight space-y-0.5">
            <div className="font-bold text-slate-900">
              BASE:{' '}
              <span className="font-mono text-sky-900 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                {filtroBase}
              </span>
            </div>
            <div className="text-slate-600 font-medium">
              DATA DE EMISSÃO / REF:{' '}
              <span className="font-mono font-bold text-slate-900">
                {formatarDataBr(dataReferencia)}
              </span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono">
              TOTAL DE MECÂNICOS LISTADOS: <span className="font-bold text-slate-800">{rows.length}</span>
            </div>
          </div>
        </div>

        {/* 4-Tier Complex Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-slate-300 text-[10px]">
            {/* Multi-tier Merged Header */}
            <thead>
              {/* Row 1 of Header */}
              <tr className="bg-slate-200 text-slate-900 text-center font-bold">
                <th rowSpan={3} className="border border-slate-300 px-2 py-1 text-center w-16">
                  BASE
                </th>
                <th rowSpan={3} className="border border-slate-300 px-2 py-1 text-left min-w-[190px]">
                  NOMES
                </th>
                <th rowSpan={3} className="border border-slate-300 px-1 py-1 text-center w-14">
                  IMP
                </th>
                <th colSpan={9} className="border border-slate-300 px-2 py-1 bg-slate-300 text-slate-950 font-black">
                  LICENSE (COM 200607-05 / ANAC)
                </th>
                <th rowSpan={3} className="border border-slate-300 px-1 py-1 text-center w-14">
                  EASA<br />Type
                </th>
                <th
                  colSpan={5}
                  style={{ backgroundColor: '#FF99FF' }}
                  className="border border-slate-400 px-2 py-1 text-slate-950 font-black text-xs"
                >
                  DESIGNAÇÃO
                </th>
                <th
                  colSpan={6}
                  style={{ backgroundColor: '#FF99FF' }}
                  className="border border-slate-400 px-2 py-1 text-slate-950 font-black text-xs"
                >
                  AERONAVES
                </th>
              </tr>

              {/* Row 2 of Header: License Sub-blocks and Validity text banner */}
              <tr className="bg-slate-100 text-slate-900 text-center font-bold text-[9px]">
                <th rowSpan={2} className="border border-slate-300 px-1 py-0.5 w-14">
                  CANAC
                </th>
                <th colSpan={3} className="border border-slate-300 px-1 py-0.5 bg-slate-200">
                  CCT License
                </th>
                <th colSpan={4} className="border border-slate-300 px-1 py-0.5 bg-slate-200">
                  CHT License and expiration
                </th>
                <th colSpan={2} className="border border-slate-300 px-1 py-0.5 bg-slate-200">
                  FAA AMP
                </th>
                {/* Designation Functions */}
                <th className="border border-slate-300 px-1 py-0.5 bg-[#EDEDED] font-bold text-[9px]">Executante</th>
                <th className="border border-slate-300 px-1 py-0.5 bg-[#EDEDED] font-bold text-[9px]">Supervisor</th>
                <th className="border border-slate-300 px-1 py-0.5 bg-[#EDEDED] font-bold text-[9px]">IIO</th>
                <th className="border border-slate-300 px-1 py-0.5 bg-[#EDEDED] font-bold text-[9px]">Inspetor</th>
                <th className="border border-slate-300 px-1 py-0.5 bg-[#EDEDED] font-bold text-[9px]">APRS</th>
                {/* Aircraft Models */}
                <th className="border border-slate-300 px-1 py-0.5 font-bold text-[9px]">B737</th>
                <th className="border border-slate-300 px-1 py-0.5 font-bold text-[9px]">E190E2</th>
                <th className="border border-slate-300 px-1 py-0.5 font-bold text-[9px]">A320FAM</th>
                <th className="border border-slate-300 px-1 py-0.5 font-bold text-[9px]">A330</th>
                <th className="border border-slate-300 px-1 py-0.5 font-bold text-[9px]">B767</th>
                <th className="border border-slate-300 px-1 py-0.5 font-bold text-[9px]">B777</th>
              </tr>

              {/* Row 3 of Header: Lowest level column names */}
              <tr className="bg-slate-50 text-slate-700 text-center font-semibold text-[8px]">
                {/* CCT */}
                <th className="border border-slate-300 px-1 py-0.5">AVI</th>
                <th className="border border-slate-300 px-1 py-0.5">CEL</th>
                <th className="border border-slate-300 px-1 py-0.5">GMP</th>
                {/* CHT */}
                <th className="border border-slate-300 px-1 py-0.5 min-w-[55px]">Licença Nº</th>
                <th className="border border-slate-300 px-1 py-0.5 min-w-[62px]">AVI</th>
                <th className="border border-slate-300 px-1 py-0.5 min-w-[62px]">CEL</th>
                <th className="border border-slate-300 px-1 py-0.5 min-w-[62px]">GMP</th>
                {/* FAA */}
                <th className="border border-slate-300 px-1 py-0.5 min-w-[55px]">License Nº</th>
                <th className="border border-slate-300 px-1 py-0.5 min-w-[58px]">Expedition</th>
                {/* Designation repeat headers */}
                <th className="border border-slate-300 px-1 py-0.5 bg-[#EDEDED]"></th>
                <th className="border border-slate-300 px-1 py-0.5 bg-[#EDEDED]"></th>
                <th className="border border-slate-300 px-1 py-0.5 bg-[#EDEDED]"></th>
                <th className="border border-slate-300 px-1 py-0.5 bg-[#EDEDED]"></th>
                <th className="border border-slate-300 px-1 py-0.5 bg-[#EDEDED]"></th>
                {/* Aircraft repeat headers */}
                <th className="border border-slate-300 px-1 py-0.5"></th>
                <th className="border border-slate-300 px-1 py-0.5"></th>
                <th className="border border-slate-300 px-1 py-0.5"></th>
                <th className="border border-slate-300 px-1 py-0.5"></th>
                <th className="border border-slate-300 px-1 py-0.5"></th>
                <th className="border border-slate-300 px-1 py-0.5"></th>
              </tr>
            </thead>

            {/* Table Rows */}
            <tbody className="divide-y divide-slate-200">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={24} className="p-8 text-center text-slate-500 text-xs">
                    Nenhum mecânico designado para a base selecionada ({filtroBase}).
                  </td>
                </tr>
              ) : (
                rows.map((r, index) => (
                  <tr key={r.pessoa.id} className="hover:bg-sky-50/40 print:hover:bg-transparent">
                    {/* BASE */}
                    <td className="p-1 text-center font-mono font-bold text-[9px] text-slate-700 border border-slate-300 whitespace-nowrap">
                      {r.baseTexto}
                    </td>

                    {/* NOMES */}
                    <td className="p-1 px-2 font-semibold text-slate-900 border border-slate-300 whitespace-nowrap text-[10px]">
                      {r.pessoa.nome}
                    </td>

                    {/* IMP */}
                    <td className="p-1 text-center font-mono font-medium text-slate-600 border border-slate-300 text-[9px]">
                      {r.imp || '-'}
                    </td>

                    {/* CANAC */}
                    <td className="p-1 text-center font-mono text-slate-800 border border-slate-300 text-[10px]">
                      {r.pessoa.canac || '-'}
                    </td>

                    {/* CCT License AVI / CEL / GMP */}
                    <td className="p-1 text-center font-mono text-[9px] text-slate-600 border border-slate-300">
                      {r.cctAvi || '-'}
                    </td>
                    <td className="p-1 text-center font-mono text-[9px] text-slate-600 border border-slate-300">
                      {r.cctCel || '-'}
                    </td>
                    <td className="p-1 text-center font-mono text-[9px] text-slate-600 border border-slate-300">
                      {r.cctGmp || '-'}
                    </td>

                    {/* CHT Licença Nº */}
                    <td className="p-1 text-center font-mono font-semibold text-[9px] text-slate-800 border border-slate-300">
                      {r.licencaNumero || '-'}
                    </td>

                    {/* CHT Dates with Color Highlighting */}
                    {renderChtDateCell(r.chtAvi)}
                    {renderChtDateCell(r.chtCel)}
                    {renderChtDateCell(r.chtGmp)}

                    {/* FAA AMP License Nº & Expedition */}
                    <td className="p-1 text-center font-mono text-[9px] text-slate-700 border border-slate-300">
                      {r.faaNumero || 'N/A'}
                    </td>
                    <td className="p-1 text-center font-mono text-[9px] text-slate-700 border border-slate-300">
                      {r.faaExpedicao ? formatarDataBr(r.faaExpedicao) : 'N/A'}
                    </td>

                    {/* EASA Type */}
                    <td className="p-1 text-center font-bold text-[9px] border border-slate-300 text-slate-800">
                      {r.easaType}
                    </td>

                    {/* Funções de Designação (#EDEDED background) */}
                    {renderSimNaoCell(r.executante, true)}
                    {renderSimNaoCell(r.supervisor, true)}
                    {renderSimNaoCell(r.iio, true)}
                    {renderSimNaoCell(r.inspetor, true)}
                    {renderSimNaoCell(r.aprs, true)}

                    {/* Frotas de Designação */}
                    {renderSimNaoCell(r.b737)}
                    {renderSimNaoCell(r.e190)}
                    {renderSimNaoCell(r.a320)}
                    {renderSimNaoCell(r.a330)}
                    {renderSimNaoCell(r.b767)}
                    {renderSimNaoCell(r.b777)}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Printable Footer with Official Signature */}
        <div className="mt-6 pt-4 border-t border-slate-300 flex items-end justify-between text-xs">
          <div className="text-[10px] text-slate-500 space-y-1">
            <p>
              <strong>Legenda de Validade:</strong> CHTs vencidas ou a vencer em até 90 dias aparecem destacadas para controle operacional prévio.
            </p>
            <p>
              Documento emitido pelo Sistema Informatizado de Treinamentos e Designação Técnica da Impacto Aviation.
            </p>
          </div>

          {/* Technical Responsible Signature Block */}
          <div className="text-center w-72">
            <div className="h-10 flex items-center justify-center">
              {db.configuracao.assinatura_url ? (
                <img
                  src={db.configuracao.assinatura_url}
                  alt="Assinatura"
                  className="max-h-10 object-contain mx-auto"
                />
              ) : (
                <div className="font-serif italic text-slate-700 text-sm tracking-wider">
                  Alysson Rabelo
                </div>
              )}
            </div>
            <div className="border-t border-slate-800 pt-1">
              <div className="font-bold text-[11px] text-slate-900 leading-tight">
                {db.configuracao.responsavel_tecnico || 'Alysson Rabelo - Technical Responsible'}
              </div>
              <div className="text-[9px] text-slate-600 font-medium">
                Responsável Técnico — COM 200607-05
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
