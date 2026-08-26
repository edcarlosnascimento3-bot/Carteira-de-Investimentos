export function normalizeTipo(tipo) {
  if (!tipo) return '';
  const s = String(tipo).trim();
  if (s.toLowerCase() === 'fii') return 'FII';
  if (s === 'FII Agro') return 'FII';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const typeIcons = {
  'Ação': '📈',
  'FII': '🏗️',
  'Renda Fixa': '🔒',
};

export const typeColors = {
  'Ação': '#C8B800',
  'FII': '#CC8800',
  'Renda Fixa': '#0099CC',
};

export const typeBorders = {
  'Ação': '#FF3333',
  'FII': '#00CC66',
  'Renda Fixa': '#FFD700',
  'Dólar': '#D485FF',
  'Euro': '#D485FF',
  'Criptoativo': '#3399FF',
  'Cripto': '#3399FF',
  'Criptoativos': '#3399FF',
  'Ouro': '#FFD700',
};

export const monthNames = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export function makeId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
