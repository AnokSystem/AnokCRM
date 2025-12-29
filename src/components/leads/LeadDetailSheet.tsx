import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import * as leadService from '@/services/leadService';
import * as remarketingService from '@/services/remarketingService';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from '@/components/ui/dialog';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger
} from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    CheckSquare,
    FileText,
    Paperclip,
    User,
    Plus,
    Trash2,
    Repeat,
    Play,
    StopCircle,
    Clock,
    Save,
    MapPin,
    Building2,
    Calendar,
    CreditCard
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface LeadDetailSheetProps {
    leadId: string | null;
    isOpen: boolean;
    onClose: () => void;
    onLeadUpdated?: () => void;
}

export function LeadDetailSheet({ leadId, isOpen, onClose, onLeadUpdated }: LeadDetailSheetProps) {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('details');
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [lead, setLead] = useState<leadService.Lead | null>(null);

    // CRM Data State
    const [tasks, setTasks] = useState<leadService.LeadTask[]>([]);
    const [orders, setOrders] = useState<leadService.LeadOrder[]>([]);
    const [attachments, setAttachments] = useState<leadService.LeadAttachment[]>([]);

    // Remarketing State
    const [enrollments, setEnrollments] = useState<any[]>([]);
    const [sequences, setSequences] = useState<remarketingService.RemarketingSequence[]>([]);
    const [selectedSequenceId, setSelectedSequenceId] = useState('');

    // Form States
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newOrder, setNewOrder] = useState({ title: '', amount: '', description: '', status: 'pending' as const });
    const [newFile, setNewFile] = useState({ name: '', url: '' });

    // Load Data
    useEffect(() => {
        if (isOpen && leadId && user) {
            loadAllData();
        }
    }, [isOpen, leadId, user]);

    const loadAllData = async () => {
        if (!leadId || !user) return;
        setLoading(true);
        try {
            const [l, t, o, a, e, seq] = await Promise.all([
                leadService.getLeadById(leadId),
                leadService.getLeadTasks(leadId),
                leadService.getLeadOrders(leadId),
                leadService.getLeadAttachments(leadId),
                remarketingService.getEnrollmentsByLead(leadId),
                remarketingService.getSequences(user.id)
            ]);
            setLead(l);
            setTasks(t);
            setOrders(o);
            setAttachments(a);
            setEnrollments(e || []);
            setSequences(seq.filter(s => s.status === 'ativo')); // Only show active sequences
        } catch (error) {
            console.error('Error loading lead data:', error);
            toast.error('Erro ao carregar dados do lead');
        } finally {
            setLoading(false);
        }
    };

    // --- Handlers: Details ---
    const handleUpdateLead = async () => {
        if (!lead || !user) return;
        try {
            await leadService.updateLead(lead.id, {
                name: lead.name,
                phone: lead.phone,
                email: lead.email || undefined,
                company: lead.company || undefined,
                notes: lead.notes || undefined,

                // Profile
                is_person: lead.is_person,
                cpf: lead.cpf || undefined,
                cnpj: lead.cnpj || undefined,
                birth_date: lead.birth_date || undefined,

                // Address
                address_zip: lead.address_zip || undefined,
                address_street: lead.address_street || undefined,
                address_number: lead.address_number || undefined,
                address_district: lead.address_district || undefined,
                address_city: lead.address_city || undefined,
                address_state: lead.address_state || undefined,
            });
            toast.success('Lead atualizado!');
            if (onLeadUpdated) onLeadUpdated();
        } catch (error) {
            toast.error('Erro ao atualizar lead');
        }
    };

    // --- Handlers: Tasks ---
    const handleAddTask = async () => {
        if (!newTaskTitle.trim() || !user || !leadId) return;
        try {
            const task = await leadService.createLeadTask(user.id, leadId, { title: newTaskTitle });
            setTasks([task, ...tasks]);
            setNewTaskTitle('');
            toast.success('Tarefa adicionada');
        } catch (error) {
            toast.error('Erro ao criar tarefa');
        }
    };

    const handleToggleTask = async (task: leadService.LeadTask) => {
        try {
            await leadService.toggleLeadTask(task.id, !task.completed);
            setTasks(tasks.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t));
        } catch (error) {
            toast.error('Erro ao atualizar tarefa');
        }
    };

    const handleDeleteTask = async (taskId: string) => {
        try {
            await leadService.deleteLeadTask(taskId);
            setTasks(tasks.filter(t => t.id !== taskId));
        } catch (error) {
            toast.error('Erro ao excluir tarefa');
        }
    };

    // --- Handlers: Orders ---
    const handleAddOrder = async () => {
        if (!newOrder.title || !user || !leadId) return;
        try {
            const order = await leadService.createLeadOrder(user.id, leadId, {
                title: newOrder.title,
                description: newOrder.description,
                amount: parseFloat(newOrder.amount) || 0,
                status: newOrder.status
            });
            setOrders([order, ...orders]);
            setNewOrder({ title: '', amount: '', description: '', status: 'pending' });
            toast.success('Pedido criado');
        } catch (error) {
            toast.error('Erro ao criar pedido');
        }
    };

    const handleDeleteOrder = async (id: string) => {
        try {
            await leadService.deleteLeadOrder(id);
            setOrders(orders.filter(o => o.id !== id));
        } catch (error) {
            toast.error('Erro ao excluir pedido');
        }
    };

    // --- Handlers: Attachments ---
    const handleAddAttachment = async () => {
        if (!newFile.name || !newFile.url || !user || !leadId) return;
        try {
            const att = await leadService.createLeadAttachment(user.id, leadId, {
                name: newFile.name,
                url: newFile.url,
                type: 'link',
                size: 0
            });
            setAttachments([att, ...attachments]);
            setNewFile({ name: '', url: '' });
            toast.success('Anexo adicionado');
        } catch (error) {
            toast.error('Erro ao adicionar anexo');
        }
    };

    const handleDeleteAttachment = async (id: string) => {
        try {
            await leadService.deleteLeadAttachment(id);
            setAttachments(attachments.filter(a => a.id !== id));
        } catch (error) {
            toast.error('Erro ao excluir anexo');
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0 || !user || !leadId) return;

        const file = e.target.files[0];
        setUploading(true);

        try {
            const timestamp = new Date().getTime();
            const fileExt = file.name.split('.').pop();
            const filePath = `${user.id}/${leadId}/${timestamp}_${file.name}`;

            const { error: uploadError } = await supabase.storage
                .from('lead-attachments')
                .upload(filePath, file);

            if (uploadError) {
                console.error('Upload Error:', uploadError);
                throw uploadError;
            }

            const { data: { publicUrl } } = supabase.storage
                .from('lead-attachments')
                .getPublicUrl(filePath);

            const att = await leadService.createLeadAttachment(user.id, leadId, {
                name: file.name,
                url: publicUrl,
                type: file.type || 'file',
                size: file.size
            });

            setAttachments([att, ...attachments]);
            toast.success('Arquivo enviado com sucesso!');
        } catch (error) {
            console.error('Error uploading file:', error);
            toast.error('Erro ao enviar arquivo.');
        } finally {
            setUploading(false);
        }
    };

    // --- Handlers: Remarketing ---
    const handleEnrollLead = async () => {
        if (!selectedSequenceId || !leadId) return;
        try {
            await remarketingService.enrollLead(leadId, selectedSequenceId);
            toast.success('Lead incluído na sequência!');
            // Reload enrollments
            const e = await remarketingService.getEnrollmentsByLead(leadId);
            setEnrollments(e || []);
            setSelectedSequenceId('');
        } catch (error: any) {
            toast.error(error.message || 'Erro ao incluir lead na sequência');
        }
    };

    const handleCancelEnrollment = async (id: string) => {
        try {
            await remarketingService.cancelEnrollment(id);
            toast.success('Sequência cancelada');
            // Reload
            if (leadId) {
                const e = await remarketingService.getEnrollmentsByLead(leadId);
                setEnrollments(e || []);
            }
        } catch (error) {
            toast.error('Erro ao cancelar sequência');
        }
    };

    // Helper to format custom fields for display
    const renderCustomFields = (fields: any) => {
        if (!fields || Object.keys(fields).length === 0) return null;
        return (
            <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                {Object.entries(fields).map(([key, value]) => (
                    <div key={key} className="bg-muted/50 p-2 rounded">
                        <span className="font-medium capitalize text-muted-foreground block text-xs">{key.replace('_', ' ')}:</span>
                        <span className="truncate block" title={String(value)}>{String(value)}</span>
                    </div>
                ))}
            </div>
        );
    };


    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="p-6 border-b">
                    <DialogTitle>Detalhes do Lead</DialogTitle>
                    <DialogDescription>
                        Gerencie informações, tarefas e propostas para {lead?.name || 'este lead'}.
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                ) : lead ? (
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                        <div className="px-6 pt-4 bg-muted/10 border-b">
                            <TabsList className="grid w-full grid-cols-5">
                                <TabsTrigger value="details"><User className="mr-2 h-4 w-4" /> Info</TabsTrigger>
                                <TabsTrigger value="tasks"><CheckSquare className="mr-2 h-4 w-4" /> Tarefas</TabsTrigger>
                                <TabsTrigger value="orders"><FileText className="mr-2 h-4 w-4" /> Pedidos</TabsTrigger>
                                <TabsTrigger value="files"><Paperclip className="mr-2 h-4 w-4" /> Arquivos</TabsTrigger>
                                <TabsTrigger value="remarketing"><Repeat className="mr-2 h-4 w-4" /> Remarketing</TabsTrigger>
                            </TabsList>
                        </div>

                        <ScrollArea className="flex-1 p-6">

                            {/* DETAILS TAB */}
                            <TabsContent value="details" className="space-y-6 data-[state=inactive]:hidden mt-0">

                                {/* 1. Base Info */}
                                <div className="space-y-4 border rounded-lg p-4 bg-card shadow-sm">
                                    <h3 className="font-semibold flex items-center gap-2">
                                        <User className="w-4 h-4 text-primary" /> Dados Básicos
                                    </h3>
                                    <div className="grid gap-2">
                                        <Label htmlFor="name">Nome Completo</Label>
                                        <Input id="name" value={lead.name} onChange={e => setLead({ ...lead, name: e.target.value })} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="phone">Telefone</Label>
                                            <Input id="phone" value={lead.phone} onChange={e => setLead({ ...lead, phone: e.target.value })} />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="email">Email</Label>
                                            <Input id="email" value={lead.email || ''} onChange={e => setLead({ ...lead, email: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="company">Empresa / Organização</Label>
                                        <Input id="company" value={lead.company || ''} onChange={e => setLead({ ...lead, company: e.target.value })} placeholder="Nome da empresa (opcional)" />
                                    </div>
                                </div>

                                {/* 2. Profile (PF/PJ) */}
                                <div className="space-y-4 border rounded-lg p-4 bg-card shadow-sm">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-semibold flex items-center gap-2">
                                            <CreditCard className="w-4 h-4 text-primary" /> Perfil & Documento
                                        </h3>
                                        <div className="flex items-center space-x-2">
                                            <Button
                                                variant={lead.is_person ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => setLead({ ...lead, is_person: true })}
                                                className="h-7 text-xs"
                                            >
                                                Pessoa Física
                                            </Button>
                                            <Button
                                                variant={!lead.is_person ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => setLead({ ...lead, is_person: false })}
                                                className="h-7 text-xs"
                                            >
                                                Pessoa Jurídica
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label>{lead.is_person ? 'CPF' : 'CNPJ'}</Label>
                                            <Input
                                                value={lead.is_person ? (lead.cpf || '') : (lead.cnpj || '')}
                                                onChange={e => lead.is_person ?
                                                    setLead({ ...lead, cpf: e.target.value }) :
                                                    setLead({ ...lead, cnpj: e.target.value })
                                                }
                                                placeholder={lead.is_person ? '000.000.000-00' : '00.000.000/0001-00'}
                                            />
                                        </div>
                                        {lead.is_person && (
                                            <div className="grid gap-2">
                                                <Label>Data de Nascimento</Label>
                                                <Input
                                                    type="date"
                                                    value={lead.birth_date || ''}
                                                    onChange={e => setLead({ ...lead, birth_date: e.target.value })}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* 3. Address */}
                                <div className="space-y-4 border rounded-lg p-4 bg-card shadow-sm">
                                    <h3 className="font-semibold flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-primary" /> Endereço
                                    </h3>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="col-span-1 grid gap-2">
                                            <Label>CEP</Label>
                                            <Input value={lead.address_zip || ''} onChange={e => setLead({ ...lead, address_zip: e.target.value })} placeholder="00000-000" />
                                        </div>
                                        <div className="col-span-2 grid gap-2">
                                            <Label>Rua / Logradouro</Label>
                                            <Input value={lead.address_street || ''} onChange={e => setLead({ ...lead, address_street: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="col-span-1 grid gap-2">
                                            <Label>Número</Label>
                                            <Input value={lead.address_number || ''} onChange={e => setLead({ ...lead, address_number: e.target.value })} />
                                        </div>
                                        <div className="col-span-2 grid gap-2">
                                            <Label>Bairro</Label>
                                            <Input value={lead.address_district || ''} onChange={e => setLead({ ...lead, address_district: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="col-span-2 grid gap-2">
                                            <Label>Cidade</Label>
                                            <Input value={lead.address_city || ''} onChange={e => setLead({ ...lead, address_city: e.target.value })} />
                                        </div>
                                        <div className="col-span-1 grid gap-2">
                                            <Label>Estado (UF)</Label>
                                            <Input value={lead.address_state || ''} onChange={e => setLead({ ...lead, address_state: e.target.value })} maxLength={2} placeholder="UF" />
                                        </div>
                                    </div>
                                </div>

                                {/* 4. Notes & Integration */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2 border rounded-lg p-4 bg-card shadow-sm">
                                        <Label htmlFor="notes">Anotações Internas</Label>
                                        <Textarea
                                            id="notes"
                                            className="min-h-[120px]"
                                            value={lead.notes || ''}
                                            onChange={e => setLead({ ...lead, notes: e.target.value })}
                                            placeholder="Observações sobre o cliente..."
                                        />
                                    </div>

                                    {/* Integration / Custom Fields */}
                                    <div className="space-y-2 border rounded-lg p-4 bg-muted/20">
                                        <h3 className="font-semibold text-sm mb-2">Origem & Integração</h3>
                                        <div className="text-sm space-y-1">
                                            <div className="flex justify-between border-b pb-1">
                                                <span className="text-muted-foreground">Fonte:</span>
                                                <span className="font-medium capitalize">{lead.source || 'Manual'}</span>
                                            </div>
                                            <div className="flex justify-between border-b pb-1">
                                                <span className="text-muted-foreground">Cadastrado em:</span>
                                                <span>{format(new Date(lead.created_at), 'dd/MM/yyyy HH:mm')}</span>
                                            </div>
                                        </div>

                                        {lead.custom_fields && Object.keys(lead.custom_fields).length > 0 && (
                                            <div className="mt-3">
                                                <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Dados da Integração</p>
                                                {renderCustomFields(lead.custom_fields)}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <Button onClick={handleUpdateLead} className="w-full h-12 text-lg">
                                    <Save className="mr-2 h-5 w-5" /> Salvar Alterações
                                </Button>
                            </TabsContent>

                            {/* TASKS TAB */}
                            <TabsContent value="tasks" className="space-y-4 data-[state=inactive]:hidden mt-0">
                                <div className="flex gap-2 mb-4">
                                    <Input
                                        placeholder="Nova tarefa..."
                                        value={newTaskTitle}
                                        onChange={e => setNewTaskTitle(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleAddTask()}
                                    />
                                    <Button size="icon" onClick={handleAddTask}><Plus className="h-4 w-4" /></Button>
                                </div>

                                <div className="space-y-2">
                                    {tasks.length === 0 && <p className="text-center text-muted-foreground py-4">Nenhuma tarefa.</p>}
                                    {tasks.map(task => (
                                        <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-muted/50 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => handleToggleTask(task)}
                                                    className={cn(
                                                        "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                                                        task.completed ? "bg-green-500 border-green-500 text-white" : "border-muted-foreground"
                                                    )}
                                                >
                                                    {task.completed && <CheckSquare className="h-3.5 w-3.5" />}
                                                </button>
                                                <span className={cn(task.completed && "line-through text-muted-foreground")}>{task.title}</span>
                                            </div>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteTask(task.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </TabsContent>

                            {/* ORDERS TAB */}
                            <TabsContent value="orders" className="space-y-4 data-[state=inactive]:hidden mt-0">
                                {/* Only displaying orders, creation is done via Orders page */}

                                <div className="space-y-3">
                                    {orders.length === 0 && <p className="text-center text-muted-foreground py-4">Nenhum pedido.</p>}
                                    {orders.map(order => (
                                        <div key={order.id} className="border rounded-lg p-4 bg-card shadow-sm">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <h4 className="font-semibold">{order.title}</h4>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-green-600 font-bold">R$ {order.amount?.toFixed(2)}</span>
                                                        <span className={cn(
                                                            "text-xs px-2 py-0.5 rounded-full font-medium capitalize",
                                                            (order.status === 'pago' || order.status === 'completed') ? "bg-green-100 text-green-800" :
                                                                (order.status === 'cancelled' || order.status === 'atrasado') ? "bg-red-100 text-red-800" :
                                                                    (order.status === 'orcamento') ? "bg-blue-100 text-blue-800" :
                                                                        "bg-yellow-100 text-yellow-800"
                                                        )}>
                                                            {order.status === 'pago' ? 'Pago' :
                                                                order.status === 'completed' ? 'Concluído' :
                                                                    order.status === 'cancelled' ? 'Cancelado' :
                                                                        order.status === 'atrasado' ? 'Atrasado' :
                                                                            order.status === 'orcamento' ? 'Orçamento' :
                                                                                order.status === 'aguardando_pagamento' ? 'Aguardando Pag.' :
                                                                                    'Pendente'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteOrder(order.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            <p className="text-sm text-muted-foreground line-clamp-2">{order.description}</p>
                                        </div>
                                    ))}
                                </div>
                            </TabsContent>

                            {/* FILES TAB */}
                            <TabsContent value="files" className="space-y-4 data-[state=inactive]:hidden mt-0">
                                <div className="border rounded-lg p-4 bg-muted/20 space-y-3 mb-6">
                                    <h4 className="font-medium text-sm">Anexar Arquivo (Link)</h4>
                                    <Input
                                        placeholder="Nome do arquivo"
                                        value={newFile.name}
                                        onChange={e => setNewFile({ ...newFile, name: e.target.value })}
                                    />
                                    <Input
                                        placeholder="URL (https://...)"
                                        value={newFile.url}
                                        onChange={e => setNewFile({ ...newFile, url: e.target.value })}
                                    />
                                    <Button onClick={handleAddAttachment} className="w-full" variant="secondary">Adicionar Link</Button>

                                    <div className="relative">
                                        <div className="absolute inset-0 flex items-center">
                                            <span className="w-full border-t" />
                                        </div>
                                        <div className="relative flex justify-center text-xs uppercase">
                                            <span className="bg-background px-2 text-muted-foreground">Ou envie um arquivo</span>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <Label htmlFor="file-upload" className="cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 w-full">
                                            {uploading ? 'Enviando...' : 'Carregar Arquivo'}
                                            <Input
                                                id="file-upload"
                                                type="file"
                                                className="hidden"
                                                onChange={handleFileUpload}
                                                disabled={uploading}
                                            />
                                        </Label>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    {attachments.length === 0 && <p className="text-center text-muted-foreground py-4">Nenhum anexo.</p>}
                                    {attachments.map(att => (
                                        <div key={att.id} className="flex items-center justify-between p-3 border rounded-lg bg-card">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className="bg-primary/10 p-2 rounded">
                                                    <Paperclip className="h-4 w-4 text-primary" />
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <a href={att.file_url} target="_blank" rel="noreferrer" className="font-medium hover:underline truncate block">
                                                        {att.file_name}
                                                    </a>
                                                    <span className="text-xs text-muted-foreground">{format(new Date(att.created_at), 'dd/MM/yyyy')}</span>
                                                </div>
                                            </div>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive flex-shrink-0" onClick={() => handleDeleteAttachment(att.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </TabsContent>

                            {/* REMARKETING TAB */}
                            <TabsContent value="remarketing" className="space-y-6 data-[state=inactive]:hidden mt-0">
                                {/* Enrollment Form */}
                                <div className="border rounded-lg p-4 bg-muted/20 space-y-3">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Play className="h-4 w-4 text-primary" />
                                        <h4 className="font-semibold text-sm">Iniciar Nova Sequência</h4>
                                    </div>
                                    <div className="flex gap-2">
                                        <Select value={selectedSequenceId} onValueChange={setSelectedSequenceId}>
                                            <SelectTrigger className="flex-1 bg-background">
                                                <SelectValue placeholder="Selecione uma sequência..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {sequences.map(seq => (
                                                    <SelectItem key={seq.id} value={seq.id}>
                                                        {seq.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Button onClick={handleEnrollLead} disabled={!selectedSequenceId}>
                                            <Plus className="h-4 w-4 mr-1" />
                                            Adicionar
                                        </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        O lead começará a receber mensagens conforme os intervalos configurados na sequência.
                                    </p>
                                </div>

                                {/* Active & Past Enrollments */}
                                <div className="space-y-4">
                                    <h4 className="font-medium text-sm flex items-center gap-2">
                                        <Repeat className="h-4 w-4" />
                                        Histórico de Sequências
                                    </h4>

                                    {enrollments.length === 0 ? (
                                        <div className="text-center text-muted-foreground py-8 border rounded-lg border-dashed">
                                            Este lead não está em nenhuma sequência.
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {enrollments.map((enr) => (
                                                <div key={enr.id} className="border rounded-lg p-4 bg-card shadow-sm">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="font-semibold">{enr.sequences?.name || 'Sequência Desconhecida'}</span>
                                                                <Badge variant={
                                                                    enr.status === 'active' ? 'default' :
                                                                        enr.status === 'completed' ? 'secondary' : 'destructive'
                                                                } className="text-[10px] h-5 px-1.5 uppercase">
                                                                    {enr.status === 'active' ? 'Em andamento' :
                                                                        enr.status === 'completed' ? 'Concluído' : 'Cancelado'}
                                                                </Badge>
                                                            </div>
                                                            <div className="text-sm text-muted-foreground flex items-center gap-3">
                                                                <span>Passo atual: {enr.current_step_order}</span>
                                                                {enr.status === 'active' && enr.next_execution_at && (
                                                                    <span className="flex items-center gap-1 text-xs bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full">
                                                                        <Clock className="w-3 h-3" />
                                                                        Próximo envio: {format(new Date(enr.next_execution_at), 'dd/MM/yyyy HH:mm')}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {enr.status === 'active' && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                                onClick={() => handleCancelEnrollment(enr.id)}
                                                                title="Cancelar e parar envios"
                                                            >
                                                                <StopCircle className="h-4 w-4 mr-1" />
                                                                Parar
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </TabsContent>

                        </ScrollArea>
                    </Tabs>
                ) : null}
            </DialogContent>
        </Dialog>
    );
}
