import { db } from './services/db';

// Re-exportando do DB para manter compatibilidade onde possível
export const SERVICES = db.getServices();
export const BARBERS = db.getBarbers();

export const INITIAL_USER = null; // Deprecated