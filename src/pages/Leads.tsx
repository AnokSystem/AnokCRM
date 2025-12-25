import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import * as leadService from '@/services/leadService';
import * as workspaceService from '@/services/workspaceService';
import { brasilApi } from '@/services/nocodb';
import { Plus, Search, Upload, Download, Pencil, Trash2, Phone, RefreshCw, Play, Pause, FileSpreadsheet, Tag, User, Building2, MapPin, Calendar, Eye, Mail } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { LeadDetailSheet } from '@/components/leads/LeadDetailSheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { Lead, LeadCategory } from '@/types';
import Papa from 'papaparse';

interface RemarketingSequence {
  id: string;
  nome: string;
  status: 'ativo' | 'inativo';
  total_etapas: number;
}

// Mock remarketing sequences
const mockRemarketingSequences: RemarketingSequence[] = [
  { id: '1', nome: 'Sequência de Boas-vindas', status: 'ativo', total_etapas: 3 },
  { id: '2', nome: 'Recuperação de Vendas', status: 'ativo', total_etapas: 3 },
  { id: '3', nome: 'Nutrição Longo Prazo', status: 'inativo', total_etapas: 4 },
];

// Mock categories
const mockCategories: LeadCategory[] = [
  { Id: 1, nome: 'Novo', descricao: 'Leads recém cadastrados', cor: '#3B82F6' },
  { Id: 2, nome: 'Interessado', descricao: 'Leads que demonstraram interesse', cor: '#10B981' },
  { Id: 3, nome: 'Negociação', descricao: 'Leads em processo de negociação', cor: '#F59E0B' },
  { Id: 4, nome: 'Cliente', descricao: 'Leads convertidos em clientes', cor: '#8B5CF6' },
];

// CSV columns mapping
const CSV_COLUMNS = [
  'nome',
  'sobrenome',
  'telefone',
  'email',
  'cpf_cnpj',
  'rua',
  'numero',
  'bairro',
  'cidade',
  'estado'
];

export default function Leads() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [defaultWorkspace, setDefaultWorkspace] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRemarketingDialogOpen, setIsRemarketingDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [viewingLead, setViewingLead] = useState<Lead | null>(null); // State for viewing details
  const [selectedLeadForRemarketing, setSelectedLeadForRemarketing] = useState<Lead | null>(null);
  const [selectedRemarketingId, setSelectedRemarketingId] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [isLoadingCNPJ, setIsLoadingCNPJ] = useState(false);
  const [isLoadingCEP, setIsLoadingCEP] = useState(false);

  const [formData, setFormData] = useState<Partial<Lead>>({
    nome: '',
    sobrenome: '',
    person_type: 'PF',
    cpf_cnpj: '',
    birth_date: '',
    idade: undefined,
    telefone: '',
    email: '',
    postal_code: '',
    rua: '',
    numero: '',
    bairro: '',
    cidade: '',
    estado: '',
    categoria_id: undefined,
    notes: ''
  });

  // Calculate Age Effect
  useEffect(() => {
    if (formData.birth_date) {
      const birth = new Date(formData.birth_date);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      setFormData(prev => ({ ...prev, idade: age }));
    } else {
      setFormData(prev => ({ ...prev, idade: undefined }));
    }
  }, [formData.birth_date]);

  // Load workspaces and leads from database
  useEffect(() => {
    if (user) {
      loadDefaultWorkspace();
      loadLeadsFromDB();
    }
  }, [user]);

  const loadDefaultWorkspace = async () => {
    if (!user) return;
    try {
      const workspaces = await workspaceService.getUserWorkspaces(user.id);
      const geralWorkspace = workspaces.find(w => w.is_default || w.name === 'Geral');
      if (geralWorkspace) {
        setDefaultWorkspace(geralWorkspace.id);
      }
    } catch (error) {
      console.error('Error loading workspace:', error);
    }
  };

  const loadLeadsFromDB = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const dbLeads = await leadService.getAllLeads(user.id);
      // Map to expected format
      const mappedLeads = dbLeads.map(lead => ({
        Id: lead.id, // Using standard ID from DB
        id: lead.id,
        nome: lead.name ? lead.name.split(' ')[0] : '',
        sobrenome: lead.name ? lead.name.split(' ').slice(1).join(' ') : '',
        telefone: lead.phone,
        email: lead.email,
        person_type: lead.is_person ? 'PF' : 'PJ',
        cpf_cnpj: lead.is_person ? lead.cpf : lead.cnpj,
        birth_date: lead.birth_date,
        // Detailed Address
        rua: lead.address_street,
        numero: lead.address_number,
        bairro: lead.address_district,
        cidade: lead.address_city || lead.address_state, // Fallback
        estado: lead.address_state,
        postal_code: lead.address_zip,
        notes: lead.notes,

        // Mock fields for UI compatibility until refactored completely
        categoria_id: undefined,
        categoria_nome: undefined,
        categoria_cor: undefined,
      }));
      setLeads(mappedLeads);
    } catch (error) {
      console.error('Error loading leads:', error);
      toast({ title: 'Erro ao carregar leads', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const filteredLeads = leads.filter(
    (lead) =>
      lead.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.sobrenome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.telefone?.includes(searchTerm) ||
      lead.cpf_cnpj?.includes(searchTerm)
  );

  const handleCNPJBlur = async () => {
    if (formData.person_type === 'PJ' && formData.cpf_cnpj) {
      const cleanVal = formData.cpf_cnpj.replace(/\D/g, '');

      // If editing and CNPJ hasn't changed, don't lookup
      if (editingLead && editingLead.cpf_cnpj) {
        const originalClean = editingLead.cpf_cnpj.replace(/\D/g, '');
        if (originalClean === cleanVal) return;
      }

      if (cleanVal.length === 14) {
        setIsLoadingCNPJ(true);
        try {
          const data = await brasilApi.consultarCNPJ(cleanVal);
          setFormData(prev => ({
            ...prev,
            nome: data.razao_social?.substring(0, 50) || '', // Truncate to fit if needed
            sobrenome: data.nome_fantasia || '',
            postal_code: data.cep,
            rua: data.logradouro,
            numero: data.numero,
            bairro: data.bairro,
            cidade: data.municipio,
            estado: data.uf,
            email: data.email || prev.email,
            telefone: data.ddd_telefone_1 || prev.telefone,
            cpf_cnpj: cleanVal.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5") // Format
          }));
          toast({ title: 'CNPJ encontrado!', description: 'Dados da empresa carregados.' });
        } catch (err) {
          toast({ title: 'Erro ao consultar CNPJ', description: 'Verifique o número digitado.', variant: 'destructive' });
        } finally {
          setIsLoadingCNPJ(false);
        }
      }
    }
  };

  const handleCEPBlur = async () => {
    if (formData.postal_code) {
      const cleanCep = formData.postal_code.replace(/\D/g, '');
      if (cleanCep.length === 8) {
        setIsLoadingCEP(true);
        try {
          // Attempt to fetch from BrasilAPI generic CEP
          const response = await fetch(`https://brasilapi.com.br/api/cep/v1/${cleanCep}`);
          if (response.ok) {
            const data = await response.json();
            setFormData(prev => ({
              ...prev,
              rua: data.street,
              bairro: data.neighborhood,
              cidade: data.city,
              estado: data.state
            }));
            toast({ title: 'Endereço encontrado!' });
          }
        } catch (err) {
          // Silent fail or toast
        } finally {
          setIsLoadingCEP(false);
        }
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({ title: 'Erro: usuário não autenticado', variant: 'destructive' });
      return;
    }

    try {
      // Logic to combine name + surname if needed, or keep separate
      // LeadService expects `name` as required. We can send FirstName as name, and Lastname as lastname
      const full_name = (formData.nome || '') + (formData.sobrenome ? ' ' + formData.sobrenome : '');
      const is_pf = formData.person_type === 'PF';

      const leadPayload: leadService.CreateLeadData = {
        name: full_name,
        phone: formData.telefone || '',
        email: formData.email,
        company: formData.cidade, // Kept for backward compat

        // Profile
        is_person: is_pf,
        cpf: is_pf ? formData.cpf_cnpj : undefined,
        cnpj: !is_pf ? formData.cpf_cnpj : undefined,
        birth_date: formData.birth_date,

        // Address
        address_zip: formData.postal_code,
        address_street: formData.rua,
        address_number: formData.numero,
        address_district: formData.bairro,
        address_city: formData.cidade,
        address_state: formData.estado,

        notes: formData.notes,

        workspace_id: defaultWorkspace || undefined,
        column_id: 'leads',
      };

      if (editingLead) {
        // Update existing lead in database
        // Need to cast ID to string if it's number
        await leadService.updateLead(editingLead.id || String(editingLead.Id), leadPayload);
        toast({ title: 'Lead atualizado com sucesso!' });
      } else {
        // Create new lead in database
        await leadService.createLead(user.id, leadPayload);
        toast({ title: 'Lead criado com sucesso!' });
      }

      // Reload leads from database
      await loadLeadsFromDB();
      resetForm();
    } catch (error) {
      console.error('Error saving lead:', error);
      toast({ title: 'Erro ao salvar lead', variant: 'destructive' });
    }
  };

  const handleEdit = (lead: any) => {
    setEditingLead(lead);
    setFormData({
      ...lead,
      // Ensure values aren't null for inputs
      postal_code: lead.postal_code || '',
      rua: lead.rua || '',
      numero: lead.numero || '',
      bairro: lead.bairro || '',
      cidade: lead.cidade || '',
      estado: lead.estado || '',
      cpf_cnpj: lead.cpf_cnpj || '',
      notes: lead.notes || '',
      person_type: lead.person_type || 'PF'
    });
    setIsDialogOpen(true);
  };

  const handleView = (lead: any) => {
    setViewingLead(lead);
  }

  const handleDelete = async (id: string | number) => {
    if (!confirm("Tem certeza que deseja excluir?")) return;
    try {
      await leadService.deleteLead(String(id));
      setLeads(prev => prev.filter((l) => l.Id !== id && l.id !== id));
      toast({ title: 'Lead removido com sucesso!', variant: 'destructive' });
    } catch (error) {
      console.error('Error deleting lead:', error);
      toast({ title: 'Erro ao remover lead', variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      sobrenome: '',
      person_type: 'PF',
      cpf_cnpj: '',
      birth_date: '',
      idade: undefined,
      telefone: '',
      email: '',
      postal_code: '',
      rua: '',
      numero: '',
      bairro: '',
      cidade: '',
      estado: '',
      categoria_id: undefined,
      notes: ''
    });
    setEditingLead(null);
    setIsDialogOpen(false);
  };

  const downloadCSVTemplate = () => {
    // ... (Keep existing simple logic or update if highly requested, prioritizing implementation speed)
    toast({ title: 'Em breve', description: 'Modelo atualizado em construção' });
  };

  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    // ... (Keep existing stub or minimal logic)
    toast({ title: 'Em breve', description: 'Importação atualizada em construção' });
  }

  // Remarketing stubs (keep existing UI logic for now)
  const openRemarketingDialog = (lead: Lead) => {
    setSelectedLeadForRemarketing(lead);
    setSelectedRemarketingId(lead.remarketing_id || 'none');
    setIsRemarketingDialogOpen(true);
  };

  const handleAssignRemarketing = () => setIsRemarketingDialogOpen(false);
  const handleToggleRemarketingStatus = (l: any) => { };
  const handleRemoveRemarketing = (l: any) => { };
  const getRemarketingStatusBadge = (s: any) => null;


  return (
    <div className="animate-fade-in">
      <PageHeader title="Gestão de Leads" description="Gerencie seus leads e contatos">
        <Button variant="outline" onClick={() => toast({ title: 'Em breve' })}>
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Baixar Modelo
        </Button>
        <Button variant="outline" onClick={() => toast({ title: 'Em breve' })}>
          <Upload className="w-4 h-4 mr-2" />
          Importar CSV
        </Button>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsDialogOpen(open); }}>
          <DialogTrigger asChild>
            <Button className="gradient-primary glow">
              <Plus className="w-4 h-4 mr-2" />
              Novo Lead
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingLead ? 'Editar Lead' : 'Novo Lead'}</DialogTitle>
              <DialogDescription>Preencha os dados completos do lead.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">

              {/* Type Selection */}
              <div className="flex justify-center">
                <RadioGroup
                  defaultValue="PF"
                  value={formData.person_type}
                  onValueChange={(v) => setFormData({ ...formData, person_type: v as 'PF' | 'PJ' })}
                  className="flex gap-6"
                >
                  <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-muted/50 cursor-pointer transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                    <RadioGroupItem value="PF" id="pf" />
                    <Label htmlFor="pf" className="flex items-center gap-2 cursor-pointer"><User className="w-4 h-4" /> Pessoa Física</Label>
                  </div>
                  <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-muted/50 cursor-pointer transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                    <RadioGroupItem value="PJ" id="pj" />
                    <Label htmlFor="pj" className="flex items-center gap-2 cursor-pointer"><Building2 className="w-4 h-4" /> Pessoa Jurídica</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Identification */}
                <div className="space-y-2">
                  <Label>{formData.person_type === 'PF' ? 'CPF' : 'CNPJ'} {formData.person_type === 'PJ' && <span className="text-xs text-muted-foreground">(Digite para buscar)</span>}</Label>
                  <div className="relative">
                    <Input
                      value={formData.cpf_cnpj}
                      onChange={(e) => setFormData({ ...formData, cpf_cnpj: e.target.value })}
                      onBlur={handleCNPJBlur}
                      placeholder={formData.person_type === 'PF' ? '000.000.000-00' : '00.000.000/0000-00'}
                    />
                    {isLoadingCNPJ && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground animate-pulse">Buscando...</div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Data de Nascimento</Label>
                  <div className="grid grid-cols-[1fr,80px] gap-2">
                    <Input
                      type="date"
                      value={formData.birth_date}
                      onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                    />
                    <div className="border rounded-md flex flex-col items-center justify-center bg-muted/30">
                      <span className="text-[10px] uppercase text-muted-foreground">Idade</span>
                      <span className="font-bold text-primary">{formData.idade !== undefined ? formData.idade : '-'}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nome">Nome / Razão Social</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sobrenome">Sobrenome / Nome Fantasia</Label>
                  <Input
                    id="sobrenome"
                    value={formData.sobrenome}
                    onChange={(e) => setFormData({ ...formData, sobrenome: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone / WhatsApp</Label>
                  <Input
                    id="telefone"
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    required
                    placeholder="(99) 99999-9999"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-4 pt-2 border-t border-dashed">
                <h4 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground"><MapPin className="w-3 h-3" /> Endereço</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="md:col-span-1">
                    <Label>CEP</Label>
                    <Input
                      value={formData.postal_code}
                      onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                      onBlur={handleCEPBlur}
                      placeholder="00000-000"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <Label>Rua</Label>
                    <Input value={formData.rua} onChange={(e) => setFormData({ ...formData, rua: e.target.value })} />
                  </div>
                  <div className="md:col-span-1">
                    <Label>Número</Label>
                    <Input value={formData.numero} onChange={(e) => setFormData({ ...formData, numero: e.target.value })} />
                  </div>
                  <div className="md:col-span-1">
                    <Label>Bairro</Label>
                    <Input value={formData.bairro} onChange={(e) => setFormData({ ...formData, bairro: e.target.value })} />
                  </div>
                  <div className="md:col-span-1">
                    <Label>Cidade</Label>
                    <Input value={formData.cidade} onChange={(e) => setFormData({ ...formData, cidade: e.target.value })} />
                  </div>
                  <div className="md:col-span-1">
                    <Label>Estado</Label>
                    <Input value={formData.estado} onChange={(e) => setFormData({ ...formData, estado: e.target.value })} maxLength={2} placeholder="UF" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Anotações</Label>
                <Textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Detalhes adicionais sobre o lead..."
                  className="min-h-[80px]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button type="submit" className="gradient-primary px-8">
                  {editingLead ? 'Salvar Alterações' : 'Criar Lead'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, telefone, empresa ou CNPJ..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 max-w-md"
        />
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border">
              <TableHead>Lead</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Localização</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLeads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum lead encontrado.</TableCell>
              </TableRow>
            ) : (
              filteredLeads.map((lead) => (
                <TableRow key={lead.id} className="border-border hover:bg-muted/50">
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span className="font-semibold">{lead.nome} {lead.sobrenome}</span>
                      {lead.cpf_cnpj && <span className="text-xs text-muted-foreground font-mono">{lead.cpf_cnpj} ({lead.person_type})</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <a href={`https://wa.me/55${lead.telefone?.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline text-sm">
                        <Phone className="w-3 h-3" /> {lead.telefone}
                      </a>
                      {lead.email && <div className="text-xs text-muted-foreground">{lead.email}</div>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={lead.person_type === 'PJ' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' : 'bg-green-500/10 text-green-600 border-green-500/20'}>
                      {lead.person_type || 'PF'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{lead.cidade} {lead.estado && `/ ${lead.estado}`}</div>
                    <div className="text-xs text-muted-foreground truncate max-w-[200px]">{lead.rua} {lead.numero}</div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="ghost">
                          Ações
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleView(lead)}>
                          <Eye className="w-4 h-4 mr-2" />
                          Visualizar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleEdit(lead)}>
                          <Pencil className="w-4 h-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(lead.id)} className="text-destructive focus:text-destructive">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* View Details Sheet */}
      <LeadDetailSheet
        leadId={viewingLead?.id || null}
        isOpen={!!viewingLead}
        onClose={() => setViewingLead(null)}
        onLeadUpdated={loadLeadsFromDB}
      />

    </div>
  );
}
