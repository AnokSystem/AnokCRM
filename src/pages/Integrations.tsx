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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
    Plug,
    Plus,
    Copy,
    Trash2,
    Pencil,
    CheckCircle,
    AlertCircle,
    ExternalLink,
    Settings2,
    MessageSquare,
    Repeat,
    FolderKanban
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import * as flowService from '@/services/flowService';

interface Integration {
    id: string;
    name: string;
    platform: 'hotmart' | 'braip' | 'kiwify';
    event_type: string;
    flow_id: string | null;
    instance_name: string | null;
    remarketing_sequence_id: string | null;
    default_category_id: string | null;
    is_active: boolean;
    created_at: string;
    flow?: { name: string };
    remarketing_sequence?: { name: string };
}

export default function Integrations() {
    const { user } = useAuth();
    const [integrations, setIntegrations] = useState<Integration[]>([]);
    const [flows, setFlows] = useState<{ id: string; name: string }[]>([]);
    const [instances, setInstances] = useState<{ instance_name: string; display_name: string }[]>([]);
    const [remarketingSequences, setRemarketingSequences] = useState<{ id: string; name: string }[]>([]);
    const [kanbanColumns, setKanbanColumns] = useState<{ column_id: string; label: string }[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);

    const [newInt, setNewInt] = useState({
        name: '',
        platform: 'hotmart',
        event_type: 'PURCHASE_APPROVED',
        flow_id: 'none',
        instance_name: 'none',
        remarketing_sequence_id: 'none',
        default_category_id: 'none'
    });

    const BASE_WEBHOOK_URL = import.meta.env.VITE_API_URL || "https://crm-teste.anok.com.br";

    useEffect(() => {
        if (user) loadData();
    }, [user]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('integrations')
                .select(`
            *,
            flow:flows(name),
            remarketing_sequence:remarketing_sequences(name)
        `)
                .eq('user_id', user?.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setIntegrations(data || []);

            const fetchedFlows = await flowService.getFlows(user!.id);
            setFlows(fetchedFlows);

            const { data: instData } = await supabase
                .from('whatsapp_instances')
                .select('instance_name, display_name')
                .eq('user_id', user?.id);
            setInstances(instData || []);

            // Load remarketing sequences
            const { data: remarketingData } = await supabase
                .from('remarketing_sequences')
                .select('id, name')
                .eq('user_id', user?.id)
                .eq('status', 'ativo')
                .order('name');
            setRemarketingSequences(remarketingData || []);

            // Load kanban columns (from default workspace)
            const { data: workspaces } = await supabase
                .from('workspaces')
                .select('id')
                .eq('user_id', user?.id)
                .order('is_default', { ascending: false })
                .limit(1);

            if (workspaces && workspaces.length > 0) {
                const { data: columnsData } = await supabase
                    .from('kanban_columns')
                    .select('column_id, label')
                    .eq('workspace_id', workspaces[0].id)
                    .order('position');
                setKanbanColumns(columnsData || []);
            }

        } catch (error) {
            console.error(error);
            toast.error('Erro ao carregar integrações');
        } finally {
            setIsLoading(false);
        }
    };

    const [editingId, setEditingId] = useState<string | null>(null);

    const handleSave = async () => {
        if (!newInt.name) return toast.error('Nome é obrigatório');
        if (newInt.instance_name === 'none') return toast.error('Selecione uma instância para envio');

        try {
            if (editingId) {
                // Update existing
                const { error } = await supabase
                    .from('integrations')
                    .update({
                        name: newInt.name,
                        platform: newInt.platform,
                        event_type: newInt.event_type,
                        flow_id: newInt.flow_id === 'none' ? null : newInt.flow_id,
                        instance_name: newInt.instance_name,
                        remarketing_sequence_id: newInt.remarketing_sequence_id === 'none' ? null : newInt.remarketing_sequence_id,
                        default_category_id: newInt.default_category_id === 'none' ? null : newInt.default_category_id,
                    })
                    .eq('id', editingId);

                if (error) throw error;
                toast.success('Integração atualizada!');
            } else {
                // Create new
                const { error } = await supabase.from('integrations').insert({
                    user_id: user?.id,
                    name: newInt.name,
                    platform: newInt.platform,
                    event_type: newInt.event_type,
                    flow_id: newInt.flow_id === 'none' ? null : newInt.flow_id,
                    instance_name: newInt.instance_name,
                    remarketing_sequence_id: newInt.remarketing_sequence_id === 'none' ? null : newInt.remarketing_sequence_id,
                    default_category_id: newInt.default_category_id === 'none' ? null : newInt.default_category_id,
                    is_active: true
                });

                if (error) throw error;
                toast.success('Integração criada!');
            }

            setIsCreateOpen(false);
            resetForm();
            loadData();
        } catch (error) {
            console.error(error);
            toast.error(editingId ? 'Erro ao atualizar' : 'Erro ao criar');
        }
    };

    const resetForm = () => {
        setNewInt({
            name: '',
            platform: 'hotmart',
            event_type: 'PURCHASE_APPROVED',
            flow_id: 'none',
            instance_name: 'none',
            remarketing_sequence_id: 'none',
            default_category_id: 'none'
        });
        setEditingId(null);
    };

    const handleEditStart = (int: Integration) => {
        setNewInt({
            name: int.name,
            platform: int.platform,
            event_type: int.event_type,
            flow_id: int.flow_id || 'none',
            instance_name: int.instance_name || 'none',
            remarketing_sequence_id: int.remarketing_sequence_id || 'none',
            default_category_id: int.default_category_id || 'none'
        });
        setEditingId(int.id);
        setIsCreateOpen(true);
    };

    const handleDelete = async () => {
        if (!selectedIntegration) return;
        try {
            const { error } = await supabase.from('integrations').delete().eq('id', selectedIntegration.id);
            if (error) throw error;
            toast.success('Integração excluída');
            loadData();
            setIsDeleteOpen(false);
        } catch (error) {
            console.error(error);
            toast.error('Erro ao excluir');
        }
    };

    const copyWebhookUrl = (id: string) => {
        const url = `${BASE_WEBHOOK_URL}/webhook/integration?id=${id}`;
        navigator.clipboard.writeText(url);
        toast.success('Link do Webhook copiado!');
    };

    // Helper to get friendly instance name
    const getInstanceName = (machineName: string | null) => {
        if (!machineName) return '-';
        const found = instances.find(i => i.instance_name === machineName);
        return found ? (found.display_name || found.instance_name) : machineName;
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Integrações de Venda"
                description="Conecte Hotmart, Braip ou Kiwify para receber vendas e disparar fluxos."
            >
                <Button onClick={() => { resetForm(); setIsCreateOpen(true); }} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Nova Integração
                </Button>
            </PageHeader>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="glass-effect">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Plataformas Suportadas</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-2">
                            <Badge variant="secondary">Hotmart</Badge>
                            <Badge variant="secondary">Braip</Badge>
                            <Badge variant="secondary">Kiwify</Badge>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="glass-effect">
                <CardHeader>
                    <CardTitle>Suas Integrações</CardTitle>
                    <CardDescription>
                        Copie o URL e configure na plataforma de vendas.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-border/50 hover:bg-transparent">
                                <TableHead>Nome</TableHead>
                                <TableHead>Plataforma</TableHead>
                                <TableHead>Evento</TableHead>
                                <TableHead>Instância</TableHead>
                                <TableHead>Automação</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {integrations.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                        Nenhuma integração criada.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                integrations.map((int) => (
                                    <TableRow key={int.id} className="border-border/50">
                                        <TableCell className="font-medium">{int.name}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="capitalize">{int.platform}</Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">{int.event_type}</TableCell>
                                        <TableCell className="text-sm">
                                            {getInstanceName(int.instance_name)}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1.5">
                                                {int.flow && (
                                                    <Badge variant="outline" className="text-xs gap-1 bg-blue-500/10 text-blue-600 border-blue-500/20">
                                                        <ExternalLink className="w-3 h-3" />
                                                        {int.flow.name}
                                                    </Badge>
                                                )}
                                                {int.remarketing_sequence && (
                                                    <Badge variant="outline" className="text-xs gap-1 bg-purple-500/10 text-purple-600 border-purple-500/20">
                                                        <Repeat className="w-3 h-3" />
                                                        {int.remarketing_sequence.name}
                                                    </Badge>
                                                )}
                                                {int.default_category_id && (
                                                    <Badge variant="outline" className="text-xs gap-1 bg-green-500/10 text-green-600 border-green-500/20">
                                                        <FolderKanban className="w-3 h-3" />
                                                        Categoria
                                                    </Badge>
                                                )}
                                                {!int.flow && !int.remarketing_sequence && !int.default_category_id && (
                                                    <span className="text-xs text-muted-foreground">-</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {int.is_active ? (
                                                <Badge variant="default" className="bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20">Ativo</Badge>
                                            ) : (
                                                <Badge variant="secondary">Inativo</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="outline" size="sm" onClick={() => copyWebhookUrl(int.id)} title="Copiar URL">
                                                    <Copy className="w-4 h-4 mr-2" />
                                                    URL
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleEditStart(int)} title="Editar">
                                                    <Pencil className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-destructive hover:text-destructive"
                                                    onClick={() => { setSelectedIntegration(int); setIsDeleteOpen(true); }}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) resetForm(); }}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Plug className="w-5 h-5 text-primary" />
                            {editingId ? 'Editar Integração' : 'Nova Integração'}
                        </DialogTitle>
                        <DialogDescription>
                            {editingId
                                ? 'Atualize as configurações da integração. O link do webhook permanecerá o mesmo.'
                                : 'Gere um link único para receber dados de uma plataforma.'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        {/* Informações Básicas */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-sm font-semibold text-foreground/90">
                                <Settings2 className="w-4 h-4 text-primary" />
                                <span>Informações Básicas</span>
                            </div>

                            <div className="space-y-4 pl-6">
                                <div className="space-y-2">
                                    <Label>Nome da Integração</Label>
                                    <Input
                                        placeholder="Ex: Venda Ebook Hotmart"
                                        value={newInt.name}
                                        onChange={e => setNewInt({ ...newInt, name: e.target.value })}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Plataforma</Label>
                                        <Select value={newInt.platform} onValueChange={(v: any) => setNewInt({ ...newInt, platform: v })}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="hotmart">Hotmart</SelectItem>
                                                <SelectItem value="braip">Braip</SelectItem>
                                                <SelectItem value="kiwify">Kiwify</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Evento (Filtro)</Label>
                                        <Select value={newInt.event_type} onValueChange={(v) => setNewInt({ ...newInt, event_type: v })}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="PURCHASE_APPROVED">Compra Aprovada</SelectItem>
                                                <SelectItem value="PENDING_PAYMENT">Aguardando Pagamento</SelectItem>
                                                <SelectItem value="CART_ABANDONED">Carrinho Abandonado</SelectItem>
                                                <SelectItem value="REFUNDED">Reembolso</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Configuração de Envio */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-sm font-semibold text-foreground/90">
                                <MessageSquare className="w-4 h-4 text-primary" />
                                <span>Configuração de Envio</span>
                            </div>

                            <div className="space-y-4 pl-6">
                                <div className="space-y-2">
                                    <Label>Instância de Envio (WhatsApp)</Label>
                                    <Select value={newInt.instance_name} onValueChange={(v) => setNewInt({ ...newInt, instance_name: v })}>
                                        <SelectTrigger><SelectValue placeholder="Selecione uma instância..." /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none" disabled>Selecione...</SelectItem>
                                            {instances.map(inst => (
                                                <SelectItem key={inst.instance_name} value={inst.instance_name}>
                                                    {inst.display_name || inst.instance_name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Disparar Fluxo (Opcional)</Label>
                                    <Select value={newInt.flow_id} onValueChange={(v) => setNewInt({ ...newInt, flow_id: v })}>
                                        <SelectTrigger><SelectValue placeholder="Selecione um fluxo..." /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">Nenhum</SelectItem>
                                            {flows.map(f => (
                                                <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">
                                        Assim que o evento chegar, o lead será cadastrado e este fluxo será iniciado.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Automação Avançada */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-sm font-semibold text-foreground/90">
                                <Repeat className="w-4 h-4 text-primary" />
                                <span>Automação Avançada</span>
                            </div>

                            <div className="space-y-4 pl-6">
                                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-4">
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2">
                                            <Repeat className="w-3.5 h-3.5" />
                                            Remarketing Automático
                                        </Label>
                                        <Select value={newInt.remarketing_sequence_id} onValueChange={(v) => setNewInt({ ...newInt, remarketing_sequence_id: v })}>
                                            <SelectTrigger><SelectValue placeholder="Selecione uma sequência..." /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Nenhum</SelectItem>
                                                {remarketingSequences.map(seq => (
                                                    <SelectItem key={seq.id} value={seq.id}>{seq.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <p className="text-xs text-muted-foreground">
                                            Lead será automaticamente inscrito nesta sequência de remarketing.
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2">
                                            <FolderKanban className="w-3.5 h-3.5" />
                                            Categoria Padrão
                                        </Label>
                                        <Select value={newInt.default_category_id} onValueChange={(v) => setNewInt({ ...newInt, default_category_id: v })}>
                                            <SelectTrigger><SelectValue placeholder="Usar padrão do sistema..." /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Padrão do Sistema</SelectItem>
                                                {kanbanColumns.map(col => (
                                                    <SelectItem key={col.column_id} value={col.column_id}>{col.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <p className="text-xs text-muted-foreground">
                                            Lead será adicionado nesta coluna do Kanban. Se não definido, usa a coluna padrão.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Informação Importante */}
                        <div className="bg-muted/50 p-4 rounded-lg flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                            <div className="text-xs text-muted-foreground">
                                {editingId
                                    ? <span>O link (URL) desta integração <strong>não será alterado</strong>, então você não precisa reconfigurar na plataforma de vendas.</span>
                                    : <span>Ao criar, você receberá um <strong>URL Único</strong>. Configure este URL nas configurações de Webhook da sua plataforma (Hotmart/Braip/etc).</span>
                                }
                            </div>
                        </div>

                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSave}>{editingId ? 'Salvar Alterações' : 'Criar Integração'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Excluir Integração?</DialogTitle>
                        <DialogDescription>
                            O link <strong>parará de funcionar imediatamente</strong> na plataforma de vendas.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancelar</Button>
                        <Button variant="destructive" onClick={handleDelete}>Excluir</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
