import { useState, useEffect } from 'react';
import { Save, Building2, ImageIcon, MessageSquare, Plus, Trash2, RefreshCw, QrCode, Wifi, WifiOff, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { fileToBase64 } from '@/lib/fileUtils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { evolutionApi, getInstanceName, type WhatsAppInstance } from '@/services/evolutionApi';
import type { Settings as SettingsType } from '@/types';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export default function Settings() {
  const { user, maxInstances } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<SettingsType>({
    empresa_nome: '',
    empresa_cnpj: '',
    empresa_logo_base64: '',
    empresa_endereco: '',
    empresa_telefone: '',
    empresa_email: '',
  });

  // WhatsApp connection states
  const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
  const [loadingInstances, setLoadingInstances] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newInstanceName, setNewInstanceName] = useState('');
  const [creatingInstance, setCreatingInstance] = useState(false);
  const [qrCodeDialog, setQrCodeDialog] = useState<{ open: boolean; qrCode: string; instanceName: string }>({
    open: false,
    qrCode: '',
    instanceName: '',
  });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; instanceName: string }>({
    open: false,
    instanceName: '',
  });
  const [connectionStates, setConnectionStates] = useState<Record<string, string>>({});
  const [connectionSuccess, setConnectionSuccess] = useState(false);


  // Load settings and instances
  useEffect(() => {
    if (user) {
      loadSettings();
      loadInstances();
    }
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('organization_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "Row not found" which is fine for first load
        console.error('Error loading settings:', error);
        return;
      }

      if (data) {
        setSettings({
          empresa_nome: data.empresa_nome || '',
          empresa_cnpj: data.empresa_cnpj || '',
          empresa_logo_base64: data.empresa_logo_base64 || '',
          empresa_endereco: data.empresa_endereco || '',
          empresa_telefone: data.empresa_telefone || '',
          empresa_email: data.empresa_email || '',
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  // Auto-refresh connection states every 3 seconds (faster)
  useEffect(() => {
    if (instances.length === 0) return;

    const intervalId = setInterval(() => {
      refreshConnectionStates();
    }, 3000);

    return () => clearInterval(intervalId);
  }, [instances]);

  // ... (rest of code) ...

  const handleSave = async () => {
    if (!user) return;

    console.log('Saving settings:', settings);

    try {
      const { error } = await supabase
        .from('organization_settings')
        .upsert({
          user_id: user.id,
          empresa_nome: settings.empresa_nome,
          empresa_cnpj: settings.empresa_cnpj,
          empresa_logo_base64: settings.empresa_logo_base64,
          empresa_endereco: settings.empresa_endereco,
          empresa_telefone: settings.empresa_telefone,
          empresa_email: settings.empresa_email,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      if (error) {
        throw error;
      }

      toast({ title: 'Configurações salvas!', description: 'Dados da empresa atualizados com sucesso.' });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({ title: 'Erro ao salvar', description: 'Não foi possível salvar as configurações.', variant: 'destructive' });
    }
  };
  // Poll connection state when QR dialog is open
  useEffect(() => {
    if (!qrCodeDialog.open || !qrCodeDialog.instanceName || connectionSuccess) return;

    const pollInterval = setInterval(async () => {
      try {
        const state = await evolutionApi.getConnectionState(qrCodeDialog.instanceName);
        console.log('[QR Dialog] Connection state:', state);

        if (state.state === 'open') {
          // Connection successful!
          setConnectionSuccess(true);

          // Auto-close after 2 seconds
          setTimeout(() => {
            setQrCodeDialog({ open: false, qrCode: '', instanceName: '' });
            setConnectionSuccess(false);
            loadInstances();
          }, 2000);
        }
      } catch (error) {
        console.error('[QR Dialog] Error checking connection:', error);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(pollInterval);
  }, [qrCodeDialog.open, qrCodeDialog.instanceName, connectionSuccess]);

  const loadInstances = async () => {
    if (!user) return;

    setLoadingInstances(true);
    try {
      // 1. Get user's instances from database with display names
      const { data: userInstances, error: dbError } = await supabase
        .from('whatsapp_instances')
        .select('instance_name, display_name')
        .eq('user_id', user.id); // Explicit filter by user ID

      if (dbError) {
        console.error('Error loading user instances:', dbError);
        toast({ title: 'Erro ao carregar instâncias do banco', variant: 'destructive' });
        return;
      }

      // Create map of instance_name => display_name
      const instanceMap = new Map(
        userInstances?.map(i => [i.instance_name, i.display_name]) || []
      );

      // 2. Fetch all instances from Evolution API
      const allInstances = await evolutionApi.fetchInstances();

      // 3. Filter to show only user's instances and attach display names
      const filteredInstances = allInstances
        .filter(inst => {
          const name = getInstanceName(inst);
          return name && instanceMap.has(name);
        })
        .map(inst => ({
          ...inst,
          displayName: instanceMap.get(getInstanceName(inst) || '') || getInstanceName(inst) || ''
        }));

      setInstances(filteredInstances);

      // 4. Load connection states for filtered instances
      const states: Record<string, string> = {};
      for (const inst of filteredInstances) {
        const instanceName = getInstanceName(inst);
        if (!instanceName) continue;
        try {
          const state = await evolutionApi.getConnectionState(instanceName);
          states[instanceName] = state.state || 'close';
        } catch {
          states[instanceName] = 'close';
        }
      }
      setConnectionStates(states);
    } catch (error) {
      console.error('Error loading instances:', error);
      toast({ title: 'Erro ao carregar instâncias', variant: 'destructive' });
    } finally {
      setLoadingInstances(false);
    }
  };

  const refreshConnectionStates = async () => {
    if (!user || instances.length === 0) return;

    try {
      const states: Record<string, string> = {};
      for (const inst of instances) {
        const instanceName = getInstanceName(inst);
        if (!instanceName) continue;
        try {
          const state = await evolutionApi.getConnectionState(instanceName);
          states[instanceName] = state.state || 'close';
        } catch {
          states[instanceName] = 'close';
        }
      }
      setConnectionStates(states);
    } catch (error) {
      console.error('Error refreshing connection states:', error);
    }
  };

  const handleCreateInstance = async () => {
    if (!newInstanceName.trim()) {
      toast({ title: 'Digite um nome para a instância', variant: 'destructive' });
      return;
    }

    if (instances.length >= maxInstances) {
      toast({ title: 'Limite de instâncias atingido', description: `Seu plano permite apenas ${maxInstances} instância(s).`, variant: 'destructive' });
      return;
    }

    if (!user) {
      toast({ title: 'Usuário não autenticado', variant: 'destructive' });
      return;
    }

    setCreatingInstance(true);
    try {
      // 1. Generate unique technical name for API
      const userIdPrefix = user.id.substring(0, 8);
      const timestamp = Date.now();
      const uniqueInstanceName = `inst-${userIdPrefix}-${timestamp}`;

      // 2. Create instance in Evolution API with unique name
      const result = await evolutionApi.createInstance(uniqueInstanceName);

      // 3. Save to database with both technical and display names
      const { error: dbError } = await supabase
        .from('whatsapp_instances')
        .insert({
          user_id: user.id,
          instance_name: uniqueInstanceName,
          display_name: newInstanceName.trim()
        });

      if (dbError) {
        console.error('Error saving instance to database:', dbError);
        toast({ title: 'Instância criada mas erro ao salvar no banco', variant: 'destructive' });
      } else {
        toast({ title: 'Instância criada com sucesso!' });
      }

      setCreateDialogOpen(false);
      setNewInstanceName('');

      if (result.qrcode?.base64) {
        setQrCodeDialog({
          open: true,
          qrCode: result.qrcode.base64,
          instanceName: uniqueInstanceName,
        });
      }

      loadInstances();
    } catch (error) {
      toast({ title: 'Erro ao criar instância', variant: 'destructive' });
    } finally {
      setCreatingInstance(false);
    }
  };

  const handleConnect = async (instanceName: string) => {
    try {
      console.log('[HandleConnect] Connecting instance:', instanceName);

      // First, try to restart the instance to force QR code generation
      try {
        console.log('[HandleConnect] Restarting instance to force QR generation...');
        await evolutionApi.restartInstance(instanceName);
        // Wait a bit for the restart to complete
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (restartError) {
        console.warn('[HandleConnect] Restart failed, continuing anyway:', restartError);
      }

      const result = await evolutionApi.connectInstance(instanceName);
      console.log('[HandleConnect] Connect result:', JSON.stringify(result, null, 2));

      // Try to extract QR code from multiple possible locations in the response
      let qrCode = null;

      // Check all possible QR code locations
      if (result.qrcode?.base64) {
        qrCode = result.qrcode.base64;
        console.log('[HandleConnect] QR Code found in qrcode.base64');
      } else if (result.qrcode?.code) {
        qrCode = result.qrcode.code;
        console.log('[HandleConnect] QR Code found in qrcode.code');
      } else if (result.qr) {
        qrCode = result.qr;
        console.log('[HandleConnect] QR Code found in qr');
      } else if (result.base64) {
        qrCode = result.base64;
        console.log('[HandleConnect] QR Code found in base64');
      } else if (result.pairingCode) {
        // Some versions use pairing code
        console.log('[HandleConnect] Pairing code found:', result.pairingCode);
        toast({
          title: 'Código de pareamento disponível',
          description: `Código: ${result.pairingCode}`,
        });
      }

      if (qrCode) {
        console.log('[HandleConnect] Opening QR dialog with code');
        setQrCodeDialog({
          open: true,
          qrCode: qrCode,
          instanceName,
        });
      } else {
        console.warn('[HandleConnect] No QR code found in response:', result);
        toast({
          title: 'QR Code não disponível',
          description: 'Tente deletar e criar uma nova instância, ou acesse o painel da Evolution API diretamente',
          variant: 'default'
        });
      }
      loadInstances();
    } catch (error: any) {
      console.error('[HandleConnect] Error:', error);
      toast({
        title: 'Erro ao conectar',
        description: error.message || 'Tente novamente',
        variant: 'destructive'
      });
    }
  };

  const handleLogout = async (instanceName: string) => {
    try {
      await evolutionApi.logoutInstance(instanceName);
      toast({ title: 'Desconectado com sucesso!' });
      loadInstances();
    } catch (error) {
      toast({ title: 'Erro ao desconectar', variant: 'destructive' });
    }
  };

  const handleDeleteInstance = async () => {
    try {
      console.log('Deleting instance:', deleteDialog.instanceName);

      // 1. Delete from Evolution API
      await evolutionApi.deleteInstance(deleteDialog.instanceName);
      console.log('✓ Deleted from Evolution API');

      // 2. Delete from database
      const { error: dbError } = await supabase
        .from('whatsapp_instances')
        .delete()
        .eq('instance_name', deleteDialog.instanceName);

      if (dbError) {
        console.error('Error deleting from database:', dbError);
        toast({
          title: 'Instância removida da API mas erro no banco',
          description: dbError.message,
          variant: 'destructive'
        });
      } else {
        console.log('✓ Deleted from database');
        toast({ title: 'Instância removida!' });
      }

      setDeleteDialog({ open: false, instanceName: '' });
      loadInstances();
    } catch (error: any) {
      console.error('Error deleting instance:', error);
      toast({
        title: 'Erro ao remover instância',
        description: error?.message || 'Erro desconhecido',
        variant: 'destructive'
      });
    }
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const base64 = await fileToBase64(file);
      setSettings({ ...settings, empresa_logo_base64: base64 });
      toast({ title: 'Logo carregada!' });
    }
  };



  const getStatusColor = (state: string) => {
    switch (state) {
      case 'open':
        return 'bg-green-500';
      case 'connecting':
        return 'bg-yellow-500';
      default:
        return 'bg-red-500';
    }
  };

  const getStatusText = (state: string) => {
    switch (state) {
      case 'open':
        return 'Conectado';
      case 'connecting':
        return 'Conectando...';
      default:
        return 'Desconectado';
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader title="Configurações" description="Configure os dados da sua empresa">
        <Button className="gradient-primary glow" onClick={handleSave}>
          <Save className="w-4 h-4 mr-2" />
          Salvar
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company Data Card */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-lg bg-primary/10">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Dados da Empresa</h3>
              <p className="text-sm text-muted-foreground">Informações que aparecerão nos pedidos</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted/30">
                {settings.empresa_logo_base64 ? (
                  <img
                    src={settings.empresa_logo_base64}
                    alt="Logo"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <ImageIcon className="w-8 h-8 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1">
                <Label>Logo da Empresa</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  A logo será exibida nos PDFs dos pedidos
                </p>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="max-w-xs"
                />
              </div>
            </div>

            <div className="grid gap-4">
              <div>
                <Label>Nome da Empresa</Label>
                <Input
                  value={settings.empresa_nome}
                  onChange={(e) => setSettings({ ...settings, empresa_nome: e.target.value })}
                  placeholder="Sua Empresa LTDA"
                />
              </div>
              <div>
                <Label>CNPJ</Label>
                <Input
                  value={settings.empresa_cnpj}
                  onChange={(e) => setSettings({ ...settings, empresa_cnpj: e.target.value })}
                  placeholder="00.000.000/0001-00"
                />
              </div>
              <div>
                <Label>Endereço</Label>
                <Input
                  value={settings.empresa_endereco}
                  onChange={(e) => setSettings({ ...settings, empresa_endereco: e.target.value })}
                  placeholder="Rua Example, 123 - Bairro - Cidade/UF"
                />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input
                  value={settings.empresa_telefone}
                  onChange={(e) => setSettings({ ...settings, empresa_telefone: e.target.value })}
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div>
                <Label>E-mail</Label>
                <Input
                  type="email"
                  value={settings.empresa_email}
                  onChange={(e) => setSettings({ ...settings, empresa_email: e.target.value })}
                  placeholder="contato@empresa.com"
                />
              </div>
            </div>
          </div>
        </div>

        {/* WhatsApp Connections Card */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-green-500/10">
                <MessageSquare className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <h3 className="font-semibold">Conexões WhatsApp</h3>
                <p className="text-sm text-muted-foreground">Gerencie suas instâncias do WhatsApp</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={loadInstances} disabled={loadingInstances}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loadingInstances ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
              <Button
                size="sm"
                onClick={() => setCreateDialogOpen(true)}
                disabled={instances.length >= maxInstances}
                title={instances.length >= maxInstances ? `Limite de instâncias atingido (${maxInstances})` : 'Criar nova instância'}
              >
                <Plus className="w-4 h-4 mr-2" />
                Nova Conexão
              </Button>
            </div>
          </div>

          {loadingInstances ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : instances.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma conexão configurada</p>
              <p className="text-sm">Clique em "Nova Conexão" para adicionar</p>
            </div>
          ) : (
            <div className="space-y-3">
              {instances.map((inst, index) => {
                const instanceName = getInstanceName(inst);
                const displayName = (inst as any).displayName || instanceName;
                const profileName = inst?.instance?.profileName || inst?.profileName;
                const state = connectionStates[instanceName || ''] || 'close';

                if (!instanceName) return null;

                return (
                  <div
                    key={instanceName}
                    className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/20"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                        {state === 'open' ? (
                          <Wifi className="w-5 h-5 text-green-500" />
                        ) : (
                          <WifiOff className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{displayName}</p>
                        <div className="flex items-center gap-2 text-sm">
                          <span className={`w-2 h-2 rounded-full ${getStatusColor(state)}`} />
                          <span className="text-muted-foreground">{getStatusText(state)}</span>
                          {profileName && (
                            <span className="text-muted-foreground">• {profileName}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {state === 'open' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleLogout(instanceName)}
                        >
                          <WifiOff className="w-4 h-4 mr-2" />
                          Desconectar
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleConnect(instanceName)}
                        >
                          <QrCode className="w-4 h-4 mr-2" />
                          Conectar
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteDialog({ open: true, instanceName })}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Create Instance Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Conexão WhatsApp</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label>Nome da Instância</Label>
            <Input
              value={newInstanceName}
              onChange={(e) => setNewInstanceName(e.target.value)}
              placeholder="Ex: whatsapp-principal"
              className="mt-2"
            />
            <p className="text-sm text-muted-foreground mt-2">
              Use um nome único para identificar esta conexão
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateInstance} disabled={creatingInstance}>
              {creatingInstance ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar Conexão'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog
        open={qrCodeDialog.open}
        onOpenChange={(open) => {
          setQrCodeDialog({ ...qrCodeDialog, open });
          if (!open) {
            setConnectionSuccess(false);
            refreshConnectionStates();
            loadInstances();
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Conectar WhatsApp</DialogTitle>
          </DialogHeader>

          {connectionSuccess ? (
            <div className="flex flex-col items-center py-8">
              <div className="w-24 h-24 rounded-full bg-green-500/20 flex items-center justify-center">
                <svg
                  className="w-16 h-16 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-green-500 mt-4">Conectado com Sucesso!</h3>
              <p className="text-sm text-muted-foreground mt-2">Seu WhatsApp foi conectado</p>
            </div>
          ) : (
            <div className="flex flex-col items-center py-4">
              <p className="text-sm text-muted-foreground mb-4 text-center">
                Escaneie o QR Code com seu WhatsApp para conectar a instância "{qrCodeDialog.instanceName}"
              </p>
              {qrCodeDialog.qrCode && (
                <div className="p-4 bg-white rounded-xl">
                  <img
                    src={qrCodeDialog.qrCode}
                    alt="QR Code"
                    className="w-64 h-64"
                  />
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-4">
                Abra o WhatsApp → Menu → Aparelhos conectados → Conectar aparelho
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setQrCodeDialog({ open: false, qrCode: '', instanceName: '' });
              }}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Conexão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover a instância "{deleteDialog.instanceName}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteInstance} className="bg-destructive hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog >
    </div >
  );
}
