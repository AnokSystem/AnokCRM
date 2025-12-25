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
import {
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Play,
  Pause,
  RefreshCw,
  Users,
  Calendar,
  Clock,
  CheckCircle,
  Workflow,
  ArrowRight,
  GripVertical,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import * as remarketingService from '@/services/remarketingService';
import * as flowService from '@/services/flowService';

interface RemarketingStep {
  fluxo_id: string;
  fluxo_nome: string;
  dias_espera: number;
  horas_espera: number;
  ordem: number;
}

interface WhatsAppInstance { instance_name: string; display_name: string; }

// Convert service type to UI type if needed, or just use service type
// Mapping service type to local state structure
type Sequence = remarketingService.RemarketingSequence;

interface Flow {
  id: string;
  name: string;
}

export default function Remarketing() {
  const { user } = useAuth();
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [flows, setFlows] = useState<Flow[]>([]);
  const [instances, setInstances] = useState<WhatsAppInstance[]>([]); // [NEW]
  const [isLoading, setIsLoading] = useState(true);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedSequence, setSelectedSequence] = useState<Sequence | null>(null);
  const [editingSequence, setEditingSequence] = useState<Sequence | null>(null);

  const [newSequence, setNewSequence] = useState({
    nome: '',
    descricao: '',
    instance_name: '', // [NEW]
  });

  const [steps, setSteps] = useState<RemarketingStep[]>([
    { dias_espera: 0, horas_espera: 1, fluxo_id: '', fluxo_nome: '', ordem: 1 },
  ]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const [fetchedSequences, fetchedFlows] = await Promise.all([
        remarketingService.getSequences(user.id),
        flowService.getFlows(user.id)
      ]);
      setSequences(fetchedSequences);
      setFlows(fetchedFlows);

      // [NEW] Fetch Instances
      const { data: userInstances } = await supabase
        .from('whatsapp_instances')
        .select('instance_name, display_name')
        .eq('user_id', user.id);

      if (userInstances) {
        setInstances(userInstances);
      }
    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar sequências');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddStep = () => {
    setSteps([
      ...steps,
      { dias_espera: 1, horas_espera: 0, fluxo_id: '', fluxo_nome: '', ordem: steps.length + 1 },
    ]);
  };

  const handleRemoveStep = (index: number) => {
    if (steps.length > 1) {
      const newSteps = steps.filter((_, i) => i !== index);
      setSteps(newSteps.map((step, i) => ({ ...step, ordem: i + 1 })));
    }
  };

  const handleStepChange = (index: number, field: string, value: string | number) => {
    const newSteps = [...steps];
    if (field === 'fluxo_id') {
      const flow = flows.find((f) => f.id === value);
      newSteps[index] = {
        ...newSteps[index],
        fluxo_id: value as string,
        fluxo_nome: flow?.name || '',
      };
    } else {
      newSteps[index] = { ...newSteps[index], [field]: value };
    }
    setSteps(newSteps);
  };

  const handleCreateSequence = async () => {
    if (!user) return;
    if (!newSequence.nome.trim()) {
      toast.error('Nome da sequência é obrigatório');
      return;
    }
    if (!newSequence.instance_name && instances.length > 0) {
      toast.error('Selecione uma instância do WhatsApp');
      return;
    }
    if (steps.some((s) => !s.fluxo_id)) {
      toast.error('Selecione um fluxo para cada etapa');
      return;
    }

    try {
      await remarketingService.createSequence(user.id, {
        name: newSequence.nome,
        description: newSequence.descricao,
        instance_name: newSequence.instance_name, // [NEW]
        steps: steps
      });

      toast.success('Sequência de remarketing criada com sucesso!');
      loadData(); // Reload to get fresh data
      resetForm();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao criar sequência');
    }
  };

  const handleEditSequence = (sequence: Sequence) => {
    setEditingSequence(sequence);
    setNewSequence({
      nome: sequence.name,
      descricao: sequence.description || '',
      instance_name: sequence.instance_name || '' // [NEW]
    });

    // Map existing steps to form state
    const mappedSteps = sequence.steps.map(s => ({
      dias_espera: s.delay_days,
      horas_espera: s.delay_hours,
      fluxo_id: s.flow_id,
      fluxo_nome: s.flow_name || '',
      ordem: s.step_order
    }));

    setSteps(mappedSteps.length > 0 ? mappedSteps : [{ dias_espera: 0, horas_espera: 1, fluxo_id: '', fluxo_nome: '', ordem: 1 }]);
    setIsCreateOpen(true);
  };

  const handleUpdateSequence = async () => {
    if (!editingSequence) return;
    if (!newSequence.nome.trim()) {
      toast.error('Nome da sequência é obrigatório');
      return;
    }
    if (steps.some((s) => !s.fluxo_id)) {
      toast.error('Selecione um fluxo para cada etapa');
      return;
    }

    try {
      await remarketingService.updateSequence(editingSequence.id, {
        name: newSequence.nome,
        description: newSequence.descricao,
        instance_name: newSequence.instance_name, // [NEW]
        steps: steps
      });

      toast.success('Sequência atualizada com sucesso!');
      loadData();
      resetForm();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao atualizar sequência');
    }
  };

  const handleDeleteSequence = async () => {
    if (!selectedSequence) return;
    try {
      await remarketingService.deleteSequence(selectedSequence.id);
      setSequences(sequences.filter((s) => s.id !== selectedSequence.id));
      setIsDeleteOpen(false);
      setSelectedSequence(null);
      toast.success('Sequência excluída com sucesso!');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao excluir sequência');
    }
  };

  const handleToggleStatus = async (sequence: Sequence) => {
    try {
      await remarketingService.toggleSequenceStatus(sequence.id, sequence.status);
      toast.success('Status atualizado');
      loadData();
      // Optimistic update could be done here too
    } catch (error) {
      console.error(error);
      toast.error('Erro ao alterar status');
    }
  };

  const resetForm = () => {
    setNewSequence({ nome: '', descricao: '', instance_name: '' });
    setSteps([{ dias_espera: 0, horas_espera: 1, fluxo_id: '', fluxo_nome: '', ordem: 1 }]);
    setEditingSequence(null);
    setIsCreateOpen(false);
  };

  const getStatusBadge = (status: Sequence['status']) => {
    const config = {
      ativo: {
        className: 'bg-green-500/20 text-green-400 border-green-500/30',
        icon: Play,
        label: 'Ativo',
      },
      inativo: {
        className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
        icon: Pause,
        label: 'Inativo',
      },
      rascunho: {
        className: 'bg-muted text-muted-foreground border-border',
        icon: Edit,
        label: 'Rascunho',
      },
    };
    const { className, icon: Icon, label } = config[status] || config['rascunho'];
    return (
      <Badge variant="outline" className={`gap-1 ${className}`}>
        <Icon className="w-3 h-3" />
        {label}
      </Badge>
    );
  };

  // Stats calculations
  const totalSequences = sequences.length;
  const activeSequences = sequences.filter((s) => s.status === 'ativo').length;
  const totalLeadsVinculados = sequences.reduce((acc, s) => acc + (s.leads_vinculados || 0), 0);
  const totalSteps = sequences.reduce((acc, s) => acc + (s.steps?.length || 0), 0);

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Carregando sequências...</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Remarketing"
        description="Crie sequências automáticas de mensagens com intervalos de dias"
      >
        <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Nova Sequência
        </Button>
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass-effect">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Sequências
            </CardTitle>
            <RefreshCw className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSequences}</div>
          </CardContent>
        </Card>
        <Card className="glass-effect">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sequências Ativas
            </CardTitle>
            <Play className="w-4 h-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">{activeSequences}</div>
          </CardContent>
        </Card>
        <Card className="glass-effect">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Leads Vinculados
            </CardTitle>
            <Users className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLeadsVinculados}</div>
          </CardContent>
        </Card>
        <Card className="glass-effect">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Etapas
            </CardTitle>
            <Workflow className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSteps}</div>
          </CardContent>
        </Card>
      </div>

      {/* Sequences Table */}
      <Card className="glass-effect">
        <CardHeader>
          <CardTitle>Sequências de Remarketing</CardTitle>
          <CardDescription>
            Gerencie suas sequências automáticas de mensagens
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead>Sequência</TableHead>
                <TableHead>Etapas</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Leads</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sequences.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhuma sequência encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                sequences.map((sequence) => (
                  <TableRow key={sequence.id} className="border-border/50">
                    <TableCell>
                      <div>
                        <div className="font-medium">{sequence.name}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-xs">
                          {sequence.description}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 flex-wrap">
                        {sequence.steps && sequence.steps.slice(0, 3).map((step, index) => (
                          <div key={step.id} className="flex items-center">
                            <Badge variant="secondary" className="text-xs">
                              {step.delay_days === 0 && step.delay_hours === 0
                                ? 'Imediato'
                                : step.delay_days > 0 && step.delay_hours > 0
                                  ? `${step.delay_days}d ${step.delay_hours}h`
                                  : step.delay_days > 0
                                    ? `${step.delay_days}d`
                                    : `${step.delay_hours}h`}
                            </Badge>
                            {index < Math.min(sequence.steps.length - 1, 2) && (
                              <ArrowRight className="w-3 h-3 mx-1 text-muted-foreground" />
                            )}
                          </div>
                        ))}
                        {sequence.steps && sequence.steps.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{sequence.steps.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {getStatusBadge(sequence.status)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Users className="w-3 h-3 text-muted-foreground" />
                        <span>{sequence.leads_vinculados || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="w-3 h-3" />
                        {new Date(sequence.created_at).toLocaleDateString('pt-BR')}
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
                          <DropdownMenuItem onClick={() => handleEditSequence(sequence)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleStatus(sequence)}>
                            {sequence.status === 'ativo' ? (
                              <>
                                <Pause className="w-4 h-4 mr-2" />
                                Desativar
                              </>
                            ) : (
                              <>
                                <Play className="w-4 h-4 mr-2" />
                                Ativar
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => {
                              setSelectedSequence(sequence);
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
                )))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Sequence Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsCreateOpen(open); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSequence ? 'Editar Sequência' : 'Nova Sequência de Remarketing'}
            </DialogTitle>
            <DialogDescription>
              Configure uma sequência de mensagens automáticas com intervalos de dias
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome da Sequência</Label>
                <Input
                  id="nome"
                  placeholder="Ex: Sequência de Boas-vindas"
                  value={newSequence.nome}
                  onChange={(e) => setNewSequence({ ...newSequence, nome: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  placeholder="Descreva o objetivo desta sequência..."
                  value={newSequence.descricao}
                  onChange={(e) => setNewSequence({ ...newSequence, descricao: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="instance">Instância do WhatsApp</Label>
                <Select
                  value={newSequence.instance_name}
                  onValueChange={(value) => setNewSequence({ ...newSequence, instance_name: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma instância" />
                  </SelectTrigger>
                  <SelectContent>
                    {instances.length === 0 ? (
                      <SelectItem value="none" disabled>Nenhuma instância conectada</SelectItem>
                    ) : (
                      instances.map((inst) => (
                        <SelectItem key={inst.instance_name} value={inst.instance_name}>
                          {inst.display_name || inst.instance_name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {instances.length === 0 && (
                  <p className="text-xs text-muted-foreground text-yellow-500">
                    Você precisa conectar uma instância no menu "Conexões" para enviar mensagens.
                  </p>
                )}
              </div>
            </div>

            {/* Steps Builder */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Etapas da Sequência</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddStep}>
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar Etapa
                </Button>
              </div>

              <div className="space-y-3">
                {steps.map((step, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-4 rounded-lg border border-border bg-muted/30"
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary font-bold text-sm">
                      {index + 1}
                    </div>

                    <div className="flex-1 space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">
                          {index === 0 ? 'Iniciar após' : 'Aguardar'}
                        </Label>
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <Input
                              type="number"
                              min="0"
                              value={step.dias_espera}
                              onChange={(e) =>
                                handleStepChange(index, 'dias_espera', parseInt(e.target.value) || 0)
                              }
                              className="w-16"
                            />
                            <span className="text-sm text-muted-foreground whitespace-nowrap">dias</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Input
                              type="number"
                              min="0"
                              max="23"
                              value={step.horas_espera}
                              onChange={(e) =>
                                handleStepChange(index, 'horas_espera', parseInt(e.target.value) || 0)
                              }
                              className="w-16"
                            />
                            <span className="text-sm text-muted-foreground whitespace-nowrap">horas</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {index === 0 ? '(após vincular lead)' : '(após etapa anterior)'}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Flow Builder</Label>
                        <Select
                          value={step.fluxo_id}
                          onValueChange={(value) => handleStepChange(index, 'fluxo_id', value)}
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
                    </div>

                    {steps.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleRemoveStep(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {/* Timeline Preview */}
              {steps.length > 0 && steps.some((s) => s.fluxo_id) && (
                <div className="p-4 rounded-lg border border-border bg-muted/20">
                  <Label className="text-xs text-muted-foreground mb-3 block">Prévia da Sequência</Label>
                  <div className="flex items-center flex-wrap gap-2">
                    {steps.map((step, index) => (
                      <div key={index} className="flex items-center">
                        <div className="flex flex-col items-center">
                          <Badge
                            variant={step.fluxo_id ? 'default' : 'outline'}
                            className="whitespace-nowrap"
                          >
                            {step.dias_espera === 0 && step.horas_espera === 0
                              ? 'Imediato'
                              : step.dias_espera > 0 && step.horas_espera > 0
                                ? `${step.dias_espera}d ${step.horas_espera}h`
                                : step.dias_espera > 0
                                  ? `${step.dias_espera}d`
                                  : `${step.horas_espera}h`}
                          </Badge>
                          {step.fluxo_nome && (
                            <span className="text-xs text-muted-foreground mt-1 max-w-[100px] truncate">
                              {step.fluxo_nome}
                            </span>
                          )}
                        </div>
                        {index < steps.length - 1 && (
                          <ArrowRight className="w-4 h-4 mx-2 text-muted-foreground" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>
              Cancelar
            </Button>
            <Button onClick={editingSequence ? handleUpdateSequence : handleCreateSequence}>
              {editingSequence ? 'Atualizar' : 'Criar Sequência'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Sequência</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir a sequência "{selectedSequence?.name}"?
              {selectedSequence && (selectedSequence.leads_vinculados || 0) > 0 && (
                <span className="block mt-2 text-yellow-500">
                  Atenção: {selectedSequence.leads_vinculados} leads estão vinculados a esta sequência.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteSequence}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
