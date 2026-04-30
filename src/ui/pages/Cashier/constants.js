// Denominaciones de billetes y monedas
export const BILLS = ['100', '50', '20', '10', '5', '1'];
export const COINS = ['1.00', '0.50', '0.25', '0.10', '0.05', '0.01'];

export const BILL_VALUES = { '100': 100, '50': 50, '20': 20, '10': 10, '5': 5, '1': 1 };
export const COIN_VALUES = { '1.00': 1.00, '0.50': 0.50, '0.25': 0.25, '0.10': 0.10, '0.05': 0.05, '0.01': 0.01 };

export const DENOM_VALUE = (k) => BILL_VALUES[k] ?? COIN_VALUES[k] ?? 0;

// Helper para crear fecha local desde string "YYYY-MM-DD HH:mm:ss" sin desfase de zona horaria
export const createLocalDate = (str) => {
  if (!str) return null;
  const t = str.split(/[- : T]/);
  return new Date(t[0], t[1] - 1, t[2], t[3] || 0, t[4] || 0, t[5] || 0);
};

// Helper para formatear fecha a string de input datetime-local
export const toInputDate = (str) => {
  if (!str) return '';
  return str.replace(' ', 'T').substring(0, 16);
};
