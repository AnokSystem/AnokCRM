import { useState, useEffect } from 'react';
import { Plus, Search, Pencil, Trash2, Building2, Globe, Phone, FileText, Share2, Eye, MapPin, Mail } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { brasilApi } from '@/services/nocodb';
import * as supplierService from '@/services/supplierService';
import { useAuth } from '@/contexts/AuthContext';
import type { SupplierData } from '@/services/supplierService';

export default function Suppliers() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any | null>(null);
  const [viewingSupplier, setViewingSupplier] = useState<any | null>(null);
  const [isLoadingCNPJ, setIsLoadingCNPJ] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<SupplierData>({
    razao_social: '',
    nome_fantasia: '',
    cnpj: '',
    endereco: '',
    cidade: '',
    estado: '',
    cep: '',
    telefone: '',
    email: '',
    website: '',
    whatsapp: '',
    social_media: '',
    notes: '',
  });

  useEffect(() => {
    if (user) {
      loadSuppliers();
    }
  }, [user]);

  const loadSuppliers = async () => {
    if (!user) return;
    setLoading(true);
    const data = await supplierService.getSuppliers(user.id);
    setSuppliers(data || []);
    setLoading(false);
  };

  const filteredSuppliers = suppliers.filter((s) =>
    s.razao_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.nome_fantasia?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.cnpj?.includes(searchTerm)
  );

  const handleCNPJLookup = async () => {
    if (formData.cnpj && formData.cnpj.length >= 14) {
      setIsLoadingCNPJ(true);
      try {
        const data = await brasilApi.consultarCNPJ(formData.cnpj);
        setFormData({
          ...formData,
          razao_social: data.razao_social,
          nome_fantasia: data.nome_fantasia,
          endereco: `${data.logradouro}, ${data.numero}`,
          cidade: data.municipio,
          estado: data.uf,
          cep: data.cep,
          telefone: data.ddd_telefone_1,
          email: data.email,
        });
        toast({ title: 'CNPJ encontrado!', description: 'Dados preenchidos automaticamente' });
      } catch {
        toast({ title: 'Erro ao consultar CNPJ', variant: 'destructive' });
      } finally {
        setIsLoadingCNPJ(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    try {
      if (editingSupplier) {
        const updated = await supplierService.updateSupplier(editingSupplier.id, formData);
        if (updated) {
          setSuppliers(suppliers.map(s => s.id === editingSupplier.id ? updated : s));
          toast({ title: 'Fornecedor atualizado!' });
          resetForm();
        } else {
          toast({ title: 'Erro ao atualizar', variant: 'destructive' });
        }
      } else {
        const newSupplier = await supplierService.createSupplier(user.id, formData);
        if (newSupplier) {
          setSuppliers([newSupplier, ...suppliers]);
          toast({ title: 'Fornecedor criado!' });
          resetForm();
        } else {
          toast({ title: 'Erro ao criar', variant: 'destructive' });
        }
      }
    } catch (error) {
      console.error(error);
      toast({ title: 'Erro ao salvar', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (supplier: any) => {
    setEditingSupplier(supplier);
    setFormData({
      razao_social: supplier.razao_social,
      nome_fantasia: supplier.nome_fantasia || '',
      cnpj: supplier.cnpj || '',
      endereco: supplier.endereco || '',
      cidade: supplier.cidade || '',
      estado: supplier.estado || '',
      cep: supplier.cep || '',
      telefone: supplier.telefone || '',
      email: supplier.email || '',
      website: supplier.website || '',
      whatsapp: supplier.whatsapp || '',
      social_media: supplier.social_media || '',
      notes: supplier.notes || '',
    });
    setIsDialogOpen(true);
    setViewingSupplier(null);
  };

  const handleView = (supplier: any) => {
    setViewingSupplier(supplier);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este fornecedor?')) return;

    const success = await supplierService.deleteSupplier(id);
    if (success) {
      setSuppliers(suppliers.filter((s) => s.id !== id));
      toast({ title: 'Fornecedor removido!', variant: 'destructive' });
    } else {
      toast({ title: 'Erro ao remover', variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setFormData({
      razao_social: '',
      nome_fantasia: '',
      cnpj: '',
      endereco: '',
      cidade: '',
      estado: '',
      cep: '',
      telefone: '',
      email: '',
      website: '',
      whatsapp: '',
      social_media: '',
      notes: '',
    });
    setEditingSupplier(null);
    setIsDialogOpen(false);
  };

  return (
    <div className="animate-fade-in">
      <PageHeader title="Cadastro de Fornecedores" description="Gerencie seus fornecedores">
        <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsDialogOpen(open); }}>
          <DialogTrigger asChild>
            <Button className="gradient-primary glow">
              <Plus className="w-4 h-4 mr-2" />
              Novo Fornecedor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingSupplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label>CNPJ</Label>
                  <Input
                    value={formData.cnpj}
                    onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                    placeholder="00.000.000/0000-00"
                  />
                </div>
                <div className="pt-6">
                  <Button type="button" variant="outline" onClick={handleCNPJLookup} disabled={isLoadingCNPJ}>
                    {isLoadingCNPJ ? 'Buscando...' : 'Buscar CNPJ'}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Razão Social *</Label>
                  <Input
                    value={formData.razao_social}
                    onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Nome Fantasia</Label>
                  <Input
                    value={formData.nome_fantasia}
                    onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value })}
                  />
                </div>

                {/* Contact Info */}
                <div>
                  <Label>Telefone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input className="pl-9" value={formData.telefone} onChange={(e) => setFormData({ ...formData, telefone: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label>WhatsApp</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-600" />
                    <Input className="pl-9" value={formData.whatsapp} onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })} placeholder="5511999999999" />
                  </div>
                </div>

                <div className="col-span-2">
                  <Label>E-mail</Label>
                  <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                </div>

                {/* Digital Presence */}
                <div>
                  <Label>Site</Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input className="pl-9" value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })} placeholder="https://" />
                  </div>
                </div>
                <div>
                  <Label>Redes Sociais</Label>
                  <div className="relative">
                    <Share2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input className="pl-9" value={formData.social_media} onChange={(e) => setFormData({ ...formData, social_media: e.target.value })} placeholder="@instagram" />
                  </div>
                </div>

                {/* Address */}
                <div className="col-span-2">
                  <Label>Endereço</Label>
                  <Input value={formData.endereco} onChange={(e) => setFormData({ ...formData, endereco: e.target.value })} />
                </div>
                <div>
                  <Label>Cidade</Label>
                  <Input value={formData.cidade} onChange={(e) => setFormData({ ...formData, cidade: e.target.value })} />
                </div>
                <div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Estado</Label>
                      <Input value={formData.estado} onChange={(e) => setFormData({ ...formData, estado: e.target.value })} />
                    </div>
                    <div>
                      <Label>CEP</Label>
                      <Input value={formData.cep} onChange={(e) => setFormData({ ...formData, cep: e.target.value })} />
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div className="col-span-2">
                  <Label>Anotações</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Informações adicionais, observações importantes..."
                    className="min-h-[80px]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={resetForm} disabled={saving}>Cancelar</Button>
                <Button type="submit" className="gradient-primary" disabled={saving}>
                  {saving ? 'Salvando...' : (editingSupplier ? 'Atualizar' : 'Criar')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por razão social, nome fantasia ou CNPJ..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 max-w-md"
        />
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border">
              <TableHead>Empresa</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Localização</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Carregando...</TableCell>
              </TableRow>
            ) : filteredSuppliers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nenhum fornecedor encontrado.</TableCell>
              </TableRow>
            ) : (
              filteredSuppliers.map((supplier) => (
                <TableRow key={supplier.id} className="border-border hover:bg-muted/50">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{supplier.nome_fantasia || supplier.razao_social}</p>
                        <p className="text-sm text-muted-foreground">{supplier.razao_social}</p>
                        {supplier.cnpj && <p className="text-xs text-muted-foreground font-mono">{supplier.cnpj}</p>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {supplier.telefone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="w-3 h-3 text-muted-foreground" />
                          {supplier.telefone}
                        </div>
                      )}
                      {supplier.whatsapp && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="w-3 h-3 text-green-600" />
                          {supplier.whatsapp}
                        </div>
                      )}
                      {supplier.email && <p className="text-sm text-muted-foreground">{supplier.email}</p>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm">{supplier.cidade} / {supplier.estado}</p>
                    {supplier.website && (
                      <a href={supplier.website} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1 mt-1">
                        <Globe className="w-3 h-3" />
                        Visitar site
                      </a>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="icon" variant="ghost" onClick={() => handleView(supplier)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleEdit(supplier)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDelete(supplier.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* View Supplier Dialog */}
      <Dialog open={!!viewingSupplier} onOpenChange={(open) => !open && setViewingSupplier(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Fornecedor</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/30 border border-border">
              <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Building2 className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{viewingSupplier?.nome_fantasia || viewingSupplier?.razao_social}</h2>
                <p className="text-muted-foreground">{viewingSupplier?.razao_social}</p>
                {viewingSupplier?.cnpj && <p className="font-mono text-sm mt-1">{viewingSupplier?.cnpj}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2"><Phone className="w-4 h-4 text-primary" /> Contato</h3>
                <div className="space-y-2 text-sm">
                  {viewingSupplier?.email && (
                    <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span>{viewingSupplier.email}</span>
                    </div>
                  )}
                  {viewingSupplier?.telefone && (
                    <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span>{viewingSupplier.telefone}</span>
                    </div>
                  )}
                  {viewingSupplier?.whatsapp && (
                    <div className="flex items-center gap-2 p-2 rounded-md bg-green-500/10 border border-green-500/20">
                      <Phone className="w-4 h-4 text-green-500" />
                      <span className="text-green-600">{viewingSupplier.whatsapp}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> Endereço</h3>
                <div className="space-y-1 text-sm p-3 rounded-md bg-muted/50 border border-border">
                  <p>{viewingSupplier?.endereco}</p>
                  <p>{viewingSupplier?.cidade} - {viewingSupplier?.estado}</p>
                  <p className="text-muted-foreground">{viewingSupplier?.cep}</p>
                </div>
              </div>
            </div>

            {(viewingSupplier?.website || viewingSupplier?.social_media) && (
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2"><Globe className="w-4 h-4 text-primary" /> Presença Digital</h3>
                <div className="flex flex-wrap gap-3">
                  {viewingSupplier?.website && (
                    <a href={viewingSupplier.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors text-sm">
                      <Globe className="w-3 h-3" /> Website
                    </a>
                  )}
                  {viewingSupplier?.social_media && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-pink-500/10 text-pink-500 text-sm">
                      <Share2 className="w-3 h-3" /> {viewingSupplier.social_media}
                    </div>
                  )}
                </div>
              </div>
            )}

            {viewingSupplier?.notes && (
              <div className="space-y-2">
                <h3 className="font-semibold flex items-center gap-2"><FileText className="w-4 h-4 text-primary" /> Anotações</h3>
                <div className="p-4 rounded-lg bg-muted/30 border border-border text-sm leading-relaxed whitespace-pre-wrap">
                  {viewingSupplier.notes}
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-end pt-4">
            <Button onClick={() => setViewingSupplier(null)}>Fechar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
