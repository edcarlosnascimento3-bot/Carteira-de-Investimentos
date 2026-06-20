const setores = {
  'Bens Industriais': [
    'Comércio',
    'Construção e Engenharia',
    'Máquinas e Equipamentos',
    'Material de Transporte',
    'Serviços e Transportes Diversos',
  ],
  'Comunicações': [
    'Mídia',
    'Telecomunicações',
    'Telefonia Fixa',
  ],
  'Consumo Cíclico': [
    'Automóveis e Motocicletas',
    'Comércio',
    'Construção Civil',
    'Diversos',
    'Hotéis e Restaurantes',
    'Lazer e Entretenimento',
    'Mobiliário',
    'Tecidos, Vestuário e Calçados',
    'Utilidades Domésticas',
  ],
  'Consumo Não Cíclico': [
    'Agropecuária',
    'Alimentos Processados',
    'Bebidas',
    'Comércio de Alimentos e Bebidas',
    'Produtos de Limpeza e Uso Pessoal',
    'Produtos Farmacêuticos e de Saúde',
    'Tabaco',
  ],
  'Financeiro': [
    'Bancos',
    'Corretoras de Títulos e Valores',
    'Intermediários Financeiros',
    'Previdência e Seguros',
    'Serviços Financeiros Diversos',
    'Securitizadoras de Recebíveis',
  ],
  'Materiais Básicos': [
    'Madeira e Papel',
    'Materiais Diversos',
    'Embalagens',
    'Mineração',
    'Química',
    'Siderurgia e Metalurgia',
  ],
  'Petróleo, Gás e Biocombustíveis': [
    'Extração e Produção',
    'Refino e Distribuição',
    'Petroquímica',
  ],
  'Saúde': [
    'Comércio e Distribuição',
    'Equipamentos e Materiais',
    'Medicamentos e Outros',
    'Serviços Médicos, Hospitalares, Análises e Diagnósticos',
  ],
  'Tecnologia da Informação': [
    'Computadores e Equipamentos',
    'Programas e Serviços',
  ],
  'Utilidade Pública': [
    'Água e Saneamento',
    'Energia Elétrica',
    'Gás',
  ],
};

export const sectoresList = Object.keys(setores);
export const subsectorsBySector = (sector) => setores[sector] || [];
export default setores;
