import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import * as workspaceService from '@/services/workspaceService';
import * as chatService from '@/services/chatService';
import * as leadService from '@/services/leadService';
import { toast } from 'sonner';

interface KanbanColumn {
  id: string;
  label: string;
  color: string;
}

interface Contact {
  id: string;
  remoteJid: string;
  name: string;
  avatar?: string;
  lastMessage: string;
  time: string;
  unread: number;
  columnId: string;
}

export default function LiveChat() {
  const { user } = useAuth();

  // Workspace state
  const [workspaces, setWorkspaces] = useState<workspaceService.Workspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>('');
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(true);

  // Kanban state
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [loadingColumns, setLoadingColumns] = useState(false);

  // Leads state
  const [leads, setLeads] = useState<Contact[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);

  // New column creation state
  const [isCreatingColumn, setIsCreatingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [creatingColumnLoading, setCreatingColumnLoading] = useState(false);

  // Load workspaces
  useEffect(() => {
    if (user) {
      loadWorkspaces();
    }
  }, [user]);

  // Load columns when workspace changes
  useEffect(() => {
    if (selectedWorkspace && user) {
      loadKanbanColumns();
      loadLeads();
    }
  }, [selectedWorkspace, user]);

  const loadWorkspaces = async () => {
    if (!user) return;

    setLoadingWorkspaces(true);
    try {
      const userWorkspaces = await workspaceService.getUserWorkspaces(user.id);
      setWorkspaces(userWorkspaces);

      // Auto-select default workspace
      const defaultWs = userWorkspaces.find(w => w.is_default);
      const workspaceId = defaultWs ? defaultWs.id : (userWorkspaces.length > 0 ? userWorkspaces[0].id : null);

      if (workspaceId) {
        setSelectedWorkspace(workspaceId);
        // Immediately load columns and leads for the selected workspace
        await Promise.all([
          loadKanbanColumnsForWorkspace(workspaceId),
          loadLeadsForWorkspace(workspaceId)
        ]);
      }
    } catch (error) {
      console.error('Error loading workspaces:', error);
      toast.error('Erro ao carregar workspaces');
    } finally {
      setLoadingWorkspaces(false);
    }
  };

  const loadKanbanColumnsForWorkspace = async (workspaceId: string) => {
    if (!user) return;

    setLoadingColumns(true);
    try {
      const dbColumns = await chatService.getUserKanbanColumns(user.id, workspaceId);

      if (dbColumns.length === 0) {
        // Create default column for this workspace
        const defaultColumn = await chatService.createKanbanColumn(user.id, {
          column_id: 'leads',
          label: 'Leads',
          color: 'from-blue-500 to-blue-600',
          is_default: true,
          position: 0,
          workspace_id: workspaceId,
        });

        if (defaultColumn) {
          setColumns([{
            id: defaultColumn.column_id,
            label: defaultColumn.label,
            color: defaultColumn.color,
          }]);
        }
      } else {
        setColumns(dbColumns.map(col => ({
          id: col.column_id,
          label: col.label,
          color: col.color,
        })));
      }
    } catch (error) {
      console.error('Error loading columns:', error);
      setColumns([{ id: 'leads', label: 'Leads', color: 'from-blue-500 to-blue-600' }]);
    } finally {
      setLoadingColumns(false);
    }
  };

  const loadKanbanColumns = async () => {
    if (selectedWorkspace) {
      await loadKanbanColumnsForWorkspace(selectedWorkspace);
    }
  };

  const loadLeadsForWorkspace = async (workspaceId: string) => {
    if (!user) return;

    setLoadingLeads(true);
    try {
      // Get leads from dedicated leads table
      const dbLeads = await leadService.getLeadsByWorkspace(user.id, workspaceId);

      // Map to Contact format for display
      const mappedLeads: Contact[] = dbLeads.map((lead) => ({
        id: lead.id,
        remoteJid: lead.phone,
        name: lead.name,
        avatar: undefined,
        lastMessage: lead.notes || lead.company || lead.email || '',
        time: formatTimestamp(lead.created_at),
        unread: 0,
        columnId: lead.column_id,
      }));

      setLeads(mappedLeads);
    } catch (error) {
      console.error('Error loading leads:', error);
      toast.error('Erro ao carregar leads');
    } finally {
      setLoadingLeads(false);
    }
  };

  const loadLeads = async () => {
    if (selectedWorkspace) {
      await loadLeadsForWorkspace(selectedWorkspace);
    }
  };


  const handleCreateColumn = async () => {
    if (!newColumnName.trim() || !user || !selectedWorkspace) return;

    setCreatingColumnLoading(true);
    try {
      const slug = newColumnName.toLowerCase().trim().replace(/\s+/g, '-');
      const position = columns.length;

      const newColumn = await chatService.createKanbanColumn(user.id, {
        column_id: slug,
        label: newColumnName.trim(),
        color: 'from-gray-500 to-gray-600', // Default color
        is_default: false,
        position: position,
        workspace_id: selectedWorkspace,
      });

      if (newColumn) {
        setColumns([...columns, {
          id: newColumn.column_id,
          label: newColumn.label,
          color: newColumn.color,
        }]);
        setNewColumnName('');
        setIsCreatingColumn(false);
        toast.success('Coluna criada com sucesso!');
      }
    } catch (error) {
      console.error('Error creating column:', error);
      toast.error('Erro ao criar coluna');
    } finally {
      setCreatingColumnLoading(false);
    }
  };

  const formatPhoneNumber = (jid: string): string => {
    const phone = jid.replace(/@.*/, '').replace(/\D/g, '');
    if (phone.length >= 10) {
      return `+${phone}`;
    }
    return phone;
  };

  const formatTimestamp = (timestamp: string): string => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();

    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Ontem';
    }

    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  const getLeadsForColumn = (columnId: string): Contact[] => {
    return leads.filter(lead => lead.columnId === columnId);
  };

  if (!user) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <p className="text-muted-foreground">Faça login para acessar o CRM</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title="Gestão de Leads"
        description="Organize seus leads por workspace e acompanhe o funil de vendas"
      />

      {/* Workspace Tabs */}
      <div className="flex items-center gap-3 mb-6 border-b border-border pb-2">
        <div className="flex items-center gap-2 flex-1">
          {workspaces.map((workspace) => (
            <button
              key={workspace.id}
              onClick={() => setSelectedWorkspace(workspace.id)}
              className={cn(
                "px-4 py-2 rounded-t-lg font-medium transition-all flex items-center gap-2 relative",
                selectedWorkspace === workspace.id
                  ? `bg-gradient-to-r ${workspace.color} text-white shadow-lg`
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              )}
            >
              <span className={cn(
                "inline-block w-2 h-2 rounded-full",
                selectedWorkspace === workspace.id
                  ? "bg-white"
                  : `bg-gradient-to-r ${workspace.color}`
              )}></span>
              {workspace.name}
            </button>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="ml-2"
            onClick={() => toast.info('Modal de criação de workspace em breve')}
          >
            <Plus className="w-4 h-4 mr-1" />
            Novo Workspace
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => toast.info('Modal de criação de lead em breve')}
          >
            <Plus className="w-4 h-4 mr-1" />
            Novo Lead
          </Button>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={loadKanbanColumns}
          disabled={loadingColumns}
        >
          <RefreshCw className={cn("h-4 w-4", loadingColumns && "animate-spin")} />
        </Button>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {columns.map((column) => {
          const columnLeads = getLeadsForColumn(column.id);

          return (
            <div key={column.id} className="flex flex-col">
              {/* Column Header */}
              <div className={cn(
                "bg-gradient-to-r",
                column.color,
                "text-white p-3 rounded-t-lg font-semibold flex items-center justify-between"
              )}>
                <span>{column.label}</span>
                <span className="text-xs bg-white/20 px-2 py-1 rounded">
                  {columnLeads.length}
                </span>
              </div>

              {/* Column Content */}
              <div className="bg-muted/30 border border-border rounded-b-lg p-3 min-h-[400px] space-y-2">
                {loadingLeads ? (
                  Array(3).fill(0).map((_, i) => (
                    <div key={i} className="bg-card border border-border rounded-lg p-3 animate-pulse">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-muted/50"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-muted/50 rounded w-3/4"></div>
                          <div className="h-3 bg-muted/50 rounded w-1/2"></div>
                          <div className="h-2 bg-muted/50 rounded w-1/4 mt-2"></div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : columnLeads.length > 0 ? (
                  columnLeads.map((lead) => (
                    <div
                      key={lead.id}
                      className="bg-card border border-border rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer"
                    >
                      <div className="flex items-start gap-3">
                        {/* Avatar */}
                        <div className="flex-shrink-0">
                          {lead.avatar ? (
                            <img
                              src={lead.avatar}
                              alt={lead.name}
                              className="w-10 h-10 rounded-full"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                              {lead.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <h4 className="font-semibold text-sm truncate">
                              {lead.name}
                            </h4>
                            {lead.unread > 0 && (
                              <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                                {lead.unread}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate mb-1">
                            {lead.lastMessage}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {lead.time}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-muted-foreground text-sm py-8">
                    Nenhum lead nesta coluna
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* New Column Button/Input - DEBUG VERSION */}
        <div className="flex flex-col min-h-[400px] bg-red-500">
          <button
            onClick={() => alert('Botão funciona!')}
            className="h-full w-full text-white text-2xl font-bold"
          >
            CLIQUE AQUI PARA ADICIONAR COLUNA
          </button>
        </div>

        {columns.length === 0 && !loadingColumns && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            Carregando colunas...
          </div>
        )}
      </div>
    </AppLayout >
  );
}
