export interface LeadCategory {
  Id?: number;
  nome: string;
  descricao?: string;
  cor: string;
  created_at?: string;
}

export interface Lead {
  Id?: number;
  id?: string; // Support UUID from Supabase
  nome: string;
  sobrenome: string;
  idade?: number;

  // New Fields
  person_type?: 'PF' | 'PJ';
  cpf_cnpj?: string;
  birth_date?: string;
  lastname?: string;

  // Address
  postal_code?: string;
  rua?: string;
  address?: string; // Alias for rua
  address_number?: string;
  numero?: string; // Alias for address_number
  bairro?: string;
  neighborhood?: string; // Alias for bairro
  cidade?: string;
  city?: string; // Alias for cidade
  estado?: string;
  state?: string; // Alias for estado

  telefone: string;
  email?: string;

  categoria_id?: number;
  categoria_nome?: string;
  categoria_cor?: string;

  remarketing_id?: string;
  remarketing_nome?: string;
  remarketing_status?: 'ativo' | 'pausado' | 'concluido';
  remarketing_etapa_atual?: number;
  remarketing_inicio?: string;

  notes?: string;
  created_at?: string;
  updated_at?: string;
  custom_fields?: Record<string, any>;
}

export interface RemarketingSequence {
  Id?: number;
  nome: string;
  descricao?: string;
  status: 'ativo' | 'inativo' | 'rascunho';
  steps_json: string;
  leads_vinculados?: number;
  created_at?: string;
}

export interface RemarketingStep {
  id: string;
  dias_espera: number;
  horas_espera: number;
  fluxo_id: string;
  fluxo_nome: string;
  ordem: number;
}

export interface Product {
  Id?: number;
  nome: string;
  descricao?: string;
  valor: number;
  unidade: 'unidade' | 'm2';
  imagem_base64?: string;
  ativo?: boolean;
  created_at?: string;
}

export interface Supplier {
  Id?: number;
  razao_social: string;
  nome_fantasia?: string;
  cnpj: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  telefone?: string;
  email?: string;
  created_at?: string;
}

export interface OrderItem {
  product_id: number;
  product_name: string;
  quantidade: number;
  valor_unitario: number;
  largura?: number;
  altura?: number;
  subtotal: number;
}

export interface Order {
  Id?: number;
  lead_id: number;
  lead_nome?: string;
  items: OrderItem[];
  total: number;
  status: 'pendente' | 'pago' | 'cancelado';
  created_at?: string;
}

export interface FlowNode {
  id: string;
  type: 'text' | 'image' | 'audio' | 'video' | 'pdf' | 'delay';
  data: {
    label: string;
    content?: string;
    media_base64?: string;
    delay_seconds?: number;
  };
  position: { x: number; y: number };
}

export interface Flow {
  Id?: number;
  nome: string;
  descricao?: string;
  fluxo_json: string;
  ativo?: boolean;
  created_at?: string;
}

export interface Settings {
  Id?: number;
  empresa_nome?: string;
  empresa_cnpj?: string;
  empresa_logo_base64?: string;
  empresa_endereco?: string;
  empresa_telefone?: string;
  empresa_email?: string;
}

export interface DashboardMetrics {
  totalLeads: number;
  leadsUltimos7Dias: number;
  aniversariantes: number;
  vendasPagas: number;
  vendasNaoPagas: number;
  totalVendas: number;
}

export interface WhatsAppConnection {
  Id?: number;
  instanceName: string;
  userId?: string;
  profileName?: string;
  profilePictureUrl?: string;
  status: 'open' | 'close' | 'connecting';
  created_at?: string;
  updated_at?: string;
}
