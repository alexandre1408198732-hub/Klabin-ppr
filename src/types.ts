export interface Machine {
  id: string;
  name: string;
  currentProduction: number;
  goalProduction: number;
  status: 'Produzindo' | 'Parada' | 'Ajuste' | 'Setup';
  lastStatusChange: string;
}

export interface ProductionEvent {
  id: string;
  machineId: string;
  machineName: string;
  type: 'Produção' | 'Parada' | 'Ajuste' | 'Setup';
  startTime: string;
  endTime?: string;
  m2Produced?: number;
  observation?: string;
}

export interface Goal {
  id: string;
  type: 'day' | 'month' | 'year';
  target: number;
  current: number;
}

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'user';
}
