
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, Profile, Plan } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Users, Package, Settings, Trash2, Edit, Shield } from 'lucide-react';
import { adminService } from '@/services/adminService';
import * as campaignService from '@/services/campaignService';

const AVAILABLE_FEATURES = [
  { id: 'live_chat', label: 'Chat ao Vivo' },
  { id: 'leads', label: 'Gestão de Leads' },
  { id: 'flows', label: 'Fluxos de Automação' },
  { id: 'remarketing', label: 'Remarketing' },
  { id: 'campaigns', label: 'Campanhas' },
  { id: 'products', label: 'Produtos' },
  { id: 'suppliers', label: 'Fornecedores' },
  { id: 'orders', label: 'Pedidos' },
  { id: 'integrations', label: 'Integrações' },
  { id: 'financeiro', label: 'Financeiro' },
  { id: 'reports', label: 'Relatórios' },
];

interface UserWithPlan extends Profile {
  status?: 'active' | 'suspended' | 'inactive';
  user_plans?: { plan_id: string; active_features: string[]; max_instances?: number }[];
  user_roles?: { role: string }[];
}

export default function Admin() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [users, setUsers] = useState<UserWithPlan[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  // Settings State
  const [webhookUrl, setWebhookUrl] = useState('');
  const [billsWebhookUrl, setBillsWebhookUrl] = useState('');

  // Create User State
  const [newUserDialogOpen, setNewUserDialogOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');

  // Plan form state
  const [planName, setPlanName] = useState('');
  const [planDescription, setPlanDescription] = useState('');
  const [planPrice, setPlanPrice] = useState('');
  const [planFeatures, setPlanFeatures] = useState<string[]>([]);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [planDialogOpen, setPlanDialogOpen] = useState(false);

  // User features dialog
  const [selectedUser, setSelectedUser] = useState<UserWithPlan | null>(null);
  const [userFeatures, setUserFeatures] = useState<string[]>([]);
  const [editingUserPlanId, setEditingUserPlanId] = useState<string>('');
  const [maxInstances, setMaxInstances] = useState<number>(1);
  const [userDialogOpen, setUserDialogOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    } else if (!authLoading && user && !isAdmin) {
      const timer = setTimeout(() => {
        if (!isAdmin) {
          toast({ title: 'Acesso negado', description: 'Você não tem permissão de administrador.', variant: 'destructive' });
          navigate('/');
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [user, isAdmin, authLoading, navigate, toast]);

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadUsers(), loadPlans(), loadSettings()]);
    setLoading(false);
  };

  const loadSettings = async () => {
    const url = await adminService.getGlobalSetting('campaign_webhook_url');
    if (url) setWebhookUrl(url);

    const billsUrl = await adminService.getGlobalSetting('bills_notification_webhook_url');
    if (billsUrl) setBillsWebhookUrl(billsUrl);
  };

  const handleSaveSettings = async () => {
    if (!user) return;
    try {
      await adminService.setGlobalSetting('campaign_webhook_url', webhookUrl, user.id);
      await adminService.setGlobalSetting('bills_notification_webhook_url', billsWebhookUrl, user.id);
      toast({ title: 'Configurações salvas com sucesso!' });
    } catch (error) {
      toast({ title: 'Erro ao salvar configurações', variant: 'destructive' });
    }
  };

  const handleTestWebhook = async () => {
    if (!user) return;
    if (!webhookUrl) {
      toast({ title: 'Configure uma URL antes de testar', variant: 'destructive' });
      return;
    }

    // Save first to ensure consistency
    await handleSaveSettings();

    toast({ title: 'Enviando disparo de teste...' });

    try {
      const result = await campaignService.triggerWebhook('test', user.id);

      if (result && result.success) {
        toast({ title: 'Sucesso! Webhook recebeu o disparo.' });
      } else {
        toast({
          title: 'Falha no disparo',
          description: result?.error || 'Verifique o console e a URL.',
          variant: 'destructive'
        });
      }
    } catch (err: any) {
      toast({ title: 'Erro ao executar teste', description: err.message, variant: 'destructive' });
    }
  };

  const handleTestBillsWebhook = async () => {
    if (!user) return;
    if (!billsWebhookUrl) {
      toast({ title: 'Configure a URL do webhook de notificações antes de testar', variant: 'destructive' });
      return;
    }

    // Save first
    await handleSaveSettings();

    toast({ title: 'Enviando notificação de teste...' });

    try {
      // Send test notification
      const testPayload = {
        phone: '5511999999999', // Número de teste
        name: 'Teste',
        email: 'teste@sistema.com',
        first_name: 'Teste',
        flow_id: 'bill-notification-test',
        instance: 'test-instance',
        instance_name: 'test-instance',
        step: 1,
        current_step_order: 1,
        params: {
          message: '🧪 *TESTE DE NOTIFICAÇÃO DE CONTAS*\n\nSe você recebeu esta mensagem, o webhook está funcionando corretamente!\n\n✅ Sistema operacional.'
        }
      };

      const response = await fetch(billsWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPayload)
      });

      if (response.ok) {
        toast({ title: '✅ Teste enviado!', description: 'Verifique o WhatsApp configurado.' });
      } else {
        const errorText = await response.text();
        toast({
          title: '❌ Falha no webhook',
          description: `Status: ${response.status} - ${errorText.substring(0, 100)}`,
          variant: 'destructive'
        });
      }
    } catch (err: any) {
      toast({ title: 'Erro ao testar webhook', description: err.message, variant: 'destructive' });
    }
  };

  const loadUsers = async () => {
    try {
      // Fetch all data separately
      const [profilesResult, userPlansResult, userRolesResult] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('user_plans').select('*'),
        supabase.from('user_roles').select('*')
      ]);

      if (profilesResult.error) {
        console.error('Error loading profiles:', profilesResult.error);
        return;
      }

      const combinedUsers = (profilesResult.data || []).map(profile => {
        const userPlan = (userPlansResult.data || []).find(p => p.user_id === profile.id);
        const userRole = (userRolesResult.data || []).filter(r => r.user_id === profile.id);

        return {
          ...profile,
          user_plans: userPlan ? [{ plan_id: userPlan.plan_id, active_features: userPlan.active_features, max_instances: userPlan.max_instances }] : [],
          user_roles: userRole.map(r => ({ role: r.role }))
        };
      });

      setUsers(combinedUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({ title: 'Erro ao carregar usuários', variant: 'destructive' });
    }
  };

  const loadPlans = async () => {
    const { data, error } = await supabase.from('plans').select('*').order('price');
    if (error) {
      console.error('Error loading plans:', error);
      return;
    }
    setPlans(data || []);
  };

  const handleCreateUser = async () => {
    if (!newUserName || !newUserEmail || !newUserPassword || !selectedPlanId) {
      toast({ title: 'Preencha todos os campos e selecione um plano', variant: 'destructive' });
      return;
    }

    setLoading(true);

    try {
      // Initialize temporary client to avoid logging out admin
      const tempClient = createClient(
        'https://supabase.anok.com.br',
        'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwicmVmIjoic2VsZmhvc3RlZCIsImlhdCI6MTc2NTg1MDI1NCwiZXhwIjoyMDgxMjEwMjU0fQ.sNGCdzSWpPvwfN6MEGIssi7ZKDTAMBCzgPFNV9qswcA',
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false
          }
        }
      );

      const { data, error } = await tempClient.auth.signUp({
        email: newUserEmail,
        password: newUserPassword,
        options: {
          data: { full_name: newUserName }
        }
      });

      if (error) throw error;

      if (data.user) {
        const selectedPlan = plans.find(p => p.id === selectedPlanId);
        if (selectedPlan) {
          const { error: planError } = await supabase
            .from('user_plans')
            .insert({
              user_id: data.user.id,
              plan_id: selectedPlanId,
              active_features: selectedPlan.features,
              max_instances: 1
            });

          if (planError) {
            console.error('Error assigning plan:', planError);
            toast({ title: 'Usuário criado, mas erro ao atribuir plano.', description: planError.message, variant: 'destructive' });
          } else {
            toast({ title: 'Usuário criado e plano atribuído!' });
          }
        }

        setNewUserDialogOpen(false);
        resetUserForm();
        setTimeout(() => loadUsers(), 2000);
      } else {
        toast({ title: 'Verifique o email', description: 'O usuário foi registrado.' });
        setNewUserDialogOpen(false);
      }

    } catch (err: any) {
      console.error('Create user error:', err);
      toast({ title: 'Erro ao criar usuário', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const resetUserForm = () => {
    setNewUserName('');
    setNewUserEmail('');
    setNewUserPassword('');
    setSelectedPlanId('');
    setNewUserDialogOpen(false);
  };

  const handleSavePlan = async () => {
    if (!planName || !planPrice) return;

    try {
      const planData = {
        name: planName,
        description: planDescription,
        price: parseFloat(planPrice),
        features: planFeatures
      };

      if (editingPlan) {
        const { error } = await supabase
          .from('plans')
          .update(planData)
          .eq('id', editingPlan.id);

        if (error) throw error;
        toast({ title: 'Plano atualizado com sucesso!' });
      } else {
        const { error } = await supabase
          .from('plans')
          .insert(planData);

        if (error) throw error;
        toast({ title: 'Plano criado com sucesso!' });
      }

      setPlanDialogOpen(false);
      resetPlanForm();
      loadPlans();
    } catch (error: any) {
      toast({ title: 'Erro ao salvar plano', description: error.message, variant: 'destructive' });
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este plano?')) return;
    try {
      const { error } = await supabase.from('plans').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Plano excluído com sucesso!' });
      loadPlans();
    } catch (error: any) {
      toast({ title: 'Erro ao excluir plano', description: error.message, variant: 'destructive' });
    }
  };

  const resetPlanForm = () => {
    setPlanName('');
    setPlanDescription('');
    setPlanPrice('');
    setPlanFeatures([]);
    setEditingPlan(null);
  };

  const handleEditPlan = (plan: Plan) => {
    setEditingPlan(plan);
    setPlanName(plan.name);
    setPlanDescription(plan.description);
    setPlanPrice(plan.price.toString());
    setPlanFeatures(plan.features);
    setPlanDialogOpen(true);
  };

  const toggleFeature = (featureId: string, list: string[], setList: (l: string[]) => void) => {
    if (list.includes(featureId)) {
      setList(list.filter(f => f !== featureId));
    } else {
      setList([...list, featureId]);
    }
  };

  const handleOpenUserFeatures = (user: UserWithPlan) => {
    setSelectedUser(user);
    const userPlan = user.user_plans?.[0];
    setUserFeatures(userPlan?.active_features || []);
    setEditingUserPlanId(userPlan?.plan_id || '');
    setMaxInstances(userPlan?.max_instances || 1);
    setUserDialogOpen(true);
  };

  const handleSaveUserFeatures = async () => {
    if (!selectedUser) return;
    try {
      const { error } = await supabase
        .from('user_plans')
        .upsert({
          user_id: selectedUser.id,
          plan_id: editingUserPlanId,
          active_features: userFeatures,
          max_instances: maxInstances
        }, { onConflict: 'user_id' }); // Assuming user_id is unique or part of PK

      if (error) throw error;

      toast({ title: 'Permissões do usuário atualizadas!' });
      setUserDialogOpen(false);
      loadUsers();

    } catch (error: any) {
      toast({ title: 'Erro ao salvar permissões', description: error.message, variant: 'destructive' });
    }
  };

  const handleToggleUserStatus = async (userToToggle: UserWithPlan) => {
    try {
      const newStatus = userToToggle.status === 'suspended' ? 'active' : 'suspended';

      const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus })
        .eq('id', userToToggle.id);

      if (error) throw error;

      toast({
        title: `Usuário ${newStatus === 'active' ? 'ativado' : 'suspenso'}!`,
        description: `O acesso de ${userToToggle.full_name} foi atualizado.`
      });
      loadUsers();
    } catch (error: any) {
      toast({ title: 'Erro ao alterar status', description: error.message, variant: 'destructive' });
    }
  };

  const handleDeleteUser = async (userToDelete: UserWithPlan) => {
    if (!confirm(`Tem certeza que deseja excluir o usuário ${userToDelete.full_name}? Essa ação não pode ser desfeita.`)) return;

    try {
      // Manually delete related records first to avoid FK constraints issues if cascade is not set
      await supabase.from('user_plans').delete().eq('user_id', userToDelete.id);
      await supabase.from('user_roles').delete().eq('user_id', userToDelete.id);
      // Add other relations if needed (leads, etc) or trust cascade for data owned by user

      const { error } = await supabase.from('profiles').delete().eq('id', userToDelete.id);

      if (error) throw error;

      toast({ title: 'Usuário excluído com sucesso!' });
      loadUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({ title: 'Erro ao excluir usuário', description: error.message, variant: 'destructive' });
    }
  };

  if (loading && !users.length) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Settings className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Painel Administrativo</h1>
            <p className="text-muted-foreground">Gerencie usuários, planos e configurações globais</p>
          </div>
        </div>

        <Tabs defaultValue="users">
          <TabsList>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              Usuários
            </TabsTrigger>
            <TabsTrigger value="plans" className="gap-2">
              <Package className="h-4 w-4" />
              Planos
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              Configurações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Usuários</CardTitle>
                  <CardDescription>Gerencie o acesso e permissões dos usuários</CardDescription>
                </div>
                <Dialog open={newUserDialogOpen} onOpenChange={(open) => { if (!open) resetUserForm(); setNewUserDialogOpen(open); }}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Novo Usuário
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Criar Novo Usuário</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Nome Completo</Label>
                        <Input id="name" value={newUserName} onChange={e => setNewUserName(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password">Senha</Label>
                        <Input id="password" type="password" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Plano Inicial</Label>
                        <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um plano" />
                          </SelectTrigger>
                          <SelectContent>
                            {plans.map(plan => (
                              <SelectItem key={plan.id} value={plan.id}>
                                {plan.name} - R$ {plan.price}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={handleCreateUser} disabled={loading} className="w-full">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Criar Usuário
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Função</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead>Recursos Ativos</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((userProfile) => (
                      <TableRow key={userProfile.id}>
                        <TableCell className="font-medium">{userProfile.full_name}</TableCell>
                        <TableCell>{userProfile.email || 'N/A'}</TableCell>
                        <TableCell>
                          {userProfile.user_roles?.some(r => r.role === 'admin') ? (
                            <Badge variant="default" className="bg-primary">Admin</Badge>
                          ) : (
                            <Badge variant="secondary">User</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {userProfile.status === 'suspended' ? (
                            <Badge variant="destructive">Suspenso</Badge>
                          ) : userProfile.status === 'inactive' ? (
                            <Badge variant="outline" className="text-muted-foreground">Inativo</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Ativo</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {plans.find(p => p.id === userProfile.user_plans?.[0]?.plan_id)?.name || 'Sem Plano'}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {userProfile.user_plans?.[0]?.active_features?.slice(0, 3).map(f => (
                              <Badge key={f} variant="outline" className="text-xs">
                                {AVAILABLE_FEATURES.find(af => af.id === f)?.label || f}
                              </Badge>
                            ))}
                            {(userProfile.user_plans?.[0]?.active_features?.length || 0) > 3 && (
                              <Badge variant="outline" className="text-xs">+{(userProfile.user_plans?.[0]?.active_features?.length || 0) - 3}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right flex justify-end gap-1">
                          <Button variant="ghost" size="icon" title={userProfile.status === 'suspended' ? "Ativar Usuário" : "Suspender Usuário"} onClick={() => handleToggleUserStatus(userProfile)}>
                            <Shield className={`h-4 w-4 ${userProfile.status === 'suspended' ? 'text-green-600' : 'text-orange-500'}`} />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleOpenUserFeatures(userProfile)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteUser(userProfile)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="plans" className="mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Planos</CardTitle>
                  <CardDescription>Crie e gerencie planos de assinatura</CardDescription>
                </div>
                <Dialog open={planDialogOpen} onOpenChange={(open) => { if (!open) resetPlanForm(); setPlanDialogOpen(open); }}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Novo Plano
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>{editingPlan ? 'Editar Plano' : 'Novo Plano'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label>Nome do Plano</Label>
                        <Input value={planName} onChange={(e) => setPlanName(e.target.value)} placeholder="Ex: Básico, Pro, Enterprise" />
                      </div>
                      <div className="space-y-2">
                        <Label>Descrição</Label>
                        <Input value={planDescription} onChange={(e) => setPlanDescription(e.target.value)} placeholder="Descrição do plano" />
                      </div>
                      <div className="space-y-2">
                        <Label>Preço (R$)</Label>
                        <Input type="number" value={planPrice} onChange={(e) => setPlanPrice(e.target.value)} placeholder="99.90" />
                      </div>
                      <div className="space-y-2">
                        <Label>Funcionalidades Incluídas</Label>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {AVAILABLE_FEATURES.map((feature) => (
                            <div key={feature.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={feature.id}
                                checked={planFeatures.includes(feature.id)}
                                onCheckedChange={() => toggleFeature(feature.id, planFeatures, setPlanFeatures)}
                              />
                              <Label htmlFor={feature.id} className="text-sm cursor-pointer">{feature.label}</Label>
                            </div>
                          ))}
                        </div>
                      </div>
                      <Button onClick={handleSavePlan} className="w-full">
                        {editingPlan ? 'Atualizar' : 'Criar'} Plano
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {plans.map((plan) => (
                    <Card key={plan.id} className="relative">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{plan.name}</CardTitle>
                            <CardDescription>{plan.description}</CardDescription>
                          </div>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" onClick={() => handleEditPlan(plan)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => handleDeletePlan(plan.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-2xl font-bold text-primary">
                          R$ {plan.price.toFixed(2)}
                          <span className="text-sm font-normal text-muted-foreground">/mês</span>
                        </p>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-1">
                          {plan.features.map((f) => (
                            <Badge key={f} variant="secondary" className="text-xs">
                              {AVAILABLE_FEATURES.find(af => af.id === f)?.label || f}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Configurações Globais</CardTitle>
                <CardDescription>Defina configurações que afetam todos os usuários do sistema</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>URL do Webhook do n8n (Campanhas)</Label>
                  <div className="flex gap-2">
                    <Input
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      placeholder="https://seu-n8n.com/webhook/..."
                      className="flex-1"
                    />
                    <Button variant="outline" onClick={handleTestWebhook} className="shrink-0">
                      Testar
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Esta URL será chamada via POST sempre que uma campanha for iniciada imediatamente.
                    <br />O payload será: <code>{`{ "campaign_id": "uuid", "user_id": "uuid" }`}</code>
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>URL do Webhook do n8n (Notificações de Contas)</Label>
                  <div className="flex gap-2">
                    <Input
                      value={billsWebhookUrl}
                      onChange={(e) => setBillsWebhookUrl(e.target.value)}
                      placeholder="https://seu-n8n.com/webhook/..."
                      className="flex-1"
                    />
                    <Button variant="outline" onClick={handleTestBillsWebhook} className="shrink-0">
                      Testar
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Esta URL será usada para enviar notificações de vencimento de contas a pagar via WhatsApp.
                    <br />Configure um workflow N8N separado para este propósito.
                  </p>
                </div>
                <div className="flex gap-4">
                  <Button onClick={handleSaveSettings}>
                    Salvar Configurações
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Permissões e Limites</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 mt-4">
              <div className="space-y-2">
                <Label>Plano Atual</Label>
                <Select
                  value={editingUserPlanId}
                  onValueChange={(val) => {
                    setEditingUserPlanId(val);
                    const selectedPlan = plans.find(p => p.id === val);
                    if (selectedPlan) {
                      setUserFeatures(selectedPlan.features);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um plano" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map(plan => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Instâncias de WhatsApp Máximas</Label>
                <Input
                  type="number"
                  value={maxInstances}
                  onChange={e => setMaxInstances(parseInt(e.target.value) || 1)}
                  min={1}
                />
              </div>
              <div className="space-y-2">
                <Label>Funcionalidades Ativas</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {AVAILABLE_FEATURES.map((feature) => (
                    <div key={feature.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`u-${feature.id}`}
                        checked={userFeatures.includes(feature.id)}
                        onCheckedChange={() => toggleFeature(feature.id, userFeatures, setUserFeatures)}
                      />
                      <Label htmlFor={`u-${feature.id}`} className="text-sm cursor-pointer">{feature.label}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <Button onClick={handleSaveUserFeatures} className="w-full">
                  Salvar Alterações
                </Button>

                {selectedUser && (
                  <Button
                    variant="outline"
                    className={`w-full ${selectedUser.status === 'suspended' ? 'text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100' : 'text-destructive hover:text-destructive hover:bg-destructive/10'}`}
                    onClick={() => {
                      handleToggleUserStatus(selectedUser);
                      setUserDialogOpen(false);
                    }}
                  >
                    {selectedUser.status === 'suspended' ? (
                      <>
                        <Shield className="mr-2 h-4 w-4" /> Ativar Acesso do Usuário
                      </>
                    ) : (
                      <>
                        <Shield className="mr-2 h-4 w-4" /> Desativar/Suspender Acesso
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
