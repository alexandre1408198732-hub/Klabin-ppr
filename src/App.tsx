import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  LayoutDashboard, 
  History,
  BarChart3,
  Target,
  Cpu,
  LogOut, 
  Plus, 
  Search, 
  Menu,
  X,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  Play,
  Square,
  Wrench,
  Settings2,
  Download,
  ChevronRight,
  TrendingUp,
  Clock,
  Calendar,
  Edit2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area
} from 'recharts';
import { auth, db, googleProvider, signInWithPopup, onAuthStateChanged, collection, query, where, onSnapshot, doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc, User, OperationType, handleFirestoreError, orderBy, limit } from './firebase';
import { Machine, ProductionEvent, Goal, AppUser } from './types';

// --- Components ---

const ErrorBoundary = ({ children }: { children: React.ReactNode }) => {
  const [hasError, setHasError] = useState(false);
  const [errorInfo, setErrorInfo] = useState<string | null>(null);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (event.error?.message?.startsWith('{')) {
        setHasError(true);
        setErrorInfo(event.error.message);
      }
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    const info = errorInfo ? JSON.parse(errorInfo) : null;
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f1115] p-4">
        <div className="bg-[#1a1d23] p-8 rounded-3xl shadow-2xl max-w-md w-full border border-rose-500/20">
          <div className="w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center mb-6">
            <AlertTriangle className="text-rose-500" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-100 mb-4 font-display">Erro de Sistema</h2>
          <p className="text-slate-400 mb-6 text-sm leading-relaxed">Ocorreu um erro de permissão ou conexão no banco de dados. Verifique seu acesso ou tente novamente.</p>
          {info && (
            <div className="bg-slate-900/50 p-4 rounded-xl text-[10px] font-mono overflow-auto max-h-40 border border-slate-800 text-slate-500 mb-6">
              <pre>{JSON.stringify(info, null, 2)}</pre>
            </div>
          )}
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-900/20"
          >
            Recarregar Aplicativo
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

const SidebarItem = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
      active 
        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.1)]' 
        : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-100'
    }`}
  >
    <Icon size={20} className={active ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-100'} />
    <span className="font-medium">{label}</span>
    {active && <motion.div layoutId="active-pill" className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400" />}
  </button>
);

const Card = ({ children, title, subtitle, action, className = "" }: { children: React.ReactNode, title?: string, subtitle?: string, action?: React.ReactNode, className?: string, key?: string | number }) => (
  <div className={`bg-[#1a1d23] rounded-2xl border border-slate-800 shadow-xl overflow-hidden ${className}`}>
    {(title || action) && (
      <div className="px-6 py-5 border-b border-slate-800/50 flex items-center justify-between bg-slate-800/20">
        <div>
          {title && <h3 className="text-lg font-semibold text-slate-100 font-display">{title}</h3>}
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
    )}
    <div className="p-6">{children}</div>
  </div>
);

const StatCard = ({ label, value, trend, icon: Icon, color, trendColor }: { label: string, value: string, trend?: string, icon: any, color: string, trendColor?: string }) => (
  <div className="bg-[#1a1d23] rounded-2xl border border-slate-800 p-6 shadow-xl relative overflow-hidden group">
    <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-5 blur-2xl ${color}`} />
    <div className="flex items-start justify-between relative z-10">
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
        <h3 className="text-2xl font-bold text-slate-100 font-display">{value}</h3>
        {trend && (
          <div className={`flex items-center gap-1 mt-2 text-xs font-bold ${trendColor || (trend.startsWith('+') ? 'text-emerald-400' : 'text-rose-400')}`}>
            {trend.startsWith('+') ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
            {trend}
          </div>
        )}
      </div>
      <div className={`p-3 rounded-xl ${color} bg-opacity-10 border border-current border-opacity-20`}>
        <Icon size={24} className={color.replace('bg-', 'text-')} />
      </div>
    </div>
  </div>
);

const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-[#1a1d23] border border-slate-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
        >
          <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-800/20">
            <h3 className="text-xl font-bold text-slate-100 font-display">{title}</h3>
            <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 transition-colors">
              <X size={20} />
            </button>
          </div>
          <div className="p-6 max-h-[80vh] overflow-y-auto">
            {children}
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message }: { isOpen: boolean, onClose: () => void, onConfirm: () => void, title: string, message: string }) => (
  <Modal isOpen={isOpen} onClose={onClose} title={title}>
    <div className="space-y-6">
      <p className="text-slate-400 text-sm leading-relaxed">{message}</p>
      <div className="flex gap-3">
        <button onClick={onClose} className="flex-1 bg-slate-800 text-slate-300 py-3 rounded-xl font-bold hover:bg-slate-700 transition border border-slate-700">Cancelar</button>
        <button onClick={() => { onConfirm(); onClose(); }} className="flex-1 bg-rose-600 text-white py-3 rounded-xl font-bold hover:bg-rose-700 transition shadow-lg shadow-rose-900/20">Confirmar</button>
      </div>
    </div>
  </Modal>
);

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [modalOpen, setModalOpen] = useState<{ type: string, machineId?: string } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ title: string, message: string, onConfirm: () => void } | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const userDoc = await getDoc(doc(db, 'users', u.uid));
          if (userDoc.exists()) {
            setAppUser(userDoc.data() as AppUser);
          } else {
            const newUser: AppUser = {
              uid: u.uid,
              email: u.email || '',
              displayName: u.displayName || 'Usuário',
              role: 'admin',
            };
            await setDoc(doc(db, 'users', u.uid), newUser);
            setAppUser(newUser);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${u.uid}`);
        }
        
        // Seed initial machines if they don't exist
        const initialMachines = [
          { name: 'TL1', goal: 850, prod: 820, status: 'Produzindo' },
          { name: 'TL2', goal: 900, prod: 915, status: 'Produzindo' },
          { name: 'TCY', goal: 780, prod: 650, status: 'Ajuste' }
        ];

        for (const m of initialMachines) {
          try {
            const mDoc = await getDoc(doc(db, 'machines', m.name));
            if (!mDoc.exists()) {
              await setDoc(doc(db, 'machines', m.name), {
                name: m.name,
                goalProduction: m.goal,
                currentProduction: m.prod,
                status: m.status,
                lastStatusChange: new Date().toISOString()
              });
            }
          } catch (error) {
            handleFirestoreError(error, OperationType.GET, `machines/${m.name}`);
          }
        }

        // Seed initial goals
        const initialGoals = [
          { type: 'day', target: 18000, current: 12450 },
          { type: 'month', target: 450000, current: 287300 },
          { type: 'year', target: 5200000, current: 1890000 }
        ];

        for (const g of initialGoals) {
          try {
            const gDoc = await getDoc(doc(db, 'goals', g.type));
            if (!gDoc.exists()) {
              await setDoc(doc(db, 'goals', g.type), g);
            }
          } catch (error) {
            handleFirestoreError(error, OperationType.GET, `goals/${g.type}`);
          }
        }
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (user) {
      const unsubscribeMachines = onSnapshot(collection(db, 'machines'), (snapshot) => {
        setMachines(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Machine)));
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'machines');
      });
      const unsubscribeGoals = onSnapshot(collection(db, 'goals'), (snapshot) => {
        setGoals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Goal)));
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'goals');
      });
      return () => {
        unsubscribeMachines();
        unsubscribeGoals();
      };
    }
  }, [user]);

  const handleLogout = () => auth.signOut();

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f1115]">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0f1115] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#1a1d23] p-10 rounded-3xl shadow-2xl max-w-md w-full text-center border border-slate-800"
        >
          <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-blue-900/20">
            <Cpu size={40} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-100 mb-2 font-display">Klabin PPR</h1>
          <p className="text-slate-400 mb-10">Gestão de Produção e Acompanhamento de Metas em Tempo Real.</p>
          <button 
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 bg-blue-600 text-white py-4 rounded-2xl font-semibold hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl active:scale-95"
          >
            <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
            Entrar com Google
          </button>
          <p className="mt-8 text-xs text-slate-500 uppercase tracking-widest font-medium">Acesso Restrito à Comissão de PPR</p>
        </motion.div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#0f1115] flex">
        {/* Sidebar */}
        <motion.aside 
          initial={false}
          animate={{ width: isSidebarOpen ? 280 : 0, opacity: isSidebarOpen ? 1 : 0 }}
          className="bg-[#161920] border-r border-slate-800/50 overflow-hidden flex flex-col sticky top-0 h-screen"
        >
          <div className="p-6 flex items-center gap-3 border-b border-slate-800/50">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-blue-900/20">
              <Cpu size={20} className="text-white" />
            </div>
            <span className="text-xl font-bold text-slate-100 truncate font-display">Klabin PPR</span>
          </div>

          <div className="flex-1 p-4 space-y-2 overflow-y-auto">
            <SidebarItem icon={LayoutDashboard} label="Dashboard" active={activeTab === 'Dashboard'} onClick={() => setActiveTab('Dashboard')} />
            <SidebarItem icon={History} label="Histórico" active={activeTab === 'Histórico'} onClick={() => setActiveTab('Histórico')} />
            <SidebarItem icon={BarChart3} label="Relatórios" active={activeTab === 'Relatórios'} onClick={() => setActiveTab('Relatórios')} />
            <SidebarItem icon={Target} label="Metas" active={activeTab === 'Metas'} onClick={() => setActiveTab('Metas')} />
            <SidebarItem icon={Settings2} label="Máquinas" active={activeTab === 'Máquinas'} onClick={() => setActiveTab('Máquinas')} />
          </div>

          <div className="p-4 border-t border-slate-800/50">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-800/50 mb-4 border border-slate-700/50">
              <img src={user.photoURL || ''} className="w-10 h-10 rounded-full border-2 border-slate-700 shadow-sm" alt="Profile" />
              <div className="flex-1 truncate">
                <p className="text-sm font-bold text-slate-100 truncate">{user.displayName}</p>
                <p className="text-xs text-slate-500 truncate">{user.email}</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
            >
              <LogOut size={20} />
              <span className="font-medium">Sair</span>
            </button>
          </div>
        </motion.aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto bg-[#0f1115]">
          {/* Header */}
          <header className="bg-[#0f1115]/80 backdrop-blur-md border-b border-slate-800/50 sticky top-0 z-10 px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 hover:bg-slate-800 rounded-lg text-slate-400"
              >
                {!isSidebarOpen ? <Menu size={20} /> : <X size={20} />}
              </button>
              <h2 className="text-xl font-bold text-slate-100 font-display">{activeTab}</h2>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                  type="text" 
                  placeholder="Pesquisar..." 
                  className="bg-slate-800/50 border border-slate-700/50 rounded-xl pl-10 pr-4 py-2 text-sm w-64 text-slate-200 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                />
              </div>
              <div className="flex items-center gap-2 bg-blue-500/10 px-3 py-1.5 rounded-full border border-blue-500/20">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Monitoramento Ativo</span>
              </div>
            </div>
          </header>

          {/* Content Area */}
          <div className="p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === 'Dashboard' && (
                  <DashboardView 
                    machines={machines} 
                    goals={goals} 
                    onAction={(type, machineId) => setModalOpen({ type, machineId })} 
                  />
                )}
                {activeTab === 'Histórico' && <HistoryView />}
                {activeTab === 'Relatórios' && <ReportsView />}
                {activeTab === 'Metas' && <GoalsConfigView goals={goals} />}
                {activeTab === 'Máquinas' && <MachinesView machines={machines} onAction={(type, machineId) => setModalOpen({ type, machineId })} setConfirmModal={setConfirmModal} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        {/* Modals */}
        <EventModal 
          isOpen={!!modalOpen && modalOpen.type === 'event'} 
          onClose={() => setModalOpen(null)} 
          machineId={modalOpen?.machineId}
          machineName={machines.find(m => m.id === modalOpen?.machineId)?.name}
        />
        
        <GoalEditModal
          isOpen={!!modalOpen && modalOpen.type === 'edit_goal'}
          onClose={() => setModalOpen(null)}
          machine={machines.find(m => m.id === modalOpen?.machineId)}
        />

        <MachineModal
          isOpen={!!modalOpen && (modalOpen.type === 'add_machine' || modalOpen.type === 'edit_machine')}
          onClose={() => setModalOpen(null)}
          machine={machines.find(m => m.id === modalOpen?.machineId)}
        />

        <ConfirmModal
          isOpen={!!confirmModal}
          onClose={() => setConfirmModal(null)}
          title={confirmModal?.title || ''}
          message={confirmModal?.message || ''}
          onConfirm={confirmModal?.onConfirm || (() => {})}
        />
      </div>
    </ErrorBoundary>
  );
}

// --- Sub-Views ---

function DashboardView({ machines, goals, onAction }: { machines: Machine[], goals: Goal[], onAction: (type: string, machineId?: string) => void }) {
  const [events, setEvents] = useState<ProductionEvent[]>([]);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const formatDuration = (isoString: string) => {
    const start = new Date(isoString);
    const diffMs = now.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;

    if (hours > 0) {
      return `${hours}h ${mins}min`;
    }
    return `${mins}min`;
  };

  useEffect(() => {
    const q = query(collection(db, 'events'), orderBy('startTime', 'desc'), limit(10));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProductionEvent)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'events');
    });
    return unsubscribe;
  }, []);

  const dayGoal = goals.find(g => g.type === 'day');
  const monthGoal = goals.find(g => g.type === 'month');
  const yearGoal = goals.find(g => g.type === 'year');

  const getGoalStatus = (current: number, target: number) => {
    const percent = (current / target) * 100;
    if (percent >= 100) return { label: 'Meta Atingida', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' };
    if (percent >= 90) return { label: 'Dentro da Meta', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' };
    return { label: 'Abaixo da Meta', color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' };
  };

  // Chart Data
  const prodVsGoalData = machines.map(m => ({
    name: m.name,
    real: m.currentProduction,
    meta: m.goalProduction
  }));

  const evolutionData = [
    { time: '06:00', prod: 1200 },
    { time: '08:00', prod: 1800 },
    { time: '10:00', prod: 1500 },
    { time: '12:00', prod: 2100 },
    { time: '14:00', prod: 1900 },
    { time: '16:00', prod: 2400 },
    { time: '18:00', prod: 2200 },
  ];

  const timeDistData = [
    { name: 'Produção', value: 70, color: '#3b82f6' },
    { name: 'Parada', value: 10, color: '#f43f5e' },
    { name: 'Ajuste', value: 15, color: '#f59e0b' },
    { name: 'Setup', value: 5, color: '#8b5cf6' },
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* Global Goals Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { title: 'Meta do Dia', goal: dayGoal },
          { title: 'Meta do Mês', goal: monthGoal },
          { title: 'Meta do Ano', goal: yearGoal }
        ].map((item, idx) => {
          const status = item.goal ? getGoalStatus(item.goal.current, item.goal.target) : null;
          return (
            <Card key={idx} title={item.title} action={
              status && (
                <div className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${status.bg} ${status.color} ${status.border}`}>
                  {status.label}
                </div>
              )
            }>
              <div className="space-y-4">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Produção Acumulada</p>
                    <h4 className="text-2xl font-bold text-slate-100 font-display">
                      {item.goal?.current.toLocaleString()} <span className="text-xs font-normal text-slate-500">m²</span>
                    </h4>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Alvo</p>
                    <p className="text-sm font-bold text-slate-300">{item.goal?.target.toLocaleString()} m²</p>
                  </div>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((item.goal?.current || 0) / (item.goal?.target || 1) * 100, 100)}%` }}
                    className={`h-full rounded-full ${status?.color.replace('text-', 'bg-')}`}
                  />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Machine Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {machines.map(machine => {
          const achievement = (machine.currentProduction / machine.goalProduction) * 100;
          return (
            <Card 
              key={machine.id} 
              title={machine.name}
              action={
                <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  machine.status === 'Produzindo' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                  machine.status === 'Parada' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                  'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}>
                  {machine.status}
                </div>
              }
            >
              <div className="space-y-6">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">Produção Real</p>
                    <h4 className="text-4xl font-bold text-slate-100 font-display">{machine.currentProduction} <span className="text-sm font-normal text-slate-500">m²/h</span></h4>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">Meta</p>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-slate-300">{machine.goalProduction}</span>
                      <button onClick={() => onAction('edit_goal', machine.id)} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-blue-400 transition-colors">
                        <Edit2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                    <span className="text-slate-500">Atingimento</span>
                    <span className={achievement >= 95 ? 'text-emerald-400' : achievement >= 90 ? 'text-amber-400' : 'text-rose-400'}>
                      {achievement.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(achievement, 100)}%` }}
                      className={`h-full rounded-full ${
                        achievement >= 95 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 
                        achievement >= 90 ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]' : 
                        'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.3)]'
                      }`}
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-800/30 rounded-xl border border-slate-800/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-slate-500" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{machine.status} há</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-200">{formatDuration(machine.lastStatusChange)}</p>
                    <p className="text-[9px] text-slate-500">Desde {new Date(machine.lastStatusChange).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button onClick={() => onAction('event', machine.id)} className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-900/20">
                    <Plus size={14} /> Registrar Evento
                  </button>
                  <button className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-xl text-xs font-bold transition-all border border-slate-700">
                    Ver Detalhes
                  </button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card title="Produção vs Meta" subtitle="Comparativo por máquina (m²/h)">
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={prodVsGoalData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#f1f5f9' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey="real" name="Real" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="meta" name="Meta" fill="#1e293b" stroke="#3b82f6" strokeDasharray="4 4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Evolução da Produção" subtitle="Total m² acumulado hoje">
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={evolutionData}>
                <defs>
                  <linearGradient id="colorProd" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#f1f5f9' }} />
                <Area type="monotone" dataKey="prod" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorProd)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card title="Distribuição de Tempo" subtitle="Média global das máquinas">
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={timeDistData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {timeDistData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#f1f5f9' }} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Meta Global PPR" className="lg:col-span-2">
          <div className="space-y-8">
            <div className="grid grid-cols-2 gap-6">
              <div className="p-6 bg-slate-800/30 rounded-2xl border border-slate-800">
                <p className="text-xs font-bold text-slate-500 uppercase mb-2">Meta Diária</p>
                <div className="flex items-baseline gap-2">
                  <h4 className="text-3xl font-bold text-slate-100 font-display">{dayGoal?.current.toLocaleString()}</h4>
                  <span className="text-sm text-slate-500">/ {dayGoal?.target.toLocaleString()} m²</span>
                </div>
                <div className="mt-4 h-2 bg-slate-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(dayGoal?.current || 0) / (dayGoal?.target || 1) * 100}%` }}
                    className="h-full bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                  />
                </div>
              </div>
              <div className="p-6 bg-slate-800/30 rounded-2xl border border-slate-800">
                <p className="text-xs font-bold text-slate-500 uppercase mb-2">Meta Mensal</p>
                <div className="flex items-baseline gap-2">
                  <h4 className="text-3xl font-bold text-slate-100 font-display">{monthGoal?.current.toLocaleString()}</h4>
                  <span className="text-sm text-slate-500">/ {monthGoal?.target.toLocaleString()} m²</span>
                </div>
                <div className="mt-4 h-2 bg-slate-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(monthGoal?.current || 0) / (monthGoal?.target || 1) * 100}%` }}
                    className="h-full bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-blue-500/5 border border-blue-500/20 rounded-2xl">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/20 rounded-xl text-blue-400">
                  <TrendingUp size={24} />
                </div>
                <div>
                  <h5 className="font-bold text-slate-100">Projeção de PPR</h5>
                  <p className="text-xs text-slate-400">Baseado no atingimento atual de {((monthGoal?.current || 0) / (monthGoal?.target || 1) * 100).toFixed(1)}%</p>
                </div>
              </div>
              <div className="text-right">
                <span className={`text-2xl font-bold font-display ${((monthGoal?.current || 0) / (monthGoal?.target || 1) * 100) >= 95 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {((monthGoal?.current || 0) / (monthGoal?.target || 1) * 100) >= 95 ? 'Meta Atingida' : 'Abaixo da Meta'}
                </span>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status PPR Mensal (95% Requerido)</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Events */}
      <Card title="Log de Eventos Recentes" subtitle="Últimas ocorrências registradas">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="pb-4 font-bold text-slate-500 uppercase text-[10px] tracking-widest">Máquina</th>
                <th className="pb-4 font-bold text-slate-500 uppercase text-[10px] tracking-widest">Tipo</th>
                <th className="pb-4 font-bold text-slate-500 uppercase text-[10px] tracking-widest">Início</th>
                <th className="pb-4 font-bold text-slate-500 uppercase text-[10px] tracking-widest">Fim</th>
                <th className="pb-4 font-bold text-slate-500 uppercase text-[10px] tracking-widest">Produção</th>
                <th className="pb-4 font-bold text-slate-500 uppercase text-[10px] tracking-widest">Obs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {events.map(event => (
                <tr key={event.id} className="hover:bg-slate-800/30 transition-colors group">
                  <td className="py-4 font-bold text-slate-200">{event.machineName}</td>
                  <td className="py-4">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                      event.type === 'Produção' ? 'bg-emerald-500/10 text-emerald-400' :
                      event.type === 'Parada' ? 'bg-rose-500/10 text-rose-400' :
                      'bg-amber-500/10 text-amber-400'
                    }`}>
                      {event.type}
                    </span>
                  </td>
                  <td className="py-4 text-xs text-slate-400">{new Date(event.startTime).toLocaleTimeString()}</td>
                  <td className="py-4 text-xs text-slate-400">{event.endTime ? new Date(event.endTime).toLocaleTimeString() : '-'}</td>
                  <td className="py-4 text-sm font-bold text-slate-300">{event.m2Produced ? `${event.m2Produced} m²` : '-'}</td>
                  <td className="py-4 text-xs text-slate-500 truncate max-w-[150px]">{event.observation || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function HistoryView() {
  const [events, setEvents] = useState<ProductionEvent[]>([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    let q = query(collection(db, 'events'), orderBy('startTime', 'desc'));
    if (filter !== 'all') {
      q = query(collection(db, 'events'), where('type', '==', filter), orderBy('startTime', 'desc'));
    }
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProductionEvent)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'events');
    });
    return unsubscribe;
  }, [filter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold text-slate-100 font-display">Histórico de Produção</h3>
        <div className="flex gap-2">
          {['all', 'Produção', 'Parada', 'Ajuste', 'Setup'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                filter === f ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {f === 'all' ? 'Todos' : f}
            </button>
          ))}
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="pb-4 font-bold text-slate-500 uppercase text-[10px] tracking-widest">Máquina</th>
                <th className="pb-4 font-bold text-slate-500 uppercase text-[10px] tracking-widest">Tipo</th>
                <th className="pb-4 font-bold text-slate-500 uppercase text-[10px] tracking-widest">Início</th>
                <th className="pb-4 font-bold text-slate-500 uppercase text-[10px] tracking-widest">Fim</th>
                <th className="pb-4 font-bold text-slate-500 uppercase text-[10px] tracking-widest">Duração</th>
                <th className="pb-4 font-bold text-slate-500 uppercase text-[10px] tracking-widest">Produção</th>
                <th className="pb-4 font-bold text-slate-500 uppercase text-[10px] tracking-widest">Obs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {events.map(event => {
                const start = new Date(event.startTime);
                const end = event.endTime ? new Date(event.endTime) : null;
                const duration = end ? Math.round((end.getTime() - start.getTime()) / 60000) : null;

                return (
                  <tr key={event.id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="py-4 font-bold text-slate-200">{event.machineName}</td>
                    <td className="py-4">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        event.type === 'Produção' ? 'bg-emerald-500/10 text-emerald-400' :
                        event.type === 'Parada' ? 'bg-rose-500/10 text-rose-400' :
                        'bg-amber-500/10 text-amber-400'
                      }`}>
                        {event.type}
                      </span>
                    </td>
                    <td className="py-4 text-xs text-slate-400">{start.toLocaleString()}</td>
                    <td className="py-4 text-xs text-slate-400">{end ? end.toLocaleString() : '-'}</td>
                    <td className="py-4 text-xs text-slate-300 font-medium">{duration ? `${duration} min` : 'Em andamento'}</td>
                    <td className="py-4 text-sm font-bold text-slate-300">{event.m2Produced ? `${event.m2Produced} m²` : '-'}</td>
                    <td className="py-4 text-xs text-slate-500 truncate max-w-[200px]">{event.observation || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function ReportsView() {
  const [events, setEvents] = useState<ProductionEvent[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);

  useEffect(() => {
    const unsubscribeEvents = onSnapshot(collection(db, 'events'), (snapshot) => {
      setEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProductionEvent)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'events');
    });
    const unsubscribeMachines = onSnapshot(collection(db, 'machines'), (snapshot) => {
      setMachines(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Machine)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'machines');
    });
    return () => {
      unsubscribeEvents();
      unsubscribeMachines();
    };
  }, []);

  const totalProduction = events.reduce((acc, curr) => acc + (curr.m2Produced || 0), 0);
  const totalEvents = events.length;
  const downtimeEvents = events.filter(e => e.type === 'Parada').length;

  const machineStats = machines.map(m => {
    const machineEvents = events.filter(e => e.machineId === m.id);
    const prod = machineEvents.reduce((acc, curr) => acc + (curr.m2Produced || 0), 0);
    return { name: m.name, value: prod };
  });

  const typeStats = [
    { name: 'Produção', value: events.filter(e => e.type === 'Produção').length },
    { name: 'Parada', value: events.filter(e => e.type === 'Parada').length },
    { name: 'Ajuste', value: events.filter(e => e.type === 'Ajuste').length },
    { name: 'Setup', value: events.filter(e => e.type === 'Setup').length },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard label="Produção Total" value={`${totalProduction.toLocaleString()} m²`} icon={TrendingUp} color="bg-blue-500" />
        <StatCard label="Total de Eventos" value={totalEvents.toString()} icon={History} color="bg-emerald-500" />
        <StatCard label="Paradas Registradas" value={downtimeEvents.toString()} icon={AlertTriangle} color="bg-rose-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card title="Produção por Máquina" subtitle="Distribuição do volume total">
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={machineStats}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {machineStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b'][index % 3]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#f1f5f9' }} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Frequência de Eventos" subtitle="Ocorrências por tipo">
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={typeStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#f1f5f9' }} />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card title="Relatório Detalhado" action={<button className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs font-bold transition border border-slate-700"><Download size={14} /> Exportar PDF</button>}>
        <div className="py-10 text-center text-slate-500">
          <p>Selecione um período para gerar o relatório detalhado de PPR.</p>
        </div>
      </Card>
    </div>
  );
}

function GoalsConfigView({ goals }: { goals: Goal[] }) {
  const handleUpdateGoal = async (id: string, target: number) => {
    try {
      await updateDoc(doc(db, 'goals', id), { target });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `goals/${id}`);
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-bold text-slate-100 font-display">Configuração de Metas</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {goals.map(goal => (
          <Card key={goal.id} title={goal.type === 'day' ? 'Meta Diária' : goal.type === 'month' ? 'Meta Mensal' : 'Meta Anual'}>
            <form onSubmit={(e) => {
              e.preventDefault();
              const val = Number((e.currentTarget.elements.namedItem('target') as HTMLInputElement).value);
              handleUpdateGoal(goal.id, val);
            }} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Valor Alvo (m²)</label>
                <input 
                  name="target"
                  type="number" 
                  defaultValue={goal.target}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition">Atualizar Meta</button>
            </form>
          </Card>
        ))}
      </div>
    </div>
  );
}

function MachinesView({ machines, onAction, setConfirmModal }: { machines: Machine[], onAction: (type: string, machineId?: string) => void, setConfirmModal: (modal: any) => void }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold text-slate-100 font-display">Gestão de Máquinas</h3>
        <button 
          onClick={() => onAction('add_machine')}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-900/20"
        >
          <Plus size={20} /> Adicionar Máquina
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {machines.map(machine => (
          <Card key={machine.id} title={machine.name}>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-xl border border-slate-700">
                <span className="text-xs font-bold text-slate-500 uppercase">Status Atual</span>
                <span className="text-sm font-bold text-slate-100">{machine.status}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-xl border border-slate-700">
                <span className="text-xs font-bold text-slate-500 uppercase">Meta (m²/h)</span>
                <span className="text-sm font-bold text-slate-100">{machine.goalProduction}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-xl border border-slate-700">
                <span className="text-xs font-bold text-slate-500 uppercase">Última Alteração</span>
                <span className="text-xs text-slate-400">{new Date(machine.lastStatusChange).toLocaleString()}</span>
              </div>
              <div className="flex gap-2 pt-2">
                <button 
                  onClick={() => onAction('edit_machine', machine.id)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-xl text-xs font-bold transition border border-slate-700"
                >
                  Configurar
                </button>
                <button 
                  onClick={() => {
                    setConfirmModal({
                      title: 'Excluir Máquina',
                      message: `Deseja realmente excluir a máquina ${machine.name}? Esta ação não pode ser desfeita.`,
                      onConfirm: async () => {
                        try {
                          await deleteDoc(doc(db, 'machines', machine.id));
                        } catch (error) {
                          handleFirestoreError(error, OperationType.DELETE, `machines/${machine.id}`);
                        }
                      }
                    });
                  }}
                  className="p-2.5 bg-rose-500/10 text-rose-500 rounded-xl hover:bg-rose-500/20 transition border border-rose-500/20"
                >
                  <AlertTriangle size={18} />
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// --- Modals ---

function EventModal({ isOpen, onClose, machineId, machineName }: { isOpen: boolean, onClose: () => void, machineId?: string, machineName?: string }) {
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const type = formData.get('type') as any;
    const m2Produced = Number(formData.get('m2Produced'));
    const observation = formData.get('observation') as string;

    if (!machineId) return;

    try {
      // End previous event for this machine
      const lastEventQuery = query(
        collection(db, 'events'), 
        where('machineId', '==', machineId), 
        where('endTime', '==', null),
        orderBy('startTime', 'desc'),
        limit(1)
      );
      
      // Note: This query might need an index. For now, let's just add the new event.
      // In a real app, we'd find the event with no endTime and update it.
      
      await addDoc(collection(db, 'events'), {
        machineId,
        machineName,
        type,
        startTime: new Date().toISOString(),
        m2Produced: type === 'Produção' ? m2Produced : 0,
        observation
      });

      // Update machine status and current production
      await updateDoc(doc(db, 'machines', machineId), {
        status: type,
        currentProduction: type === 'Produção' ? m2Produced : 0,
        lastStatusChange: new Date().toISOString()
      });

      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'events');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Registrar Evento - ${machineName}`}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Tipo de Ocorrência</label>
          <select name="type" required className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none appearance-none">
            <option value="Produção">Produção (Máquina Rodando)</option>
            <option value="Parada">Parada de Máquina</option>
            <option value="Ajuste">Ajuste de Máquina</option>
            <option value="Setup">Setup (Troca de Ordem)</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Produção Estimada (m²)</label>
          <input name="m2Produced" type="number" placeholder="Opcional para paradas/ajustes" className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Observações / Motivo</label>
          <textarea name="observation" rows={3} className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none resize-none" placeholder="Descreva o motivo da parada ou detalhes do ajuste..." />
        </div>

        <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-900/20">Confirmar Registro</button>
      </form>
    </Modal>
  );
}

function MachineModal({ isOpen, onClose, machine }: { isOpen: boolean, onClose: () => void, machine?: Machine }) {
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const goalProduction = Number(formData.get('goalProduction'));

    try {
      if (machine) {
        await updateDoc(doc(db, 'machines', machine.id), {
          name,
          goalProduction
        });
      } else {
        await setDoc(doc(db, 'machines', name), {
          name,
          goalProduction,
          currentProduction: 0,
          status: 'Parada',
          lastStatusChange: new Date().toISOString()
        });
      }
      onClose();
    } catch (error) {
      handleFirestoreError(error, machine ? OperationType.UPDATE : OperationType.CREATE, machine ? `machines/${machine.id}` : 'machines');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={machine ? `Editar Máquina - ${machine.name}` : 'Adicionar Nova Máquina'}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Nome da Máquina</label>
          <input name="name" type="text" defaultValue={machine?.name} required className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ex: TL1, TL2, TCY..." />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Meta de Produção (m²/h)</label>
          <input name="goalProduction" type="number" defaultValue={machine?.goalProduction} required className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
        <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-900/20">
          {machine ? 'Salvar Alterações' : 'Cadastrar Máquina'}
        </button>
      </form>
    </Modal>
  );
}
function GoalEditModal({ isOpen, onClose, machine }: { isOpen: boolean, onClose: () => void, machine?: Machine }) {
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const goal = Number(formData.get('goal'));

    if (!machine) return;

    try {
      await updateDoc(doc(db, 'machines', machine.id), {
        goalProduction: goal
      });
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `machines/${machine.id}`);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Editar Meta - ${machine?.name}`}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Nova Meta de Produção (m²/h)</label>
          <input name="goal" type="number" defaultValue={machine?.goalProduction} required className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
        <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-900/20">Salvar Alteração</button>
      </form>
    </Modal>
  );
}
