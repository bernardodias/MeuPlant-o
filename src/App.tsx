import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  DollarSign, 
  MapPin, 
  BarChart3, 
  Settings as SettingsIcon,
  Plus,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User as UserIcon,
  Check,
  X,
  ArrowLeft,
  Trash2,
  ExternalLink,
  Bell,
  FileSpreadsheet,
  RotateCcw,
  Download,
  MessageSquare,
  LifeBuoy,
  Database,
  Clock,
  Copy,
  Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  isSameMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isToday
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './AuthContext';
import { Shift, Location, ViewType, ShiftStatus, ShiftTemplate } from './types';
import { cn, formatCurrency } from './lib/utils';

// --- Components ---

const BottomNav = ({ activeView, onViewChange }: { activeView: ViewType, onViewChange: (view: ViewType) => void }) => {
  const navItems: { id: ViewType; label: string; icon: React.ElementType }[] = [
    { id: 'calendar', label: 'Escala', icon: CalendarIcon },
    { id: 'financial', label: 'Finanças', icon: DollarSign },
    { id: 'templates', label: 'Templates', icon: Layers },
    { id: 'stats', label: 'Análise', icon: BarChart3 },
    { id: 'settings', label: 'Ajustes', icon: SettingsIcon },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/80 backdrop-blur-xl border-t border-white/5 flex justify-around items-center h-20 pb-safe z-50">
      {navItems.map((item) => {
        const isActive = activeView === item.id;
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={cn(
              "flex flex-col items-center justify-center w-full h-full transition-all duration-300",
              isActive ? "text-emerald-400" : "text-slate-400 hover:text-slate-200"
            )}
          >
            <div className="relative">
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
            </div>
            <span className={cn(
              "text-[10px] mt-1.5 font-semibold tracking-wide uppercase",
              isActive ? "opacity-100" : "opacity-60"
            )}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};

const FAB = ({ onClick }: { onClick: () => void }) => (
  <button
    onClick={onClick}
    className="fixed bottom-24 right-6 w-14 h-14 bg-emerald-500 text-slate-950 rounded-2xl flex items-center justify-center shadow-[0_8px_30px_rgb(16,185,129,0.3)] active:scale-90 transition-all z-40"
  >
    <Plus size={28} strokeWidth={3} />
  </button>
);

// --- Pages ---

const CalendarPage = ({ shifts, onAddShift, onEditShift, onToggleStatus }: { shifts: Shift[], onAddShift: (date: Date) => void, onEditShift: (shift: Shift) => void, onToggleStatus: (shift: Shift) => void }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const handleGoToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  const selectedDateShifts = shifts.filter(s => isSameDay(s.startAt.toDate(), selectedDate));

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="p-6 flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {format(currentDate, 'MMMM', { locale: ptBR })}
          </h1>
          <span className="text-slate-500 font-mono text-sm">{format(currentDate, 'yyyy')}</span>
        </div>
        <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-xl border border-white/5">
          <button onClick={prevMonth} className="p-2 hover:bg-slate-800 rounded-lg transition-colors"><ChevronLeft size={20} /></button>
          <button onClick={handleGoToToday} className="px-3 py-1 text-xs font-bold uppercase tracking-wider hover:bg-slate-800 rounded-lg transition-colors">Hoje</button>
          <button onClick={nextMonth} className="p-2 hover:bg-slate-800 rounded-lg transition-colors"><ChevronRight size={20} /></button>
        </div>
      </header>

      {/* Weekdays */}
      <div className="grid grid-cols-7 px-4 mb-2">
        {weekDays.map((d, i) => (
          <div key={i} className="text-center text-[10px] font-bold uppercase tracking-widest text-slate-600">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 px-4 gap-1">
        {calendarDays.map((day, i) => {
          const dayShifts = shifts.filter(s => isSameDay(s.startAt.toDate(), day));
          const isCurrentMonth = isSameMonth(day, monthStart);
          const isSelected = isSameDay(day, selectedDate);

          return (
            <button
              key={i}
              onClick={() => setSelectedDate(day)}
              className={cn(
                "h-12 flex flex-col items-center justify-center relative rounded-xl transition-all duration-200",
                isSelected ? "bg-slate-800 text-white ring-2 ring-slate-700 shadow-lg scale-105" : 
                isCurrentMonth ? "hover:bg-slate-900 text-slate-300" : "text-slate-700"
              )}
            >
              <span className="text-sm font-bold z-10">{format(day, 'd')}</span>
              {dayShifts.length > 0 && (
                <div className="absolute bottom-1.5 flex gap-0.5">
                  {dayShifts.slice(0, 3).map((s, idx) => (
                    <div 
                      key={idx} 
                      className={cn(
                        "w-1 h-1 rounded-full",
                        isSelected ? "ring-1 ring-slate-800" : ""
                      )} 
                      style={{ backgroundColor: s.color }} 
                    />
                  ))}
                </div>
              )}
              {isToday(day) && !isSelected && (
                <div className="absolute top-2 right-2 w-1 h-1 bg-emerald-500 rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Shifts List */}
      <div className="flex-1 mt-6 bg-slate-900/50 rounded-t-[32px] border-t border-white/5 p-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500">
            {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
          </h2>
          <span className="text-xs font-mono text-slate-600">{selectedDateShifts.length} Plantões</span>
        </div>

        {selectedDateShifts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 opacity-20">
            <Clock size={48} strokeWidth={1} />
            <p className="mt-4 text-sm font-medium">Dia livre</p>
          </div>
        ) : (
          <div className="space-y-4">
            {selectedDateShifts.map(shift => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={shift.id}
                onClick={() => onEditShift(shift)}
                className="bg-slate-900 border border-white/5 rounded-2xl p-4 flex items-center gap-4 active:scale-[0.98] transition-all"
              >
                <div className="w-1.5 h-12 rounded-full" style={{ backgroundColor: shift.color }} />
                <div className="flex-1">
                  <h3 className="font-bold text-slate-100">{shift.name}</h3>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                    <Clock size={12} />
                    <span>{format(shift.startAt.toDate(), 'HH:mm')} — {format(shift.endAt.toDate(), 'HH:mm')}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-emerald-400">{formatCurrency(shift.value)}</p>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleStatus(shift);
                    }}
                    className={cn(
                      "inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter mt-1 transition-all active:scale-90",
                      shift.status === 'pago' ? "bg-emerald-500/10 text-emerald-500" : 
                      shift.status === 'realizado' ? "bg-amber-500/10 text-amber-500" :
                      "bg-rose-500/10 text-rose-500"
                    )}
                  >
                    {shift.status}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
      
      <FAB onClick={() => onAddShift(selectedDate)} />
    </div>
  );
};

const FinancialPage = ({ shifts, onTogglePaid }: { shifts: Shift[], onTogglePaid: (shift: Shift) => void }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const monthShifts = shifts
    .filter(s => isSameMonth(s.startAt.toDate(), currentDate))
    .sort((a, b) => a.startAt.toMillis() - b.startAt.toMillis());

  // Totals for the selected month
  const totalPendente = monthShifts.filter(s => s.status === 'pendente').reduce((acc, s) => acc + s.value, 0);
  const totalRealizado = monthShifts.filter(s => s.status === 'realizado').reduce((acc, s) => acc + s.value, 0);
  const totalPago = monthShifts.filter(s => s.status === 'pago').reduce((acc, s) => acc + s.value, 0);

  // Data for daily evolution chart (current month)
  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate)
  });

  let cumulativePendente = 0;
  let cumulativeRealizado = 0;
  let cumulativePago = 0;

  const dailyChartData = daysInMonth.map(day => {
    const dayShifts = monthShifts.filter(s => isSameDay(s.startAt.toDate(), day));
    
    cumulativePendente += dayShifts.filter(s => s.status === 'pendente').reduce((acc, s) => acc + s.value, 0);
    cumulativeRealizado += dayShifts.filter(s => s.status === 'realizado').reduce((acc, s) => acc + s.value, 0);
    cumulativePago += dayShifts.filter(s => s.status === 'pago').reduce((acc, s) => acc + s.value, 0);

    return {
      name: format(day, 'dd'),
      pendente: cumulativePendente,
      realizado: cumulativeRealizado,
      pago: cumulativePago,
    };
  });

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-y-auto pb-24">
      <header className="p-6 flex items-center justify-between sticky top-0 bg-slate-950/80 backdrop-blur-md z-10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Finanças</h1>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Controle de Honorários</p>
        </div>
        
        <div className="flex items-center gap-2 bg-slate-900/50 p-1 rounded-2xl border border-white/5">
          <button 
            onClick={handlePrevMonth}
            className="p-2 hover:bg-white/5 rounded-xl transition-colors text-slate-400 hover:text-white"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="px-2 text-xs font-bold text-slate-200 min-w-[100px] text-center capitalize">
            {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
          </div>
          <button 
            onClick={handleNextMonth}
            className="p-2 hover:bg-white/5 rounded-xl transition-colors text-slate-400 hover:text-white"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </header>

      {/* Totals Section */}
      <div className="px-6 grid grid-cols-3 gap-3 mb-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-[24px] relative overflow-hidden"
        >
          <span className="text-[9px] font-black uppercase tracking-[0.1em] text-rose-500/60 block mb-1">Pendente</span>
          <span className="text-lg font-black text-rose-500">{formatCurrency(totalPendente)}</span>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-[24px] relative overflow-hidden"
        >
          <span className="text-[9px] font-black uppercase tracking-[0.1em] text-amber-500/60 block mb-1">Realizado</span>
          <span className="text-lg font-black text-amber-500">{formatCurrency(totalRealizado)}</span>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-[24px] relative overflow-hidden"
        >
          <span className="text-[9px] font-black uppercase tracking-[0.1em] text-emerald-500/60 block mb-1">Pago</span>
          <span className="text-lg font-black text-emerald-500">{formatCurrency(totalPago)}</span>
        </motion.div>
      </div>

      {/* Daily Evolution Chart Section */}
      <div className="px-6 mb-8">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-slate-900/40 border border-white/5 p-6 rounded-[32px] space-y-6"
        >
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Balanço Diário ({format(currentDate, 'MMM', { locale: ptBR })})</h2>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                <span className="text-[7px] font-bold text-slate-500 uppercase tracking-widest">Pend</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <span className="text-[7px] font-bold text-slate-500 uppercase tracking-widest">Real</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[7px] font-bold text-slate-500 uppercase tracking-widest">Pago</span>
              </div>
            </div>
          </div>
          
          <div className="h-48 w-full -ml-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyChartData}>
                <defs>
                  <linearGradient id="colorPendente" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorRealizado" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorPago" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 9, fontWeight: 600 }}
                  dy={10}
                  interval={4}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 9 }}
                  tickFormatter={(value) => `R$${value}`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0f172a', 
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    fontSize: '11px',
                    color: '#fff'
                  }}
                  formatter={(value: number) => [formatCurrency(value), '']}
                />
                <Area 
                  type="monotone" 
                  dataKey="pendente" 
                  stroke="#f43f5e" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorPendente)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="realizado" 
                  stroke="#f59e0b" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorRealizado)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="pago" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorPago)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* List Section */}
      <div className="px-6 space-y-4">
        <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">Detalhamento Mensal</h2>
        
        {monthShifts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 bg-slate-900/20 rounded-[32px] border border-dashed border-white/5">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-slate-700 mb-4">
              <DollarSign size={24} />
            </div>
            <p className="text-xs font-medium text-slate-600 uppercase tracking-widest">Sem registros este mês</p>
          </div>
        ) : (
          <div className="space-y-3">
            {monthShifts.map(shift => (
              <motion.div 
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                key={shift.id} 
                className="bg-slate-900/40 border border-white/5 rounded-[24px] p-4 flex items-center gap-4 group hover:bg-slate-900/60 transition-colors"
              >
                <div className="w-1.5 h-10 rounded-full" style={{ backgroundColor: shift.color }} />
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-200 truncate">{shift.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock size={10} className="text-slate-600" />
                    <p className="text-[10px] font-mono text-slate-500">{format(shift.startAt.toDate(), 'dd MMM, HH:mm')}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-100">{formatCurrency(shift.value)}</p>
                  <button 
                    onClick={() => onTogglePaid(shift)}
                    className={cn(
                      "mt-2 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[0.15em] transition-all active:scale-95",
                      shift.status === 'pago' 
                        ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" 
                        : shift.status === 'realizado'
                        ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                        : "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                    )}
                  >
                    {shift.status === 'pago' ? 'Pago' : shift.status === 'realizado' ? 'Realizado' : 'Pendente'}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
const TemplatesPage = ({ 
  templates, 
  onAddTemplate, 
  onDeleteTemplate,
  onUseTemplate
}: { 
  templates: ShiftTemplate[], 
  onAddTemplate: (template: Omit<ShiftTemplate, 'id'>) => void,
  onDeleteTemplate: (id: string) => void,
  onUseTemplate: (template: ShiftTemplate) => void
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newTemplate, setNewTemplate] = useState<Omit<ShiftTemplate, 'id' | 'userId'>>({
    name: '',
    value: 0,
    startTime: '07:00',
    endTime: '19:00',
    color: '#3b82f6'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddTemplate({ ...newTemplate, userId: '' }); // userId will be set in the main App
    setIsAdding(false);
    setNewTemplate({
      name: '',
      value: 0,
      startTime: '07:00',
      endTime: '19:00',
      color: '#3b82f6'
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-y-auto pb-24">
      <header className="p-6 flex items-center justify-between sticky top-0 bg-slate-950/80 backdrop-blur-md z-10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Templates</h1>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Plantões Recorrentes</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="w-10 h-10 rounded-full bg-slate-100 text-slate-950 flex items-center justify-center shadow-lg active:scale-90 transition-transform"
        >
          <Plus size={20} />
        </button>
      </header>

      <div className="px-6 space-y-4">
        {templates.length === 0 && !isAdding ? (
          <div className="flex flex-col items-center justify-center py-20 bg-slate-900/20 rounded-[40px] border border-dashed border-white/5">
            <div className="w-16 h-16 rounded-3xl bg-slate-900 flex items-center justify-center text-slate-700 mb-6">
              <Layers size={32} />
            </div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em] text-center px-12">
              Crie templates para agilizar seu cronograma
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map(template => (
              <motion.div 
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                key={template.id}
                className="bg-slate-900/40 border border-white/5 rounded-[32px] p-6 relative overflow-hidden group"
              >
                <div className="absolute top-0 left-0 w-1.5 h-full" style={{ backgroundColor: template.color }} />
                
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-100">{template.name}</h3>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">
                      {template.startTime} — {template.endTime}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => onUseTemplate(template)}
                      className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                      title="Usar Template"
                    >
                      <Plus size={16} />
                    </button>
                    <button 
                      onClick={() => onDeleteTemplate(template.id)}
                      className="p-2 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500/20 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign size={14} className="text-emerald-500" />
                    <span className="text-xl font-black text-slate-100">{formatCurrency(template.value)}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-50 flex items-end sm:items-center justify-center p-4"
          >
            <motion.div 
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="bg-slate-900 w-full max-w-lg rounded-[40px] border border-white/10 p-8 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl font-bold">Novo Template</h2>
                <button onClick={() => setIsAdding(false)} className="p-2 text-slate-500 hover:text-slate-100">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Nome do Template</label>
                  <input 
                    required
                    type="text"
                    value={newTemplate.name}
                    onChange={e => setNewTemplate({ ...newTemplate, name: e.target.value })}
                    className="w-full bg-slate-950 border border-white/5 rounded-2xl p-4 text-slate-100 focus:border-blue-500 outline-none transition-colors"
                    placeholder="Ex: Plantão Noturno UTI"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Início</label>
                    <input 
                      required
                      type="time"
                      value={newTemplate.startTime}
                      onChange={e => setNewTemplate({ ...newTemplate, startTime: e.target.value })}
                      className="w-full bg-slate-950 border border-white/5 rounded-2xl p-4 text-slate-100 focus:border-blue-500 outline-none transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Fim</label>
                    <input 
                      required
                      type="time"
                      value={newTemplate.endTime}
                      onChange={e => setNewTemplate({ ...newTemplate, endTime: e.target.value })}
                      className="w-full bg-slate-950 border border-white/5 rounded-2xl p-4 text-slate-100 focus:border-blue-500 outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Valor do Plantão</label>
                  <div className="relative flex items-center">
                    <span className="absolute left-5 text-emerald-500 font-bold text-xl">R$</span>
                    <input 
                      required
                      type="text"
                      inputMode="numeric"
                      value={new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(newTemplate.value || 0)}
                      onChange={e => {
                        const rawValue = e.target.value.replace(/\D/g, '');
                        const numericValue = parseInt(rawValue, 10) / 100;
                        setNewTemplate({ ...newTemplate, value: isNaN(numericValue) ? 0 : Math.max(0, numericValue) });
                      }}
                      className="w-full text-3xl font-bold text-emerald-400 bg-slate-950 border border-white/5 rounded-2xl pl-14 pr-5 py-5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all"
                      placeholder="0,00"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Cor</label>
                  <div className="flex gap-3">
                    {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'].map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewTemplate({ ...newTemplate, color: c })}
                        className={cn(
                          "w-8 h-8 rounded-full transition-transform active:scale-90",
                          newTemplate.color === c ? "ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110" : "opacity-50"
                        )}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full bg-slate-100 text-slate-950 font-black uppercase tracking-[0.2em] py-5 rounded-2xl shadow-xl active:scale-[0.98] transition-all mt-4"
                >
                  Salvar Template
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const StatsPage = ({ shifts }: { shifts: Shift[] }) => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  // Helper to calculate hours between two timestamps
  const getHours = (start: Timestamp, end: Timestamp) => {
    const diff = end.toMillis() - start.toMillis();
    return diff / (1000 * 60 * 60);
  };

  // Filter shifts for the selected year
  const yearShifts = shifts.filter(s => s.startAt.toDate().getFullYear() === selectedYear && s.status !== 'pendente');
  
  // Monthly data for the chart
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const yearlyData = months.map((m, i) => {
    const monthShifts = yearShifts.filter(s => s.startAt.toDate().getMonth() === i);
    const earnings = monthShifts.reduce((acc, s) => acc + s.value, 0);
    const hours = monthShifts.reduce((acc, s) => acc + getHours(s.startAt, s.endAt), 0);
    return {
      name: m,
      earnings,
      hours,
      hourlyRate: hours > 0 ? earnings / hours : 0
    };
  });

  // Current month stats
  const currentMonthShifts = yearShifts.filter(s => s.startAt.toDate().getMonth() === selectedMonth);
  const totalEarnings = currentMonthShifts.reduce((acc, s) => acc + s.value, 0);
  const totalHours = currentMonthShifts.reduce((acc, s) => acc + getHours(s.startAt, s.endAt), 0);
  const avgHourlyRate = totalHours > 0 ? totalEarnings / totalHours : 0;
  const shiftCount = currentMonthShifts.length;

  // Comparison with previous month
  const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
  const prevYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
  const prevMonthShifts = shifts.filter(s => 
    s.startAt.toDate().getMonth() === prevMonth && 
    s.startAt.toDate().getFullYear() === prevYear && 
    s.status !== 'pendente'
  );
  const prevEarnings = prevMonthShifts.reduce((acc, s) => acc + s.value, 0);
  const earningsDiff = prevEarnings > 0 ? ((totalEarnings - prevEarnings) / prevEarnings) * 100 : 0;

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-y-auto pb-24">
      <header className="p-6">
        <h1 className="text-2xl font-bold tracking-tight">Análise</h1>
        <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Performance & Insights</p>
      </header>

      <div className="px-6 space-y-8">
        {/* Key Metrics Bento Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 bg-slate-900/40 border border-white/5 p-6 rounded-[32px] flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <DollarSign size={20} />
              </div>
              <div className={cn(
                "px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1",
                earningsDiff >= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
              )}>
                {earningsDiff >= 0 ? '+' : ''}{earningsDiff.toFixed(1)}% vs mês ant.
              </div>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Faturamento Mensal</p>
              <h3 className="text-3xl font-black text-white">{formatCurrency(totalEarnings)}</h3>
            </div>
          </div>

          <div className="bg-slate-900/40 border border-white/5 p-6 rounded-[32px]">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 mb-4">
              <Clock size={20} />
            </div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Horas Totais</p>
            <h3 className="text-xl font-black text-white">{totalHours.toFixed(1)}h</h3>
          </div>

          <div className="bg-slate-900/40 border border-white/5 p-6 rounded-[32px]">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-500 mb-4">
              <BarChart3 size={20} />
            </div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Valor/Hora Médio</p>
            <h3 className="text-xl font-black text-white">{formatCurrency(avgHourlyRate)}</h3>
          </div>
        </div>

        {/* Yearly Chart */}
        <div className="bg-slate-900/40 border border-white/5 p-6 rounded-[32px] space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Evolução Anual ({selectedYear})</h2>
            <select 
              value={selectedYear} 
              onChange={e => setSelectedYear(Number(e.target.value))}
              className="bg-slate-800 border-none text-[10px] font-bold text-slate-300 rounded-lg px-2 py-1 outline-none"
            >
              {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <div className="h-48 w-full -ml-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={yearlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 9, fontWeight: 600 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 9 }}
                  tickFormatter={(value) => `R$${value >= 1000 ? (value/1000).toFixed(0) + 'k' : value}`}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ 
                    backgroundColor: '#0f172a', 
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    fontSize: '11px',
                    color: '#fff'
                  }}
                  formatter={(value: number) => [formatCurrency(value), 'Faturamento']}
                />
                <Bar dataKey="earnings" radius={[4, 4, 0, 0]}>
                  {yearlyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === selectedMonth ? '#10b981' : '#1e293b'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Hourly Rate Comparison */}
        <div className="bg-slate-900/40 border border-white/5 p-6 rounded-[32px] space-y-6">
          <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Rentabilidade por Hora</h2>
          <div className="space-y-4">
            {yearlyData.filter(d => d.hourlyRate > 0).slice(-4).reverse().map((data, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400">
                    {data.name}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-200">{formatCurrency(data.hourlyRate)}/h</p>
                    <p className="text-[9px] text-slate-500">{data.hours.toFixed(0)} horas trabalhadas</p>
                  </div>
                </div>
                <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((data.hourlyRate / 500) * 100, 100)}%` }}
                    className="h-full bg-emerald-500"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Insights Section */}
        <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-[32px] mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center text-slate-950">
              <MessageSquare size={16} />
            </div>
            <h4 className="text-xs font-black text-emerald-500 uppercase tracking-widest">Insight do Especialista</h4>
          </div>
          <p className="text-xs text-emerald-100/70 leading-relaxed">
            Seu valor/hora médio este mês é de <span className="text-emerald-400 font-bold">{formatCurrency(avgHourlyRate)}</span>. 
            {avgHourlyRate > 200 
              ? " Você está operando em uma faixa de alta rentabilidade. Considere otimizar sua escala para manter o descanso necessário." 
              : " Há espaço para otimização. Tente concentrar seus plantões em locais com melhor remuneração por hora ou reduzir deslocamentos."}
          </p>
        </div>
      </div>
    </div>
  );
};
import * as XLSX from 'xlsx';

const SettingsPage = ({ shifts }: { shifts: Shift[] }) => {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState(true);
  const [weekStart, setWeekStart] = useState('Domingo');

  const exportToExcel = () => {
    const data = shifts.map(s => ({
      Nome: s.name,
      Valor: s.value,
      Status: s.status,
      Início: format(s.startAt.toDate(), 'dd/MM/yyyy HH:mm'),
      Término: format(s.endAt.toDate(), 'dd/MM/yyyy HH:mm'),
      Notas: s.notes
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plantões");
    XLSX.writeFile(wb, `Plantonista_Export_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const handleSync = () => {
    // In a real app, this might trigger a re-fetch. 
    // Here we'll just show a visual feedback by reloading or just a simple alert.
    window.location.reload();
  };

  const clearData = async () => {
    if (!confirm("Isso apagará permanentemente todos os seus plantões. Continuar?")) return;
    try {
      const batch = writeBatch(db);
      shifts.forEach(s => {
        batch.delete(doc(db, 'shifts', s.id));
      });
      await batch.commit();
      alert("Dados limpos com sucesso.");
    } catch (error) {
      console.error("Erro ao limpar dados:", error);
    }
  };

  const sections = [
    {
      title: "Perfil",
      items: [
        { label: user?.email || "Login", icon: UserIcon, action: () => {} }
      ]
    },
    {
      title: "Gestão",
      items: [
        { label: "Exportar para Excel", icon: FileSpreadsheet, action: exportToExcel },
        { label: "Limpar Histórico", icon: Trash2, action: clearData },
        { label: "Sincronizar Dados", icon: RotateCcw, action: handleSync }
      ]
    },
    {
      title: "Preferências",
      items: [
        { 
          label: "Início da Semana", 
          icon: CalendarIcon, 
          value: weekStart, 
          action: () => setWeekStart(prev => prev === 'Domingo' ? 'Segunda' : 'Domingo') 
        },
        { 
          label: "Notificações Push", 
          icon: Bell, 
          toggle: true, 
          toggleValue: notifications,
          action: () => setNotifications(!notifications)
        }
      ]
    }
  ];

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-y-auto pb-24">
      <header className="p-6">
        <h1 className="text-2xl font-bold tracking-tight">Ajustes</h1>
      </header>

      <div className="px-6 space-y-8">
        {sections.map((section, idx) => (
          <div key={idx} className="space-y-3">
            <h2 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] px-1">{section.title}</h2>
            <div className="bg-slate-900/50 border border-white/5 rounded-[24px] overflow-hidden">
              {section.items.map((item, i) => (
                <div 
                  key={i} 
                  onClick={item.action}
                  className={cn(
                    "flex items-center justify-between p-4 active:bg-slate-800 transition-colors cursor-pointer",
                    i !== section.items.length - 1 && "border-b border-white/5"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400">
                      <item.icon size={18} />
                    </div>
                    <span className="text-slate-200 font-medium text-sm">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.value && <span className="text-slate-500 text-xs font-mono">{item.value}</span>}
                    {item.toggle ? (
                      <div className={cn(
                        "w-10 h-5 rounded-full relative transition-colors duration-200",
                        item.toggleValue ? "bg-emerald-500/20" : "bg-slate-800"
                      )}>
                        <div className={cn(
                          "absolute top-0.5 w-4 h-4 rounded-full shadow-lg transition-all duration-200",
                          item.toggleValue ? "right-0.5 bg-emerald-500" : "left-0.5 bg-slate-600"
                        )} />
                      </div>
                    ) : (
                      <ChevronRight size={16} className="text-slate-700" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        <button 
          onClick={logout}
          className="w-full flex items-center justify-center gap-3 p-4 text-rose-500 font-bold bg-rose-500/5 border border-rose-500/10 rounded-2xl mt-4 mb-8 active:scale-[0.98] transition-all"
        >
          <LogOut size={18} />
          Encerrar Sessão
        </button>
      </div>
    </div>
  );
};

const ShiftForm = ({ 
  shift, 
  onClose, 
  onSave,
  onDelete,
  defaultDate,
  templates = []
}: { 
  shift?: Partial<Shift>, 
  onClose: () => void, 
  onSave: (data: Partial<Shift>) => void,
  onDelete?: (id: string) => void,
  defaultDate?: Date,
  templates?: ShiftTemplate[]
}) => {
  const getInitialDates = () => {
    const start = defaultDate ? new Date(defaultDate) : new Date();
    const now = new Date();
    
    // Set hours to current hour, minutes to 0
    start.setHours(now.getHours(), 0, 0, 0);
    
    const end = new Date(start);
    end.setHours(start.getHours() + 12); // Default 12h shift
    
    return { start, end };
  };

  const initialDates = getInitialDates();

  const [formData, setFormData] = useState<Partial<Shift>>(shift || {
    name: '',
    color: '#10b981',
    value: 0,
    status: 'pendente',
    startAt: Timestamp.fromDate(initialDates.start),
    endAt: Timestamp.fromDate(initialDates.end),
    notes: ''
  });

  const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#f97316'];
  const statuses: { id: ShiftStatus; label: string; color: string }[] = [
    { id: 'pendente', label: 'Pendente', color: 'text-rose-500' },
    { id: 'realizado', label: 'Realizado', color: 'text-amber-500' },
    { id: 'pago', label: 'Pago', color: 'text-emerald-500' }
  ];

  const handleSave = () => {
    if (!formData.name || !formData.startAt || !formData.endAt) return;
    onSave(formData);
  };

  const applyTemplate = (template: ShiftTemplate) => {
    const baseDate = formData.startAt?.toDate() || defaultDate || new Date();
    const [startH, startM] = template.startTime.split(':').map(Number);
    const [endH, endM] = template.endTime.split(':').map(Number);
    
    const startAt = new Date(baseDate);
    startAt.setHours(startH, startM, 0, 0);
    
    const endAt = new Date(baseDate);
    endAt.setHours(endH, endM, 0, 0);
    if (endAt < startAt) endAt.setDate(endAt.getDate() + 1);

    setFormData({
      ...formData,
      name: template.name,
      value: template.value,
      color: template.color,
      startAt: Timestamp.fromDate(startAt),
      endAt: Timestamp.fromDate(endAt)
    });
  };

  return (
    <motion.div 
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 bg-slate-950 z-[60] flex flex-col"
    >
      <header className="p-6 flex items-center justify-between border-b border-white/5 bg-slate-950/50 backdrop-blur-md sticky top-0 z-10">
        <button onClick={onClose} className="p-2 hover:bg-slate-900 rounded-xl transition-colors text-slate-400">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-bold text-slate-100">{shift?.id ? 'Editar Plantão' : 'Novo Plantão'}</h1>
        {shift?.id && onDelete ? (
          <button onClick={() => onDelete(shift.id!)} className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors">
            <Trash2 size={20} />
          </button>
        ) : (
          <div className="w-10" />
        )}
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-32">
        {/* Templates Quick Select */}
        {!shift?.id && templates.length > 0 && (
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">Usar Template</label>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {templates.map(t => (
                <button
                  key={t.id}
                  onClick={() => applyTemplate(t)}
                  className="flex-shrink-0 bg-slate-900/50 border border-white/5 rounded-2xl p-4 text-left min-w-[140px] active:scale-95 transition-all"
                >
                  <div className="w-2 h-2 rounded-full mb-2" style={{ backgroundColor: t.color }} />
                  <p className="text-xs font-bold text-slate-200 truncate">{t.name}</p>
                  <p className="text-[9px] text-slate-500 mt-1">{t.startTime} - {t.endTime}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Identificação */}
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">Identificação</label>
          <div className="relative">
            <input 
              type="text" 
              placeholder="Ex: Plantão Noturno"
              className="w-full text-2xl font-bold bg-slate-900/50 border border-white/5 rounded-2xl px-5 py-4 text-white placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
        </div>

        {/* Honorário */}
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">Honorário Estimado</label>
          <div className="relative flex items-center">
            <span className="absolute left-5 text-emerald-500 font-bold text-xl">R$</span>
            <input 
              type="text"
              inputMode="numeric"
              className="w-full text-3xl font-bold text-emerald-400 bg-slate-900/50 border border-white/5 rounded-2xl pl-14 pr-5 py-5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all"
              value={new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(formData.value || 0)}
              onChange={e => {
                const rawValue = e.target.value.replace(/\D/g, '');
                const numericValue = parseInt(rawValue, 10) / 100;
                setFormData({ ...formData, value: isNaN(numericValue) ? 0 : Math.max(0, numericValue) });
              }}
            />
          </div>
        </div>

        {/* Cor do Evento */}
        <div className="space-y-3">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">Cor do Marcador</label>
          <div className="flex flex-wrap gap-3 p-4 bg-slate-900/30 rounded-2xl border border-white/5">
            {colors.map(color => (
              <button
                key={color}
                onClick={() => setFormData({ ...formData, color })}
                className={cn(
                  "w-10 h-10 rounded-full transition-all duration-200 relative",
                  formData.color === color ? "scale-110 ring-2 ring-white/20 ring-offset-2 ring-offset-slate-950" : "opacity-60 hover:opacity-100"
                )}
                style={{ backgroundColor: color }}
              >
                {formData.color === color && <Check size={16} className="text-white absolute inset-0 m-auto" />}
              </button>
            ))}
          </div>
        </div>

        {/* Cronograma */}
        <div className="space-y-3">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">Cronograma</label>
          <div className="bg-slate-900/50 rounded-2xl border border-white/5 divide-y divide-white/5 overflow-hidden">
            <div className="p-4 space-y-2">
              <div className="flex items-center gap-3 text-slate-400 mb-1">
                <Clock size={16} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Início</span>
              </div>
              <input 
                type="datetime-local"
                className="w-full bg-transparent text-slate-100 font-mono text-sm focus:outline-none"
                value={format(formData.startAt?.toDate() || new Date(), "yyyy-MM-dd'T'HH:mm")}
                onChange={e => setFormData({ ...formData, startAt: Timestamp.fromDate(new Date(e.target.value)) })}
              />
            </div>
            <div className="p-4 space-y-2">
              <div className="flex items-center gap-3 text-slate-400 mb-1">
                <Clock size={16} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Término</span>
              </div>
              <input 
                type="datetime-local"
                className="w-full bg-transparent text-slate-100 font-mono text-sm focus:outline-none"
                value={format(formData.endAt?.toDate() || new Date(), "yyyy-MM-dd'T'HH:mm")}
                onChange={e => setFormData({ ...formData, endAt: Timestamp.fromDate(new Date(e.target.value)) })}
              />
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="space-y-3">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">Status do Plantão</label>
          <div className="grid grid-cols-3 gap-2">
            {statuses.map(s => (
              <button
                key={s.id}
                onClick={() => setFormData({ ...formData, status: s.id })}
                className={cn(
                  "py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                  formData.status === s.id 
                    ? "bg-slate-100 border-slate-100 text-slate-950 shadow-lg scale-[1.02]" 
                    : "bg-slate-900/50 border-white/5 text-slate-500"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Observações */}
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">Observações</label>
          <textarea 
            placeholder="Detalhes adicionais, equipe, intercorrências..."
            className="w-full h-32 bg-slate-900/30 border border-white/5 rounded-2xl p-5 text-slate-200 placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all resize-none"
            value={formData.notes}
            onChange={e => setFormData({ ...formData, notes: e.target.value })}
          />
        </div>
      </div>

      <div className="p-6 bg-slate-950/80 backdrop-blur-xl border-t border-white/5 fixed bottom-0 left-0 right-0 z-20">
        <button 
          onClick={handleSave}
          className="w-full bg-emerald-500 text-slate-950 font-black uppercase tracking-[0.2em] text-xs py-5 rounded-2xl shadow-[0_10px_40px_rgba(16,185,129,0.2)] active:scale-95 transition-all"
        >
          {shift?.id ? 'Salvar Alterações' : 'Confirmar Registro'}
        </button>
      </div>
    </motion.div>
  );
};

// --- Main App ---

export default function App() {
  const { user, loading, login } = useAuth();
  const [activeView, setActiveView] = useState<ViewType>('calendar');
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
  const [isShiftFormOpen, setIsShiftFormOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | undefined>(undefined);
  const [selectedDateForNewShift, setSelectedDateForNewShift] = useState<Date | undefined>(undefined);

  const [deleteConfirmation, setDeleteConfirmation] = useState<{ id: string, type: 'shift' | 'template' } | null>(null);

  useEffect(() => {
    if (!user) return;

    const qShifts = query(collection(db, 'shifts'), where('userId', '==', user.uid));
    const unsubShifts = onSnapshot(qShifts, (snapshot) => {
      setShifts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Shift)));
    }, (error) => {
      console.error("Firestore Error (shifts):", error);
    });

    const qTemplates = query(collection(db, 'templates'), where('userId', '==', user.uid));
    const unsubTemplates = onSnapshot(qTemplates, (snapshot) => {
      setTemplates(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ShiftTemplate)));
    }, (error) => {
      console.error("Firestore Error (templates):", error);
    });

    return () => {
      unsubShifts();
      unsubTemplates();
    };
  }, [user]);

  const handleSaveShift = async (data: Partial<Shift>) => {
    if (!user) return;
    try {
      if (editingShift?.id) {
        await updateDoc(doc(db, 'shifts', editingShift.id), { ...data });
      } else {
        await addDoc(collection(db, 'shifts'), { ...data, userId: user.uid });
      }
      setIsShiftFormOpen(false);
      setEditingShift(undefined);
      setSelectedDateForNewShift(undefined);
    } catch (error) {
      console.error("Error saving shift:", error);
    }
  };

  const handleDeleteShift = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'shifts', id));
      setIsShiftFormOpen(false);
      setEditingShift(undefined);
      setDeleteConfirmation(null);
    } catch (error) {
      console.error("Error deleting shift:", error);
    }
  };

  const handleTogglePaid = async (shift: Shift) => {
    try {
      let newStatus: ShiftStatus = 'pendente';
      if (shift.status === 'pendente') newStatus = 'realizado';
      else if (shift.status === 'realizado') newStatus = 'pago';
      else if (shift.status === 'pago') newStatus = 'pendente';
      
      await updateDoc(doc(db, 'shifts', shift.id), { status: newStatus });
    } catch (error) {
      console.error("Error toggling status:", error);
    }
  };

  const handleSaveTemplate = async (data: Omit<ShiftTemplate, 'id'>) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'templates'), { ...data, userId: user.uid });
    } catch (error) {
      console.error("Error saving template:", error);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'templates', id));
      setDeleteConfirmation(null);
    } catch (error) {
      console.error("Error deleting template:", error);
    }
  };

  const handleUseTemplate = (template: ShiftTemplate) => {
    const now = new Date();
    const [startH, startM] = template.startTime.split(':').map(Number);
    const [endH, endM] = template.endTime.split(':').map(Number);
    
    const startAt = new Date(now);
    startAt.setHours(startH, startM, 0, 0);
    
    const endAt = new Date(now);
    endAt.setHours(endH, endM, 0, 0);
    if (endAt < startAt) endAt.setDate(endAt.getDate() + 1);

    setEditingShift({
      name: template.name,
      value: template.value,
      color: template.color,
      status: 'pendente',
      startAt: Timestamp.fromDate(startAt),
      endAt: Timestamp.fromDate(endAt),
      notes: ''
    } as Shift);
    setIsShiftFormOpen(true);
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-950">
        <div className="w-10 h-10 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-950 p-8 text-center">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-20 h-20 bg-emerald-500 text-slate-950 rounded-[24px] flex items-center justify-center mb-10 shadow-[0_20px_50px_rgba(16,185,129,0.2)]"
        >
          <CalendarIcon size={36} strokeWidth={2.5} />
        </motion.div>
        <h1 className="text-4xl font-black text-white mb-3 tracking-tighter">Plantonista<span className="text-emerald-500">.</span></h1>
        <p className="text-slate-500 mb-16 max-w-[240px] leading-relaxed text-sm font-medium">Gestão inteligente de escalas e finanças para profissionais de elite.</p>
        <button 
          onClick={login}
          className="w-full bg-white text-slate-950 font-black uppercase tracking-[0.2em] text-xs py-5 rounded-2xl shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all"
        >
          <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
          Acessar com Google
        </button>
        <p className="mt-8 text-[10px] text-slate-700 uppercase tracking-widest font-bold">Versão Profissional 2.0</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-slate-950 flex flex-col overflow-hidden selection:bg-emerald-500/30">
      <main className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          {activeView === 'calendar' && (
            <motion.div key="calendar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
              <CalendarPage 
                shifts={shifts} 
                onAddShift={(date) => { 
                  setEditingShift(undefined); 
                  setSelectedDateForNewShift(date);
                  setIsShiftFormOpen(true); 
                }}
                onEditShift={(s) => { setEditingShift(s); setIsShiftFormOpen(true); }}
                onToggleStatus={handleTogglePaid}
              />
            </motion.div>
          )}
          {activeView === 'financial' && (
            <motion.div key="financial" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
              <FinancialPage shifts={shifts} onTogglePaid={handleTogglePaid} />
            </motion.div>
          )}
          {activeView === 'templates' && (
            <motion.div key="templates" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
              <TemplatesPage 
                templates={templates} 
                onAddTemplate={handleSaveTemplate}
                onDeleteTemplate={(id) => setDeleteConfirmation({ id, type: 'template' })}
                onUseTemplate={handleUseTemplate}
              />
            </motion.div>
          )}
          {activeView === 'stats' && (
            <motion.div key="stats" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
              <StatsPage shifts={shifts} />
            </motion.div>
          )}
          {activeView === 'settings' && (
            <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
              <SettingsPage shifts={shifts} />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isShiftFormOpen && (
            <ShiftForm 
              shift={editingShift}
              defaultDate={selectedDateForNewShift}
              templates={templates}
              onClose={() => {
                setIsShiftFormOpen(false);
                setEditingShift(undefined);
                setSelectedDateForNewShift(undefined);
              }}
              onSave={handleSaveShift}
              onDelete={(id) => setDeleteConfirmation({ id, type: 'shift' })}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {deleteConfirmation && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setDeleteConfirmation(null)}
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative bg-slate-900 border border-white/10 rounded-[32px] p-8 w-full max-w-sm shadow-2xl"
              >
                <div className="w-16 h-16 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 mb-6">
                  <Trash2 size={32} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Confirmar Exclusão</h3>
                <p className="text-slate-400 text-sm mb-8 leading-relaxed">
                  {deleteConfirmation.type === 'shift' 
                    ? 'Tem certeza que deseja excluir este plantão? Esta ação não pode ser desfeita.' 
                    : 'Tem certeza que deseja excluir este template?'}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setDeleteConfirmation(null)}
                    className="py-4 rounded-2xl bg-slate-800 text-slate-300 font-bold text-xs uppercase tracking-widest active:scale-95 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={() => {
                      if (deleteConfirmation.type === 'shift') {
                        handleDeleteShift(deleteConfirmation.id);
                      } else {
                        handleDeleteTemplate(deleteConfirmation.id);
                      }
                    }}
                    className="py-4 rounded-2xl bg-rose-500 text-white font-bold text-xs uppercase tracking-widest shadow-lg shadow-rose-500/20 active:scale-95 transition-all"
                  >
                    Excluir
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>

      <BottomNav activeView={activeView} onViewChange={setActiveView} />
    </div>
  );
}
