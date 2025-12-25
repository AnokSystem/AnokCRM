import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase } from '@/lib/supabase'; // [NEW]
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Play,
  Pause,
  Send,
  Users,
  Calendar,
  BarChart3,
  Clock,
  CheckCircle,
  Megaphone,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import * as campaignService from '@/services/campaignService';
import * as flowService from '@/services/flowService';
import * as chatService from '@/services/chatService';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, CheckCircle2, FileText } from 'lucide-react';

// Interfaces aligned with services
type Campaign = campaignService.Campaign;
type CampaignLog = campaignService.CampaignLog;
type Flow = flowService.Flow;
type KanbanColumn = chatService.KanbanColumn;
interface WhatsAppInstance { instance_name: string; display_name: string; }

export default function Remarketing() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [flows, setFlows] = useState<Flow[]>([]);

  const [categories, setCategories] = useState<KanbanColumn[]>([]);
  const [instances, setInstances] = useState<WhatsAppInstance[]>([]); // [NEW]

  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [logs, setLogs] = useState<CampaignLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [newCampaign, setNewCampaign] = useState({
    nome: '',
    descricao: '',
    fluxo_id: '',

    categoria_leads: '',
    instance_name: '', // [NEW]
    data_agendamento: '',
    hora_agendamento: '',
    enviar_agora: false,
  });

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const [fetchedCampaigns, fetchedFlows, fetchedCategories] = await Promise.all([
        campaignService.getCampaigns(user.id),
        flowService.getFlows(user.id),
        chatService.getUserKanbanColumns(user.id),
      ]);
      setCampaigns(fetchedCampaigns);
      setFlows(fetchedFlows);

      setCategories(fetchedCategories);

      // [NEW] Fetch Instances
      const { data: userInstances } = await supabase
        .from('whatsapp_instances')
        .select('instance_name, display_name')
        .eq('user_id', user.id);

      if (userInstances) {
        setInstances(userInstances);
        // Default to first instance if available
        if (userInstances.length > 0 && !newCampaign.instance_name) {
          setNewCampaign(prev => ({ ...prev, instance_name: userInstances[0].instance_name }));
        }
      }
    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar dados das campanhas');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCampaign = async () => {
    if (!user) return;

    if (!newCampaign.nome.trim()) {
      toast.error('Nome da campanha é obrigatório');
      return;
    }
    if (!newCampaign.fluxo_id) {
      toast.error('Selecione um fluxo');
      return;
    }
    if (!newCampaign.categoria_leads) {
      toast.error('Selecione uma categoria de leads');
      return;
    }

    try {
      const scheduledDate = newCampaign.enviar_agora
        ? new Date().toISOString()
        : newCampaign.data_agendamento && newCampaign.hora_agendamento
          ? new Date(`${newCampaign.data_agendamento}T${newCampaign.hora_agendamento}`).toISOString()
          : null;

      console.log('Creating campaign:', newCampaign.nome);



      // Calculate total leads in category
      const { count } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('column_id', newCampaign.categoria_leads);

      const created = await campaignService.createCampaign(user.id, {
        name: newCampaign.nome,
        description: newCampaign.descricao,
        flow_id: newCampaign.fluxo_id,
        category_id: newCampaign.categoria_leads,
        instance_name: newCampaign.instance_name, // [NEW]
        status: newCampaign.enviar_agora ? 'em_andamento' : 'agendada',
        scheduled_at: scheduledDate,
        stats: { total: count || 0, sent: 0, delivered: 0, read: 0 }
      });

      if (created) {
        setCampaigns([created, ...campaigns]);
        setNewCampaign({
          nome: '',
          descricao: '',
          fluxo_id: '',
          categoria_leads: '',
          instance_name: instances.length > 0 ? instances[0].instance_name : '', // Reset to default
          data_agendamento: '',
          hora_agendamento: '',
          enviar_agora: false,
        });
        setIsCreateOpen(false);
        toast.success(
          newCampaign.enviar_agora
            ? 'Campanha iniciada com sucesso!'
            : 'Campanha agendada com sucesso!'
        );
      }
    } catch (error: any) {
      console.error('Error creating campaign:', error);
      toast.error(`Erro ao criar campanha: ${error.message || 'Erro desconhecido'}`);
    }
  };

  const handleDeleteCampaign = async () => {
    if (!selectedCampaign) return;
    try {
      await campaignService.deleteCampaign(selectedCampaign.id);
      setCampaigns(campaigns.filter((c) => c.id !== selectedCampaign.id));
      setIsDeleteOpen(false);
      setSelectedCampaign(null);
      toast.success('Campanha excluída com sucesso!');
    } catch (error) {
      toast.error('Erro ao excluir campanha');
    }
  };

  const handleToggleStatus = async (campaign: Campaign) => {
    const newStatus =
      campaign.status === 'em_andamento' ? 'pausada' : 'em_andamento';

    // Optimistic Update
    setCampaigns(
      campaigns.map((c) =>
        c.id === campaign.id ? { ...c, status: newStatus } : c
      )
    );

    try {
      const success = await campaignService.updateCampaignStatus(campaign.id, newStatus);
      if (!success) throw new Error('Falha ao atualizar status');

      toast.success(
        newStatus === 'em_andamento' ? 'Campanha retomada!' : 'Campanha pausada!'
      );
    } catch (error) {
      // Revert
      setCampaigns(
        campaigns.map((c) =>
          c.id === campaign.id ? { ...c, status: campaign.status } : c
        )
      );
      toast.error('Erro ao atualizar status');
    }
  };

  const handleOpenReport = async (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setIsReportOpen(true);
    setLoadingLogs(true);
    try {
      const fetchedLogs = await campaignService.getCampaignLogs(campaign.id);

      // Deduplicate logs by phone (keep only the first occurrence/latest)
      const uniqueLogs = fetchedLogs.filter((log, index, self) =>
        index === self.findIndex((t) => (
          t.lead_phone === log.lead_phone && t.campaign_id === log.campaign_id
        ))
      );

      setLogs(uniqueLogs);
    } catch (error) {
      toast.error('Erro ao carregar relatório');
    } finally {
      setLoadingLogs(false);
    }
  };

  const getStatusBadge = (status: Campaign['status']) => {
    const config = {
      agendada: {
        className: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        icon: Clock,
        label: 'Agendada',
      },
      em_andamento: {
        className: 'bg-green-500/20 text-green-400 border-green-500/30',
        icon: Play,
        label: 'Em Andamento',
      },
      concluida: {
        className: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
        icon: CheckCircle,
        label: 'Concluída',
      },
      pausada: {
        className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
        icon: Pause,
        label: 'Pausada',
      },
      rascunho: {
        className: 'bg-muted text-muted-foreground border-border',
        icon: Edit,
        label: 'Rascunho',
      },
    };
    // Default fallback
    const { className, icon: Icon, label } = config[status] || config['rascunho'];
    return (
      <Badge variant="outline" className={`gap-1 ${className}`}>
        <Icon className="w-3 h-3" />
        {label}
      </Badge>
    );
  };

  const getFlowName = (flowId: string) => {
    const flow = flows.find(f => f.id === flowId);
    return flow ? flow.name : 'Fluxo Desconhecido';
  };

  const getCategoryLabel = (categoryId: string) => {
    const category = categories.find((c) => c.column_id === categoryId);
    return category?.label || categoryId;
  };

  // Stats calculations
  const totalCampaigns = campaigns.length;
  const activeCampaigns = campaigns.filter(
    (c) => c.status === 'em_andamento'
  ).length;
  const totalEnviados = campaigns.reduce((acc, c) => acc + (c.stats?.sent || 0), 0);
  const totalEntregues = campaigns.reduce((acc, c) => acc + (c.stats?.delivered || 0), 0);
  const taxaEntrega = totalEnviados > 0 ? ((totalEntregues / totalEnviados) * 100).toFixed(1) : '0.0';

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Carregando campanhas...</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campanhas"
        description="Crie e gerencie campanhas de mensagens para seus leads"
      >
        <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Nova Campanha
        </Button>
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Same cards as before, effectively reusing layout */}
        <Card className="glass-effect">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Campanhas
            </CardTitle>
            <Megaphone className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCampaigns}</div>
          </CardContent>
        </Card>
        <Card className="glass-effect">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Campanhas Ativas
            </CardTitle>
            <Play className="w-4 h-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">
              {activeCampaigns}
            </div>
          </CardContent>
        </Card>
        <Card className="glass-effect">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Mensagens Enviadas
            </CardTitle>
            <Send className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEnviados.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="glass-effect">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Taxa de Entrega
            </CardTitle>
            <BarChart3 className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{taxaEntrega}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns Table */}
      <Card className="glass-effect">
        <CardHeader>
          <CardTitle>Campanhas</CardTitle>
          <CardDescription>
            Gerencie suas campanhas de remarketing
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead>Campanha</TableHead>
                <TableHead>Fluxo</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Progresso</TableHead>
                <TableHead>Data de Envio</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhuma campanha encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                campaigns.map((campaign) => (
                  <TableRow key={campaign.id} className="border-border/50">
                    <TableCell>
                      <div>
                        <div className="font-medium">{campaign.name}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-xs">
                          {campaign.description}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {getFlowName(campaign.flow_id)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Users className="w-3 h-3 text-muted-foreground" />
                        <span className="truncate max-w-[120px]">
                          {getCategoryLabel(campaign.category_id)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {getStatusBadge(campaign.status)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="text-sm">
                        <span className="font-medium">{campaign.stats?.sent || 0}</span>
                        <span className="text-muted-foreground">
                          /{campaign.stats?.total || 0}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {campaign.stats?.delivered || 0} entregues
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="w-3 h-3" />
                        {campaign.scheduled_at
                          ? new Date(campaign.scheduled_at).toLocaleDateString() + ' ' + new Date(campaign.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : 'Inválido'}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {(campaign.status === 'em_andamento' ||
                            campaign.status === 'pausada') && (
                              <DropdownMenuItem
                                onClick={() => handleToggleStatus(campaign)}
                              >
                                {campaign.status === 'em_andamento' ? (
                                  <>
                                    <Pause className="w-4 h-4 mr-2" />
                                    Pausar
                                  </>
                                ) : (
                                  <>
                                    <Play className="w-4 h-4 mr-2" />
                                    Retomar
                                  </>
                                )}
                              </DropdownMenuItem>
                            )}
                          <DropdownMenuItem
                            onClick={() => handleOpenReport(campaign)}
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            Relatório
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => {
                              setSelectedCampaign(campaign);
                              setIsDeleteOpen(true);
                            }}
                          >
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
        </CardContent>
      </Card>

      {/* Create Campaign Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Campanha</DialogTitle>
            <DialogDescription>
              Configure uma nova campanha de remarketing
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome da Campanha</Label>
              <Input
                id="nome"
                placeholder="Ex: Promoção de Verão"
                value={newCampaign.nome}
                onChange={(e) =>
                  setNewCampaign({ ...newCampaign, nome: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                placeholder="Descreva o objetivo desta campanha..."
                value={newCampaign.descricao}
                onChange={(e) =>
                  setNewCampaign({ ...newCampaign, descricao: e.target.value })
                }
              />
            </div>


            <div className="space-y-2">
              <Label>Conexão WhatsApp (Disparador)</Label>
              <Select
                value={newCampaign.instance_name}
                onValueChange={(value) =>
                  setNewCampaign({ ...newCampaign, instance_name: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a conexão" />
                </SelectTrigger>
                <SelectContent>
                  {instances.map((inst) => (
                    <SelectItem key={inst.instance_name} value={inst.instance_name}>
                      {inst.display_name || inst.instance_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Fluxo de Mensagens</Label>
              <Select
                value={newCampaign.fluxo_id}
                onValueChange={(value) =>
                  setNewCampaign({ ...newCampaign, fluxo_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um fluxo" />
                </SelectTrigger>
                <SelectContent>
                  {flows.map((flow) => (
                    <SelectItem key={flow.id} value={flow.id}>
                      {flow.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Categoria de Leads</Label>
              <Select
                value={newCampaign.categoria_leads}
                onValueChange={(value) =>
                  setNewCampaign({ ...newCampaign, categoria_leads: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.column_id} value={category.column_id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{category.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="enviar_agora"
                checked={newCampaign.enviar_agora}
                onCheckedChange={(checked) =>
                  setNewCampaign({
                    ...newCampaign,
                    enviar_agora: checked as boolean,
                  })
                }
              />
              <Label htmlFor="enviar_agora" className="cursor-pointer">
                Enviar imediatamente
              </Label>
            </div>

            {!newCampaign.enviar_agora && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="data">Data</Label>
                  <Input
                    id="data"
                    type="date"
                    value={newCampaign.data_agendamento}
                    onChange={(e) =>
                      setNewCampaign({
                        ...newCampaign,
                        data_agendamento: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hora">Hora</Label>
                  <Input
                    id="hora"
                    type="time"
                    value={newCampaign.hora_agendamento}
                    onChange={(e) =>
                      setNewCampaign({
                        ...newCampaign,
                        hora_agendamento: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateCampaign}>
              {newCampaign.enviar_agora ? (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Iniciar Campanha
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4 mr-2" />
                  Agendar Campanha
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Campanha</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir a campanha "{selectedCampaign?.name}
              "? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteCampaign}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Dialog */}
      <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
        <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Relatório de Disparos - {selectedCampaign?.name}</DialogTitle>
            <DialogDescription>
              Histórico de mensagens enviadas para esta campanha.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden border rounded-md">
            {loadingLogs ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Carregando logs...</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <FileText className="w-12 h-12 mb-2 opacity-20" />
                <p>Nenhum registro encontrado.</p>
              </div>
            ) : (
              <ScrollArea className="h-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lead</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Hora</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Detalhes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{log.lead_name || 'Desconhecido'}</TableCell>
                        <TableCell>{log.lead_phone}</TableCell>
                        <TableCell>{new Date(log.created_at).toLocaleString()}</TableCell>
                        <TableCell>
                          {log.status === 'sent' && (
                            <Badge className="bg-green-500/20 text-green-600 gap-1 hover:bg-green-500/30">
                              <CheckCircle2 className="w-3 h-3" /> Enviado
                            </Badge>
                          )}
                          {log.status === 'failed' && (
                            <Badge variant="destructive" className="gap-1">
                              <AlertCircle className="w-3 h-3" /> Falha
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-muted-foreground text-xs" title={log.error_message}>
                          {log.error_message || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => setIsReportOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div >
  );
}
