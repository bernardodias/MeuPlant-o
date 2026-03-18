export interface Location {
  id: string;
  name: string;
  color: string;
  user_id: string;
  address?: string;
}

export type ShiftStatus = 'pendente' | 'realizado' | 'pago';

export interface Shift {
  id: string;
  name: string;
  color: string;
  location_id?: string;
  value: number;
  payment_date?: string; // ISO 8601
  status: ShiftStatus;
  start_at: string; // ISO 8601
  end_at: string; // ISO 8601
  notes?: string;
  user_id: string;
}

export interface ShiftTemplate {
  id: string;
  name: string;
  color: string;
  value: number;
  start_time: string; // HH:mm
  end_time: string;   // HH:mm
  user_id: string;
}

export type ViewType = 'calendar' | 'financial' | 'templates' | 'stats' | 'settings' | 'recovery' | 'locations';
