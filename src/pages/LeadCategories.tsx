import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, Tag, Palette, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import * as chatService from '@/services/chatService';
import * as workspaceService from '@/services/workspaceService';

export default function LeadCategories() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<chatService.KanbanColumn[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<chatService.KanbanColumn | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    cor: '#8B5CF6',
    is_visible: true,
  });

  const [defaultWorkspaceId, setDefaultWorkspaceId] = useState<string | null>(null);

  const defaultColors = [
    '#8B5CF6', // purple
    '#3B82F6', // blue
    '#10B981', // green
    '#F59E0B', // amber
    '#EF4444', // red
    '#EC4899', // pink
    '#6366F1', // indigo
    '#14B8A6', // teal
  ];

  useEffect(() => {
    if (user) {
      loadCategories();
      loadDefaultWorkspace();
    }
  }, [user]);

  const loadDefaultWorkspace = async () => {
    if (!user) return;
    try {
      // 1. Try to get the explicit default workspace
      let workspace = await workspaceService.getDefaultWorkspace(user.id);

      // 2. Fallback: If no default set, grab the first available workspace
      if (!workspace) {
        const workspaces = await workspaceService.getUserWorkspaces(user.id);
        if (workspaces.length > 0) {
          workspace = workspaces[0];
        }
      }

      if (workspace) {
        setDefaultWorkspaceId(workspace.id);
      }
    } catch (error) {
      console.error('Error loading default workspace:', error);
    }
  };

  const loadCategories = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      // 1. Get User's Workspaces (optional, if we needed to default to one)
      // const workspaces = await workspaceService.getUserWorkspaces(user.id);


      // Prioritize fetching shared columns (if available) or fallback to user's
      const columns = await chatService.getUserKanbanColumns(user.id);
      setCategories(columns);
    } catch (error) {
      console.error('Error loading categories:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao carregar categorias.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = (category?: chatService.KanbanColumn) => {
    if (category) {
      setSelectedCategory(category);
      setFormData({
        nome: category.label,
        descricao: category.description || '',
        cor: category.color,
        is_visible: category.is_visible !== undefined ? category.is_visible : true,
      });
    } else {
      setSelectedCategory(null);
      setFormData({
        nome: '',
        descricao: '',
        cor: '#8B5CF6',
        is_visible: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!user) return;
    if (!formData.nome.trim()) {
      toast({
        title: 'Erro',
        description: 'O nome da categoria é obrigatório.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      if (selectedCategory) {
        // Update
        const updated = await chatService.updateKanbanColumn(selectedCategory.column_id, user.id, {
          label: formData.nome,
          description: formData.descricao,
          color: formData.cor,
          is_visible: formData.is_visible
        });

        if (updated) {
          toast({ title: 'Sucesso', description: 'Categoria atualizada com sucesso.' });
          loadCategories();
          setIsDialogOpen(false);
        } else {
          throw new Error('Falha ao atualizar');
        }
      } else {
        // Create
        // Generate a simple ID from name
        const slug = formData.nome.toLowerCase().trim().replace(/[^a-z0-9]/g, '-');
        const uniqueId = `${slug}-${Date.now()}`;

        const created = await chatService.createKanbanColumn(user.id, {
          column_id: uniqueId,
          label: formData.nome,
          description: formData.descricao,
          color: formData.cor,
          is_visible: formData.is_visible,
          position: categories.length, // Append to end
          workspace_id: defaultWorkspaceId || undefined // Assign to default workspace
        });

        if (created) {
          toast({ title: 'Sucesso', description: 'Categoria criada com sucesso.' });
          loadCategories();
          setIsDialogOpen(false);
        } else {
          throw new Error('Falha ao criar');
        }
      }
    } catch (error) {
      console.error(error);
      toast({
        title: 'Erro',
        description: 'Erro ao salvar categoria.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (selectedCategory && user) {
      try {
        await chatService.deleteKanbanColumn(selectedCategory.column_id, user.id);
        toast({
          title: 'Sucesso',
          description: 'Categoria excluída com sucesso.',
        });
        loadCategories();
      } catch (error) {
        toast({
          title: 'Erro',
          description: 'Erro ao excluir categoria.',
          variant: 'destructive',
        });
      }
    }
    setIsDeleteDialogOpen(false);
    setSelectedCategory(null);
  };

  const openDeleteDialog = (category: chatService.KanbanColumn) => {
    setSelectedCategory(category);
    setIsDeleteDialogOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Categorias de Leads"
        description="Gerencie as categorias para organizar seus leads"
      >
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="w-4 h-4" />
          Nova Categoria
        </Button>
      </PageHeader>

      {/* Categories Table */}
      <div className="border rounded-lg overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">Cor</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="w-24 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  <div className="flex justify-center items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Carregando...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : categories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  Nenhuma categoria cadastrada.
                </TableCell>
              </TableRow>
            ) : (
              categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell>
                    <div
                      className={`w-6 h-6 rounded-full border-2 border-background shadow-sm bg-gradient-to-r ${category.color.includes('gradient') ? category.color : ''}`}
                      style={{ backgroundColor: !category.color.includes('gradient') ? category.color : undefined }}
                    >
                      {/* Fallback for gradient classes vs hex codes */}
                      {!category.color.includes('gradient') && !category.color.startsWith('#') && (
                        <div className={`w-full h-full rounded-full bg-gradient-to-r ${category.color}`}></div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-muted-foreground" />
                      {category.label}
                      {!category.is_visible && (
                        <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded border">
                          Oculto
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {category.description || '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(category)}
                        className="h-8 w-8"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      {!category.is_default && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeleteDialog(category)}
                          className="h-8 w-8 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedCategory ? 'Editar Categoria' : 'Nova Categoria'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Cliente VIP"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descreva o propósito desta categoria..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Cor
              </Label>
              <div className="flex flex-wrap gap-2">
                {defaultColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, cor: color })}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${formData.cor === color
                      ? 'border-foreground scale-110'
                      : 'border-transparent hover:scale-105'
                      }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Label htmlFor="customColor" className="text-sm text-muted-foreground">
                  Ou escolha:
                </Label>
                <Input
                  id="customColor"
                  type="color"
                  value={formData.cor.startsWith('#') ? formData.cor : '#000000'}
                  onChange={(e) => setFormData({ ...formData, cor: e.target.value })}
                  className="w-12 h-8 p-1 cursor-pointer"
                />
              </div>
            </div>

            <div className="flex items-center items-start space-x-2 pt-2">
              <Switch
                id="is_visible"
                checked={formData.is_visible}
                onCheckedChange={(checked) => setFormData({ ...formData, is_visible: checked })}
              />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor="is_visible">
                  Mostrar no Kanban
                </Label>
                <p className="text-sm text-muted-foreground">
                  Se desativado, esta categoria não aparecerá no quadro Kanban.
                </p>
              </div>
            </div>

            {/* Preview */}
            <div className="pt-4 border-t">
              <Label className="text-sm text-muted-foreground mb-2 block">Preview</Label>
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: formData.cor.startsWith('#') ? formData.cor : undefined }}
                >
                  {!formData.cor.startsWith('#') && (
                    <div className={`w-full h-full rounded-full bg-gradient-to-r ${formData.cor}`}></div>
                  )}
                </div>
                <span className="font-medium">{formData.nome || 'Nome da categoria'}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {selectedCategory ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir categoria?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A categoria "{selectedCategory?.label}" será
              permanentemente excluída.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
