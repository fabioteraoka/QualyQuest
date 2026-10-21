import React, { useMemo, useState } from 'react';
import { Download, Edit2, Plus, Search, Trash2, Users, Wrench } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { repository } from '../services/storage';
import { FabricanteMotor, MotorCatalogo } from '../types';

export const MotoresView: React.FC = () => {
  const { db, currentUser, showToast, navigateToFicha } = useApp();

  const [busca, setBusca] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMotor, setEditingMotor] = useState<MotorCatalogo | null>(null);

  const [fabricante, setFabricante] = useState<FabricanteMotor>('GE');
  const [modelo, setModelo] = useState('');

  const motores = useMemo(() => {
    return db.motoresCatalogo.filter((m) => {
      if (busca.trim()) {
        const q = busca.toLowerCase();
        return (
          m.fabricante.toLowerCase().includes(q) ||
          m.modelo.toLowerCase().includes(q) ||
          m.id.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [db.motoresCatalogo, busca]);

  const handleOpenNew = () => {
    setEditingMotor(null);
    setFabricante('GE');
    setModelo('');
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = editingMotor?.id || `MOT-${fabricante}-${modelo.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase() || 'GEN'}`;
    const motorData: MotorCatalogo = {
      id,
      fabricante,
      modelo,
    };

    try {
      await repository.saveMotor(motorData, currentUser.nome);
      setModalOpen(false);
      showToast(`Motor ${fabricante} ${modelo} persistido no Firestore!`);
    } catch (err: any) {
      showToast(`Erro ao salvar motor no Firestore: ${err?.message || err}`);
    }
  };

  const handleDelete = async (motorId: string, motorNome: string) => {
    if (confirm(`Deseja realmente excluir o motor "${motorNome}"?`)) {
      try {
        await repository.deleteMotor(motorId, currentUser.nome);
        showToast(`Motor "${motorNome}" removido do Firestore.`);
      } catch (err: any) {
        showToast(`Erro ao remover motor do Firestore: ${err?.message || err}`);
      }
    }
  };

  const handleEdit = (m: MotorCatalogo) => {
    setEditingMotor(m);
    setFabricante(m.fabricante);
    setModelo(m.modelo);
    setModalOpen(true);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      {/* Header */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Catálogo &amp; Vínculos de Motores Aeronáuticos</span>
            <span className="text-xs bg-sky-100 text-sky-900 font-semibold px-2 py-0.5 rounded">
              {motores.length} modelos
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Modelos de motores (GE, CFM, IAE, PW, RR) vinculados às habilitações de treinamento dos mecânicos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar motor ou modelo..."
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded focus:bg-white w-52"
            />
          </div>

          {currentUser.perfil !== 'Leitor' && (
            <button
              onClick={handleOpenNew}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-900 text-white rounded text-xs font-semibold hover:bg-sky-800 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo Modelo de Motor</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid of Motors */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {motores.map((m) => {
          // Count distinct mechanics trained on this engine
          const trnIds = db.treinamentosMotor
            .filter((tm) => tm.motor_id === m.id)
            .map((tm) => tm.treinamento_id);

          const mechanicsIds = new Set(
            db.treinamentos
              .filter((t) => trnIds.includes(t.id) && !t.substituido_por)
              .map((t) => t.pessoa_id)
          );

          return (
            <div
              key={m.id}
              className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                    {m.fabricante}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">{m.id}</span>
                </div>
                <h3 className="font-bold text-slate-950 text-sm mt-2">
                  {m.modelo || 'Padrão Fabricante (Sem modelo especificado)'}
                </h3>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">
                  <strong>{mechanicsIds.size}</strong> mecânicos habilitados
                </span>
                {currentUser.perfil !== 'Leitor' ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEdit(m)}
                      className="text-slate-400 hover:text-sky-700 p-1 cursor-pointer"
                      title="Editar motor"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(m.id, `${m.fabricante} ${m.modelo}`)}
                      className="text-slate-400 hover:text-red-600 p-1 cursor-pointer"
                      title="Excluir motor"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <span className="text-sky-700 font-semibold text-[11px]">Vínculo N:N</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Add Engine */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSave}
            className="bg-white rounded-lg shadow-xl max-w-sm w-full p-5 space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm">Novo Motor no Catálogo</h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Fabricante:</label>
              <select
                value={fabricante}
                onChange={(e) => setFabricante(e.target.value as any)}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-bold"
              >
                <option value="GE">GE</option>
                <option value="CFM">CFM</option>
                <option value="IAE">IAE</option>
                <option value="PW">PW</option>
                <option value="RR">RR</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Modelo do Motor:
              </label>
              <input
                type="text"
                value={modelo}
                onChange={(e) => setModelo(e.target.value)}
                placeholder="Ex.: LEAP-1B, CF6-80C2..."
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-mono font-bold"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-3 py-1.5 border border-slate-300 rounded text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-sky-900 text-white rounded text-xs font-semibold hover:bg-sky-800 cursor-pointer"
              >
                Cadastrar Motor
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
