import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw, MoreHorizontal, Pencil, Trash2, GripHorizontal, FlaskConical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import * as workspaceService from '@/services/workspaceService';
import * as chatService from '@/services/chatService';
import * as leadService from '@/services/leadService';
import * as remarketingService from '@/services/remarketingService';
import { toast } from 'sonner';
import { LeadDetailSheet } from '@/components/leads/LeadDetailSheet';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface KanbanColumn {
  id: string;
  label: string;
  color: string;
  is_default?: boolean;
  position?: number;
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

// Predefined colors for columns (Tailwind gradients)
const COLUMN_COLORS = [
  { label: 'Azul', value: 'from-blue-500 to-blue-600' },
  { label: 'Verde', value: 'from-green-500 to-green-600' },
  { label: 'Roxo', value: 'from-purple-500 to-purple-600' },
  { label: 'Laranja', value: 'from-orange-500 to-orange-600' },
  { label: 'Amarelo', value: 'from-yellow-500 to-yellow-600' },
  { label: 'Vermelho', value: 'from-red-500 to-red-600' },
  { label: 'Cinza', value: 'from-gray-500 to-gray-600' },
  { label: 'Índigo', value: 'from-indigo-500 to-indigo-600' },
];

export default function LeadsKanban() {
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

  // Edit/Delete state
  const [editingColumn, setEditingColumn] = useState<{ id: string; label: string; color: string } | null>(null);
  const [deletingColumnId, setDeletingColumnId] = useState<string | null>(null);

  // Drag and Drop State
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);

  // CRM Detail Sheet State
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);


  // Load workspaces
  useEffect(() => {
    if (user) {
      loadWorkspaces();

      // Temporary migration to fix workspaces
      const runMigration = async () => {
        const hasMigrated = sessionStorage.getItem('workspace_migration_done');
        if (hasMigrated) return;

        try {
          console.log('Running workspace migration...');
          const currentWorkspaces = await workspaceService.getUserWorkspaces(user.id);

          // 1. Ensure Geral exists
          let geral = currentWorkspaces.find(w => w.name === 'Geral');
          if (!geral) {
            geral = await workspaceService.createWorkspace(user.id, {
              name: 'Geral',
              color: 'from-blue-500 to-blue-600',
              icon: 'layout-dashboard'
            });
          }

          // 2. Ensure Remarketing exists
          let remarketing = currentWorkspaces.find(w => w.name === 'Remarketing');
          if (!remarketing) {
            remarketing = await workspaceService.createWorkspace(user.id, {
              name: 'Remarketing',
              color: 'from-orange-500 to-orange-600',
              icon: 'message-square'
            });
          }

          // 3. Delete others (Campanhas, etc) and set Default
          if (geral) {
            // Make Geral default if needed (requires implementation in service or update)
            // For now we skip forcing default update via service to avoid complexity if valid
          }

          for (const w of currentWorkspaces) {
            if (w.name !== 'Geral' && w.name !== 'Remarketing') {
              try {
                await workspaceService.deleteWorkspace(w.id);
                console.log(`Deleted workspace: ${w.name}`);
              } catch (e) {
                console.error('Failed to delete workspace:', w.name, e);
              }
            }
          }

          sessionStorage.setItem('workspace_migration_done', 'true');
          loadWorkspaces();
          toast.success('Workspaces organizados!');
        } catch (error) {
          console.error('Migration error:', error);
        }
      };

      runMigration();
    }
  }, [user]);

  // Load columns and leads when workspace changes
  useEffect(() => {
    if (selectedWorkspace && user) {
      const ws = workspaces.find(w => w.id === selectedWorkspace);
      if (ws?.name === 'Remarketing') {
        loadRemarketingBoard();
      } else {
        loadKanbanColumns();
        loadLeads();
      }
    }
  }, [selectedWorkspace, user]);

  const loadRemarketingBoard = async () => {
    if (!user) return;
    setLoadingColumns(true);
    setLoadingLeads(true);
    try {
      const { columns: rColumns, leads: rLeads } = await remarketingService.getRemarketingBoardData(user.id);

      // Transform remarketing leads to Contact interface
      const mappedLeads: Contact[] = rLeads.map((lead: any) => ({
        id: lead.id,
        remoteJid: lead.phone,
        name: lead.name,
        avatar: undefined,
        lastMessage: `Passo ${lead.remarketing_step} - Próx: ${lead.remarketing_next_run ? new Date(lead.remarketing_next_run).toLocaleDateString() : 'N/A'}`,
        time: formatTimestamp(lead.remarketing_next_run || new Date().toISOString()),
        unread: 0,
        columnId: lead.column_id, // This matches sequence ID
      }));

      setColumns(rColumns);
      setLeads(mappedLeads);
    } catch (error) {
      console.error('Error loading remarketing board:', error);
      toast.error('Erro ao carregar quadro de Remarketing');
    } finally {
      setLoadingColumns(false);
      setLoadingLeads(false);
    }
  };

  const loadWorkspaces = async () => {
    if (!user) return;

    setLoadingWorkspaces(true);
    try {
      const userWorkspaces = await workspaceService.getUserWorkspaces(user.id);
      setWorkspaces(userWorkspaces);

      // Auto-select default workspace
      const defaultWs = userWorkspaces.find(w => w.is_default);
      if (defaultWs && !selectedWorkspace) {
        setSelectedWorkspace(defaultWs.id);
      } else if (userWorkspaces.length > 0 && !selectedWorkspace) {
        setSelectedWorkspace(userWorkspaces[0].id);
      }
    } catch (error) {
      console.error('Error loading workspaces:', error);
      toast.error('Erro ao carregar workspaces');
    } finally {
      setLoadingWorkspaces(false);
    }
  };

  const loadKanbanColumns = async () => {
    if (!user || !selectedWorkspace) return;

    setLoadingColumns(true);
    try {
      let dbColumns = await chatService.getUserKanbanColumns(user.id, selectedWorkspace);

      // Check if any default "Leads" column exists (checking various common IDs)
      const defaultColumnIds = ['leads', 'leads-novos', 'novo-lead', 'new-leads'];
      const hasLeadsColumn = dbColumns.some(col =>
        col.is_default ||
        defaultColumnIds.includes(col.column_id) ||
        col.label.toLowerCase().includes('lead')
      );

      if (!hasLeadsColumn) {
        console.log('Default Leads column missing, creating it...');
        // Create default column if it doesn't exist
        const defaultColumn = await chatService.createKanbanColumn(user.id, {
          column_id: 'leads',
          label: 'Leads',
          color: 'from-blue-500 to-blue-600',
          is_default: true,
          position: 0,
          workspace_id: selectedWorkspace,
        });

        if (defaultColumn) {
          dbColumns = [defaultColumn, ...dbColumns];
        } else {
          // If creation failed (likely already exists but hidden or constraint error),
          // FORCE show it virtually to prevent UI flash
          console.warn('Failed to create default column, forcing virtual display');
          const virtualColumn: any = {
            column_id: 'leads',
            label: 'Leads',
            color: 'from-blue-500 to-blue-600',
            is_default: true,
            position: 0,
            user_id: user.id
          };
          dbColumns = [virtualColumn, ...dbColumns];
        }
      }

      // Map to interface and Sort by Position ONLY
      // Also FILTER by is_visible (if undefined, assume true for backward compatibility)
      const mappedColumns = dbColumns
        .filter(col => col.is_visible !== false) // Only hide if explicitly false
        .map(col => ({
          id: col.column_id,
          label: col.label,
          color: col.color,
          position: col.position || 0, // Keep position for sorting
          is_default: col.is_default // Keep track of default
        }))
        .sort((a, b) => (a.position || 0) - (b.position || 0));

      setColumns(mappedColumns);

    } catch (error) {
      console.error('Error loading columns:', error);
      // Fallback
      setColumns([{ id: 'leads', label: 'Leads', color: 'from-blue-500 to-blue-600' }]);
    } finally {
      setLoadingColumns(false);
    }
  };

  const loadLeads = async () => {
    if (!user || !selectedWorkspace) return;

    setLoadingLeads(true);
    try {
      // Get leads from dedicated leads table
      console.log('Loading leads for workspace:', selectedWorkspace);
      const dbLeads = await leadService.getLeadsByWorkspace(user.id, selectedWorkspace);
      console.log('Leads loaded:', dbLeads);

      // Map to Contact format for display
      const mappedLeads: Contact[] = dbLeads.map((lead) => ({
        id: lead.id,
        remoteJid: lead.phone,
        name: lead.name,
        avatar: undefined, // Leads don't have avatars by default
        lastMessage: lead.notes || lead.company || lead.email || '',
        time: formatTimestamp(lead.created_at),
        unread: 0, // Leads don't have unread count
        columnId: lead.column_id,
      }));

      setLeads(mappedLeads);
    } catch (error) {
      console.error('Error loading leads:', error);
      toast.error('Erro ao carregar leads');
      setLeads([]);
    } finally {
      setLoadingLeads(false);
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
        color: 'from-gray-500 to-gray-600',
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

  const handleUpdateColumn = async () => {
    if (!editingColumn || !user || !editingColumn.label.trim()) return;

    try {
      await chatService.updateKanbanColumn(editingColumn.id, user.id, {
        label: editingColumn.label,
        color: editingColumn.color
      });

      setColumns(columns.map(col =>
        col.id === editingColumn.id
          ? { ...col, label: editingColumn.label, color: editingColumn.color }
          : col
      ));
      toast.success('Coluna atualizada com sucesso');
      setEditingColumn(null);
    } catch (error) {
      console.error('Error updating column:', error);
      toast.error('Erro ao atualizar coluna');
    }
  };

  const handleDeleteColumn = async () => {
    if (!deletingColumnId || !user) return;

    try {
      await chatService.deleteKanbanColumn(deletingColumnId, user.id);
      setColumns(columns.filter(col => col.id !== deletingColumnId));
      toast.success('Coluna excluída com sucesso');
      setDeletingColumnId(null);
    } catch (error) {
      console.error('Error deleting column:', error);
      toast.error('Erro ao excluir coluna');
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

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, columnId: string) => {
    // Only drag column if not dragging a lead
    if (draggedLeadId) return;

    setDraggedColumnId(columnId);
    e.dataTransfer.effectAllowed = 'move';
    // Set transparent drag image or similar if desired, but default is fine
  };

  const handleLeadDragStart = (e: React.DragEvent, leadId: string) => {
    e.stopPropagation(); // Prevent column drag start
    setDraggedLeadId(leadId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', leadId); // Fallback data
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();

    // CASE 1: LEAD DROP (Moving lead between columns)
    if (draggedLeadId) {
      const leadToMove = leads.find(l => l.id === draggedLeadId);
      if (!leadToMove || leadToMove.columnId === targetColumnId) {
        setDraggedLeadId(null);
        return;
      }

      // Optimistic update
      const updatedLeads = leads.map(l =>
        l.id === draggedLeadId ? { ...l, columnId: targetColumnId } : l
      );
      setLeads(updatedLeads);
      setDraggedLeadId(null);

      // Persist to backend
      try {
        await leadService.updateLeadColumn(draggedLeadId, targetColumnId);
      } catch (error) {
        console.error('Error updating lead column:', error);
        toast.error('Erro ao mover lead');
        loadLeads(); // Revert on error
      }
      return;
    }

    // CASE 2: COLUMN DROP (Reordering columns)
    if (draggedColumnId) {
      if (draggedColumnId === targetColumnId) {
        setDraggedColumnId(null);
        return;
      }

      const originalIndex = columns.findIndex(c => c.id === draggedColumnId);
      const targetIndex = columns.findIndex(c => c.id === targetColumnId);

      if (originalIndex === -1 || targetIndex === -1) return;

      const newColumns = [...columns];
      const [movedColumn] = newColumns.splice(originalIndex, 1);
      newColumns.splice(targetIndex, 0, movedColumn);

      // Update positions
      const updatedColumns = newColumns.map((col, index) => ({
        ...col,
        position: index
      }));

      setColumns(updatedColumns);
      setDraggedColumnId(null);

      // Persist to backend
      if (user) {
        try {
          const updates = updatedColumns.map(col => ({ column_id: col.id, position: col.position || 0 }));
          await chatService.updateKanbanColumnPositions(user.id, updates);
        } catch (error) {
          console.error('Error saving new column order:', error);
          toast.error('Erro ao salvar ordem das colunas');
        }
      }
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Gestão de Leads (Kanban)"
        description="Organize seus leads por workspace e acompanhe o funil de vendas"
      />

      {/* Workspace Tabs */}
      <div className="flex items-center gap-3 mb-6 border-b border-border pb-2">
        <div className="flex items-center gap-2 flex-1 overflow-x-auto">
          {workspaces.map((workspace) => (
            <button
              key={workspace.id}
              onClick={() => setSelectedWorkspace(workspace.id)}
              className={cn(
                "px-4 py-2 rounded-t-lg font-medium transition-all flex items-center gap-2 relative whitespace-nowrap",
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
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="inline-block hover:cursor-not-allowed">
                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-2 whitespace-nowrap opacity-70 border-dashed"
                    disabled
                  >
                    <FlaskConical className="w-4 h-4 mr-1 text-primary animate-pulse" />
                    Novo Workspace
                  </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent className="bg-primary text-primary-foreground border-primary/20">
                <p className="flex items-center gap-2">
                  <span className="text-xl">🧪</span>
                  <span className="font-medium">Estamos cozinhando algo novo!</span>
                </p>
                <p className="text-xs opacity-90 text-center mt-1">Funcionalidade em desenvolvimento</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => { loadKanbanColumns(); loadLeads(); }}
          disabled={loadingColumns || loadingLeads}
        >
          <RefreshCw className={cn("h-4 w-4", (loadingColumns || loadingLeads) && "animate-spin")} />
        </Button>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-220px)] items-start">
        {columns.map((column) => {
          const columnLeads = getLeadsForColumn(column.id);
          const isDraggingColumn = column.id === draggedColumnId;

          return (
            <div
              key={column.id}
              className={cn(
                "flex flex-col min-w-[320px] w-[320px] h-full transition-all bg-muted/10 rounded-lg border border-border/50 shadow-sm",
                isDraggingColumn ? "opacity-50 scale-95" : "opacity-100"
              )}
              draggable
              onDragStart={(e) => handleDragStart(e, column.id)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              {/* Column Header */}
              <div
                className={cn(
                  "cursor-move text-white p-3 rounded-t-lg font-semibold flex items-center justify-between shadow-sm group flex-shrink-0",
                  !column.color.startsWith('#') && "bg-gradient-to-r",
                  !column.color.startsWith('#') && column.color
                )}
                style={{
                  backgroundColor: column.color.startsWith('#') ? column.color : undefined
                }}
              >
                <div className="flex items-center gap-2">
                  <span>{column.label}</span>
                  <span className="text-xs bg-white/20 px-2 py-1 rounded">
                    {columnLeads.length}
                  </span>
                </div>

                {/* Column Actions - Edit/Delete */}
                {!column.is_default && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-white hover:bg-white/20">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditingColumn({ id: column.id, label: column.label, color: column.color })}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setDeletingColumnId(column.id)}
                        className="text-red-500 focus:text-red-500"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              {/* Column Content - Scrollable */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                {loadingLeads ? (
                  <div className="text-center text-muted-foreground text-sm py-8">
                    Carregando...
                  </div>
                ) : columnLeads.length > 0 ? (
                  columnLeads.map((lead) => {
                    const isDraggingLead = lead.id === draggedLeadId;
                    return (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={(e) => handleLeadDragStart(e, lead.id)}
                        onClick={() => setSelectedLeadId(lead.id)}
                        className={cn(
                          "bg-card border border-border rounded-lg p-3 shadow-sm hover:shadow-md transition-all cursor-grab group active:cursor-grabbing",
                          isDraggingLead ? "opacity-50 rotate-3 scale-95" : "opacity-100"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          {/* Avatar / Initial */}
                          <div className="flex-shrink-0">
                            {lead.avatar ? (
                              <img
                                src={lead.avatar}
                                alt={lead.name}
                                className="w-10 h-10 rounded-full"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-inner">
                                {lead.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <h4 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                                {lead.name}
                              </h4>
                            </div>
                            <p className="text-xs text-muted-foreground truncate mb-2">
                              {lead.lastMessage ? lead.lastMessage : 'Sem detalhes'}
                            </p>
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                              <span>{lead.time}</span>
                              {lead.unread > 0 && (
                                <span className="bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                                  {lead.unread}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="text-center text-muted-foreground/50 text-sm py-12 border-2 border-dashed border-muted-foreground/10 rounded-lg bg-muted/5 flex flex-col items-center justify-center gap-2 select-none pointer-events-none">
                    <GripHorizontal className="w-8 h-8 opacity-40" />
                    <p>Arraste leads para cá</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* New Column Button */}
        <div className="flex flex-col min-w-[320px] w-[320px] h-full">
          {isCreatingColumn ? (
            <div className="bg-muted/30 border-2 border-dashed border-border rounded-lg p-4 flex flex-col gap-3 h-full">
              <div className="font-medium text-sm">Nova Coluna</div>
              <input
                type="text"
                placeholder="Nome da coluna"
                className="w-full bg-background border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateColumn()}
                autoFocus
              />
              <div className="flex gap-2 mt-auto">
                <Button size="sm" variant="ghost" onClick={() => setIsCreatingColumn(false)} className="flex-1">Cancelar</Button>
                <Button size="sm" onClick={handleCreateColumn} disabled={!newColumnName.trim()} className="flex-1">Criar</Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsCreatingColumn(true)}
              className="flex flex-col items-center justify-center h-full border-2 border-dashed border-border hover:border-primary/60 rounded-lg bg-muted/10 hover:bg-muted/30 transition-all group gap-4 p-8"
            >
              <div className="w-16 h-16 rounded-full bg-background shadow-sm flex items-center justify-center group-hover:bg-background/80 transition-colors border border-border">
                <Plus className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <span className="font-medium text-muted-foreground group-hover:text-primary transition-colors">Adicionar Coluna</span>
            </button>
          )}
        </div>
      </div>

      {/* Edit Column Dialog */}
      <Dialog open={!!editingColumn} onOpenChange={(open) => !open && setEditingColumn(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Coluna</DialogTitle>
            <DialogDescription>
              Altere o nome e a cor da coluna do Kanban.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Nome
              </Label>
              <Input
                id="name"
                value={editingColumn?.label || ''}
                onChange={(e) => setEditingColumn(prev => prev ? { ...prev, label: e.target.value } : null)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">Cor</Label>
              <div className="col-span-3 grid grid-cols-4 gap-2">
                {COLUMN_COLORS.map((color) => (
                  <button
                    key={color.value}
                    className={cn(
                      "w-8 h-8 rounded-full shadow-sm ring-offset-2 transition-all",
                      color.value === editingColumn?.color ? "ring-2 ring-primary scale-110" : "hover:scale-105",
                      `bg-gradient-to-r ${color.value}`
                    )}
                    onClick={() => setEditingColumn(prev => prev ? { ...prev, color: color.value } : null)}
                    title={color.label}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingColumn(null)}>Cancelar</Button>
            <Button onClick={handleUpdateColumn}>Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Column Alert */}
      <AlertDialog open={!!deletingColumnId} onOpenChange={(open) => !open && setDeletingColumnId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Coluna?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta coluna? Os leads nesta coluna não serão excluídos, mas ficarão sem coluna associada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteColumn}
              className="bg-red-500 hover:bg-red-600"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Lead Detail Sheet - CRM Features */}
      <LeadDetailSheet
        leadId={selectedLeadId}
        isOpen={!!selectedLeadId}
        onClose={() => setSelectedLeadId(null)}
        onLeadUpdated={loadLeads}
      />

    </div>
  );
}
