import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Play,
  Copy,
  Eye,
  Workflow,
  Calendar,
  MessageSquare,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import * as flowService from '@/services/flowService';

type Flow = flowService.Flow;

export default function SavedFlows() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [flows, setFlows] = useState<flowService.Flow[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedFlow, setSelectedFlow] = useState<flowService.Flow | null>(null);
  const [newFlow, setNewFlow] = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadFlows();
    }
  }, [user]);

  const loadFlows = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const data = await flowService.getFlows(user.id);
      setFlows(data);
    } catch (error) {
      toast.error('Erro ao carregar fluxos');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFlow = async () => {
    if (!newFlow.name.trim()) {
      toast.error('Nome do fluxo é obrigatório');
      return;
    }

    if (!user) return;

    try {
      const created = await flowService.createFlow(user.id, {
        name: newFlow.name,
        description: newFlow.description,
        status: 'rascunho'
      });

      if (created) {
        setFlows([created, ...flows]);
        setNewFlow({ name: '', description: '' });
        setIsCreateOpen(false);
        toast.success('Fluxo criado com sucesso!');
        navigate(`/flows?id=${created.id}`);
      }
    } catch (error) {
      toast.error('Erro ao criar fluxo');
    }
  };

  const handleDeleteFlow = async () => {
    if (!selectedFlow) return;
    try {
      await flowService.deleteFlow(selectedFlow.id);
      setFlows(flows.filter((f) => f.id !== selectedFlow.id));
      setIsDeleteOpen(false);
      setSelectedFlow(null);
      toast.success('Fluxo excluído com sucesso!');
    } catch (error) {
      toast.error('Erro ao excluir fluxo');
    }
  };

  const handleDuplicateFlow = (flow: Flow) => {
    const duplicated: Flow = {
      ...flow,
      id: String(Date.now()),
      name: `${flow.name} (Cópia)`,
      status: 'rascunho',
      created_at: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString().split('T')[0],
    };
    setFlows([duplicated, ...flows]);
    toast.success('Fluxo duplicado com sucesso!');
  };

  const handleToggleStatus = async (flow: Flow) => {
    const newStatus = flow.status === 'ativo' ? 'inativo' : 'ativo';

    // Optimistic update
    setFlows(
      flows.map((f) =>
        f.id === flow.id ? { ...f, status: newStatus } : f
      )
    );

    try {
      await flowService.updateFlow(flow.id, { status: newStatus });
      toast.success(`Fluxo ${newStatus === 'ativo' ? 'ativado' : 'desativado'}!`);
    } catch (error) {
      // Revert on error
      setFlows(
        flows.map((f) =>
          f.id === flow.id ? { ...f, status: flow.status } : f
        )
      );
      toast.error('Erro ao atualizar status do fluxo');
    }
  };

  const getStatusBadge = (status: Flow['status']) => {
    const variants = {
      ativo: 'bg-green-500/20 text-green-400 border-green-500/30',
      inativo: 'bg-red-500/20 text-red-400 border-red-500/30',
      rascunho: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    };
    const labels = {
      ativo: 'Ativo',
      inativo: 'Inativo',
      rascunho: 'Rascunho',
    };
    return (
      <Badge variant="outline" className={variants[status]}>
        {labels[status]}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fluxos Salvos"
        description="Gerencie seus fluxos de automação de mensagens"
      >

      </PageHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-effect">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Fluxos
            </CardTitle>
            <Workflow className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{flows.length}</div>
          </CardContent>
        </Card>
        <Card className="glass-effect">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Fluxos Ativos
            </CardTitle>
            <Play className="w-4 h-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">
              {flows.filter((f) => f.status === 'ativo').length}
            </div>
          </CardContent>
        </Card>
        <Card className="glass-effect">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Nós
            </CardTitle>
            <MessageSquare className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {flows.reduce((acc, f) => acc + f.nodes_count, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Flows Table */}
      <Card className="glass-effect">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead>Nome</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-center">Nós</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead>Atualizado</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {flows.map((flow) => (
                <TableRow key={flow.id} className="border-border/50">
                  <TableCell className="font-medium">{flow.name}</TableCell>
                  <TableCell className="text-muted-foreground max-w-xs truncate">
                    {flow.description}
                  </TableCell>
                  <TableCell className="text-center">{flow.nodes_count}</TableCell>
                  <TableCell className="text-center">
                    {getStatusBadge(flow.status)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {flow.updated_at}
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
                        <DropdownMenuItem
                          onClick={() => navigate(`/flows?id=${flow.id}`)}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => navigate(`/flows?id=${flow.id}&view=true`)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Visualizar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleToggleStatus(flow)}
                        >
                          <Play className="w-4 h-4 mr-2" />
                          {flow.status === 'ativo' ? 'Desativar' : 'Ativar'}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDuplicateFlow(flow)}
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Duplicar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => {
                            setSelectedFlow(flow);
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
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Flow Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Fluxo</DialogTitle>
            <DialogDescription>
              Crie um novo fluxo de automação de mensagens
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome do Fluxo</Label>
              <Input
                id="nome"
                placeholder="Ex: Boas-vindas Novos Leads"
                value={newFlow.name}
                onChange={(e) =>
                  setNewFlow({ ...newFlow, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                placeholder="Descreva o objetivo deste fluxo..."
                value={newFlow.description}
                onChange={(e) =>
                  setNewFlow({ ...newFlow, description: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateFlow}>Criar e Editar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Fluxo</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o fluxo "{selectedFlow?.name}"?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteFlow}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
