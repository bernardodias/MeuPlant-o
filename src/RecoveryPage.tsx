import React, { useState, useEffect } from 'react';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { motion } from 'motion/react';
import { ArrowLeft, Database, Download, Clock, DollarSign, MapPin } from 'lucide-react';
import { formatCurrency } from './lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Configuração do projeto antigo
const oldFirebaseConfig = {
  "projectId": "meuplannerfinanceiro",
  "appId": "1:494885134132:web:f43519bca302555326cf61",
  "apiKey": "AIzaSyC5l3Z8trvrDjI-9tNj2KpPVnuFjfKNRCs",
  "authDomain": "meuplannerfinanceiro.firebaseapp.com",
  "firestoreDatabaseId": "ai-studio-15fc1725-4a5e-441a-932b-50cb8d4aed6b",
  "storageBucket": "meuplannerfinanceiro.firebasestorage.app",
  "messagingSenderId": "494885134132"
};

export const RecoveryPage = ({ userId, onBack }: { userId: string, onBack: () => void }) => {
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOldData = async () => {
      try {
        // Inicializa uma segunda instância do Firebase para o projeto antigo
        let oldApp;
        if (getApps().find(app => app.name === 'oldProject')) {
          oldApp = getApp('oldProject');
        } else {
          oldApp = initializeApp(oldFirebaseConfig, 'oldProject');
        }

        const oldDb = getFirestore(oldApp, oldFirebaseConfig.firestoreDatabaseId);
        
        // Busca plantões do usuário no projeto antigo
        const q = query(collection(oldDb, 'shifts'), where('userId', '==', userId));
        const querySnapshot = await getDocs(q);
        
        const fetchedShifts = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Ordena por data decrescente
        fetchedShifts.sort((a: any, b: any) => b.startAt.toMillis() - a.startAt.toMillis());
        
        setShifts(fetchedShifts);
      } catch (err: any) {
        console.error("Erro ao recuperar dados antigos:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchOldData();
    }
  }, [userId]);

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-y-auto pb-24">
      <header className="p-6 flex items-center gap-4 sticky top-0 bg-slate-950/80 backdrop-blur-md z-10">
        <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Recuperação de Dados</h1>
          <p className="text-[10px] text-emerald-500 uppercase tracking-widest mt-1">Conectado ao projeto antigo</p>
        </div>
      </header>

      <div className="px-6 space-y-6">
        <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl">
          <p className="text-xs text-amber-200 leading-relaxed">
            Estes são os dados encontrados no projeto <strong>meuplannerfinanceiro</strong>. 
            Você pode usá-los como referência para cadastrar no novo projeto.
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4" />
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Buscando plantões...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center bg-rose-500/10 rounded-3xl border border-rose-500/20">
            <p className="text-rose-500 font-bold mb-2">Erro na conexão</p>
            <p className="text-xs text-slate-400">{error}</p>
          </div>
        ) : shifts.length === 0 ? (
          <div className="py-20 text-center opacity-30">
            <Database size={48} className="mx-auto mb-4" />
            <p>Nenhum plantão encontrado para este usuário.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Lista de Plantões ({shifts.length})</h2>
            </div>
            
            {shifts.map((shift) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={shift.id}
                className="bg-slate-900/40 border border-white/5 rounded-2xl p-5 space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-8 rounded-full" style={{ backgroundColor: shift.color }} />
                    <div>
                      <h3 className="font-bold text-slate-100">{shift.name}</h3>
                      <p className="text-[10px] text-slate-500 uppercase font-bold">{format(shift.startAt.toDate(), "dd 'de' MMMM, yyyy", { locale: ptBR })}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-emerald-400">{formatCurrency(shift.value)}</p>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">{shift.status}</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/5">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Clock size={14} className="text-slate-600" />
                    <span>{format(shift.startAt.toDate(), 'HH:mm')} — {format(shift.endAt.toDate(), 'HH:mm')}</span>
                  </div>
                  {shift.locationId && (
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <MapPin size={14} className="text-slate-600" />
                      <span className="truncate">Local ID: {shift.locationId}</span>
                    </div>
                  )}
                </div>

                {shift.notes && (
                  <div className="p-3 bg-slate-950/50 rounded-xl text-[11px] text-slate-500 italic">
                    "{shift.notes}"
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
