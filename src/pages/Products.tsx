import { useState, useEffect } from 'react';
import { Plus, Search, Pencil, Trash2, ImageIcon, Package } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { fileToBase64 } from '@/lib/fileUtils';
import { useAuth } from '@/contexts/AuthContext';
import * as productService from '@/services/productService';
import type { Product } from '@/services/productService';

export default function Products() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const { toast } = useToast();

  // Create/Edit Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    unit: 'unidade',
    image_base64: '',
    stock_quantity: 0,
  });

  useEffect(() => {
    if (user) {
      loadProducts();
    }
  }, [user]);

  const loadProducts = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await productService.getProducts(user.id);
      setProducts(data);
    } catch (error) {
      console.error(error);
      toast({ title: 'Erro ao carregar produtos', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      if (editingProduct) {
        const updated = await productService.updateProduct(editingProduct.id, user.id, formData);
        if (updated) {
          setProducts(products.map((p) => (p.id === editingProduct.id ? updated : p)));
          toast({ title: 'Produto atualizado!' });
          resetForm();
        }
      } else {
        const created = await productService.createProduct(user.id, formData);
        if (created) {
          setProducts([created, ...products]);
          toast({ title: 'Produto criado!' });
          resetForm();
        }
      }
    } catch (error) {
      console.error(error);
      toast({ title: 'Erro ao salvar produto', variant: 'destructive' });
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price,
      unit: product.unit,
      image_base64: product.image_base64 || '',
      stock_quantity: product.stock_quantity || 0,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    try {
      const success = await productService.deleteProduct(id, user.id);
      if (success) {
        setProducts(products.filter((p) => p.id !== id));
        toast({ title: 'Produto removido!', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Erro ao remover produto', variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', price: 0, unit: 'unidade', image_base64: '', stock_quantity: 0 });
    setEditingProduct(null);
    setIsDialogOpen(false);
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const base64 = await fileToBase64(file);
      setFormData({ ...formData, image_base64: base64 });
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader title="Cadastro de Produtos" description="Gerencie seu catálogo de produtos e estoque">
        <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsDialogOpen(open); }}>
          <DialogTrigger asChild>
            <Button className="gradient-primary glow">
              <Plus className="w-4 h-4 mr-2" />
              Novo Produto
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingProduct ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Nome</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Valor (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                    required
                  />
                </div>
                <div>
                  <Label>Estoque</Label>
                  <Input
                    type="number"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Switch
                  checked={formData.unit === 'm2'}
                  onCheckedChange={(checked) => setFormData({ ...formData, unit: checked ? 'm2' : 'unidade' })}
                />
                <Label>Venda por m²</Label>
              </div>

              <div>
                <Label>Imagem</Label>
                <Input type="file" accept="image/*" onChange={handleImageChange} />
                {formData.image_base64 && (
                  <div className="mt-2">
                    <img src={formData.image_base64} alt="Preview" className="w-20 h-20 object-cover rounded-lg" />
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>
                <Button type="submit" className="gradient-primary">{editingProduct ? 'Atualizar' : 'Criar'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar produtos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 max-w-md"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando produtos...</div>
      ) : products.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
          Sem produtos cadastrados.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <div key={product.id} className="rounded-xl border border-border bg-card p-6 hover:border-primary/50 transition-colors group">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  {product.image_base64 ? (
                    <img src={product.image_base64} alt={product.name} className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{product.name}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>

                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-lg font-bold text-primary">
                      R$ {product.price.toFixed(2)}
                    </span>
                    <span className="text-xs text-muted-foreground px-2 py-0.5 rounded-full bg-muted">
                      {product.unit === 'm2' ? 'por m²' : 'unidade'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                    <Package className="w-4 h-4" />
                    <span>Estoque: </span>
                    <span className={product.stock_quantity > 0 ? "text-green-500 font-medium" : "text-red-500 font-medium"}>
                      {product.stock_quantity}
                    </span>
                  </div>

                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="sm" variant="ghost" onClick={() => handleEdit(product)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(product.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
