import { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { Plus, Search, Trash2, FileText, Calculator, Save, History, ShoppingCart, Filter, Calendar, Pencil, Eye, X } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
} from '@/components/ui/alert-dialog';
import { Badge } from "@/components/ui/badge";
import { useToast } from '@/hooks/use-toast';
import type { OrderItem } from '@/types'; // Keeping types import if needed, but defining structure in service

import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import * as leadService from '@/services/leadService';
import * as productService from '@/services/productService';
import * as orderService from '@/services/orderService';
import type { Product } from '@/services/productService';
import type { Order } from '@/services/orderService';

export default function Orders() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Tabs
  const [activeTab, setActiveTab] = useState("new");

  // State
  const [leads, setLeads] = useState<leadService.Lead[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [companySettings, setCompanySettings] = useState<any>(null); // Store company settings

  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [selectedLead, setSelectedLead] = useState<leadService.Lead | null>(null);

  const [loadingLeads, setLoadingLeads] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [saving, setSaving] = useState(false);

  // Order Item State
  const [orderItems, setOrderItems] = useState<orderService.OrderItem[]>([]);
  const [currentProductId, setCurrentProductId] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [width, setWidth] = useState<number>(0);
  const [height, setHeight] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);

  // Search/Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [creationStatus, setCreationStatus] = useState<string>('orcamento');

  // Edit & Preview State
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [viewOrder, setViewOrder] = useState<Order | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);

  const { toast } = useToast();

  const selectedProduct = products.find((p) => p.id === currentProductId);

  // Load Data
  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoadingLeads(true);
    setLoadingProducts(true);
    setLoadingOrders(true);

    try {
      const { data: settingsData } = await supabase
        .from('organization_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (settingsData) {
        setCompanySettings(settingsData);
      }

      const [leadsData, productsData, ordersData] = await Promise.all([
        leadService.getAllLeads(user.id),
        productService.getProducts(user.id),
        orderService.getOrders(user.id)
      ]);

      setLeads(leadsData);
      setProducts(productsData);
      setOrders(ordersData);
    } catch (error) {
      console.error(error);
      toast({ title: 'Erro ao carregar dados', variant: 'destructive' });
    } finally {
      setLoadingLeads(false);
      setLoadingProducts(false);
      setLoadingOrders(false);
    }
  };

  // Update selected lead object when ID changes
  useEffect(() => {
    if (selectedLeadId) {
      const l = leads.find(lead => lead.id === selectedLeadId) || null;
      setSelectedLead(l);
    } else {
      setSelectedLead(null);
    }
  }, [selectedLeadId, leads]);

  const addItem = () => {
    // ... (existing addItem implementation)
    if (!selectedProduct) return;

    let subtotal = 0;
    // Check unit compatibility (handling "unidade", "m2", "g")
    if (selectedProduct.unit === 'm2') {
      const area = width * height;
      if (area <= 0) {
        toast({ title: 'Informe largura e altura', variant: 'destructive' });
        return;
      }
      subtotal = area * selectedProduct.price * quantity;
    } else if (selectedProduct.unit === 'g') {
      // Price is per gram (or per unit of weight) usually, 
      // assuming price is R$ per gram based on user request "cadastrar produto por grama" 
      // OR "product price is per KG but sold by gram"? 
      // User said "cadastrar produto por pelo (grama)". Typically means price is per gram.
      // Item Total = Price * Quantity (Weight in g). 
      // No, usually user enters price per package or per kg.
      // Let's assume Price is Per Gram for now as per "Product Price" field.
      subtotal = selectedProduct.price * quantity;
    } else {
      subtotal = selectedProduct.price * quantity;
    }

    const newItem: orderService.OrderItem = {
      product_id: selectedProduct.id,
      product_name: selectedProduct.name,
      quantity: quantity,
      price: selectedProduct.price,
      width: selectedProduct.unit === 'm2' ? width : undefined,
      height: selectedProduct.unit === 'm2' ? height : undefined,
      subtotal,
    };

    setOrderItems([...orderItems, newItem]);
    setCurrentProductId('');
    setQuantity(1);
    setWidth(0);
    setHeight(0);
    toast({ title: 'Item adicionado!' });
  };

  const removeItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const subTotal = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
  const discountAmount = (subTotal * discount) / 100;
  const total = subTotal - discountAmount;

  const generatePDF = (orderData?: Order) => {
    const dataToPrint = orderData ? {
      leadName: orderData.client_name,
      leadId: orderData.client_id,
      items: orderData.items,
      total: orderData.total_amount,
      status: orderData.status,
      date: new Date(orderData.created_at),
      id: orderData.id,
      discount: orderData.discount || 0,
    } : {
      leadName: selectedLead?.name,
      leadId: selectedLead?.id,
      items: orderItems,
      total: total,
      discount: discount,
      status: creationStatus,
      date: new Date(),
      id: editingOrderId || 'NOVO',
    };

    if (!dataToPrint.leadName || dataToPrint.items.length === 0) {
      toast({ title: 'Dados insuficientes para gerar PDF', variant: 'destructive' });
      return;
    }

    // Get client details
    const lead = leads.find(l => l.id === dataToPrint.leadId);

    // Get client details using new fields with fallbacks
    // Get client details using correct Lead fields
    const clientAddress = (lead?.address_street && lead?.address_street.trim() !== '')
      ? `${lead.address_street}, ${lead.address_number || 'S/N'}`
      : (lead?.custom_fields?.address || lead?.custom_fields?.endereco || 'Endereço não informado');

    const clientDistrict = lead?.address_district || lead?.custom_fields?.district || lead?.custom_fields?.bairro || 'Bairro não informado';

    const clientCity = lead?.address_city
      ? `${lead.address_city}${lead.address_state ? ` / ${lead.address_state}` : ''}`
      : (lead?.custom_fields?.city || lead?.custom_fields?.cidade || 'Cidade não informada');

    const clientCpfCnpj = lead?.cpf || lead?.cnpj || lead?.custom_fields?.cpf || lead?.custom_fields?.cnpj || 'CPF/CNPJ não informado';
    const clientPhone = lead?.phone || 'Telefone não informado';
    const clientEmail = lead?.email || '';

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // --- HELPER FUNCTIONS ---
    const drawBox = (x: number, y: number, w: number, h: number, fillColor?: string) => {
      if (fillColor) {
        doc.setFillColor(fillColor);
        doc.rect(x, y, w, h, 'F');
      }
      doc.setDrawColor(0);
      doc.rect(x, y, w, h);
    };

    const drawLine = (x1: number, y1: number, x2: number, y2: number) => {
      doc.setDrawColor(0);
      doc.line(x1, y1, x2, y2);
    };

    // --- HEADER (Company Info) ---
    // Logo Box
    drawBox(10, 10, 50, 30);
    if (companySettings?.empresa_logo_base64) {
      try {
        doc.addImage(companySettings.empresa_logo_base64, 'PNG', 11, 11, 48, 28, undefined, 'FAST');
      } catch (e) {
        console.error('Error adding logo', e);
      }
    } else {
      doc.setFontSize(10);
      doc.text("Logo da Empresa", 15, 25);
    }

    // Company Details
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11); // Reduced size as requested
    // Limit width of company name to avoid hitting page number
    const companyName = companySettings?.empresa_nome?.toUpperCase() || "NOME DA EMPRESA";
    doc.text(companyName, 65, 15, { maxWidth: 110 });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const address = companySettings?.empresa_endereco || "Endereço da Empresa";
    doc.text(`ENDEREÇO: ${address}`, 65, 23); // Adjusted Y slightly

    const contact = `TELEFONE: ${companySettings?.empresa_telefone || ""} - ${companySettings?.empresa_email || ""}`;
    doc.text(contact, 65, 28);

    // Document Title & Date
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    const title = dataToPrint.status === 'orcamento' ? 'NOTA DE ORÇAMENTO' : 'PEDIDO DE VENDA';
    doc.text(title, 65, 35);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const formattedDate = dataToPrint.date.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    doc.text(formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1), 65, 40);

    // Page number and time (Top Right) -> Right Aligned
    doc.setFontSize(8);
    const rightEdge = 200;
    doc.text(`Pag.: 1 de 1`, rightEdge, 15, { align: 'right' });
    doc.text(dataToPrint.date.toLocaleTimeString(), rightEdge, 20, { align: 'right' });

    // Disclaimer
    doc.setFontSize(7); // Slightly smaller to fit
    doc.text("Não é documento fiscal - Não é valido como recibo e como garantia de mercadoria - Não comprova pagto.", 65, 44);

    drawLine(10, 46, 200, 46); // Separator

    // --- ORDER & CLIENT INFO ---
    let y = 52;
    const col1 = 15;
    const col2 = 140; // Second column for dates

    // Left Column (Document & Client)
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic"); // Labels italic
    doc.text("Documento:", col1, y);
    doc.setFont("helvetica", "bold"); // Values bold
    doc.text(dataToPrint.id.toString().slice(0, 8).toUpperCase(), col1 + 25, y);

    y += 5;
    doc.setFont("helvetica", "italic");
    doc.text("Cliente:", col1, y);
    doc.setFont("helvetica", "bold");
    doc.text(`${dataToPrint.leadName}`, col1 + 25, y);

    y += 5;
    doc.setFont("helvetica", "italic");
    doc.text("Endereço:", col1, y);
    doc.setFont("helvetica", "normal");
    doc.text(clientAddress, col1 + 25, y);

    y += 5;
    doc.setFont("helvetica", "italic");
    doc.text("Bairro:", col1, y);
    doc.setFont("helvetica", "normal");
    doc.text(clientDistrict, col1 + 25, y);

    y += 5;
    doc.setFont("helvetica", "italic");
    doc.text("Cidade:", col1, y);
    doc.setFont("helvetica", "normal");
    doc.text(clientCity, col1 + 25, y);

    y += 5;
    doc.setFont("helvetica", "italic");
    doc.text("Telefone:", col1, y);
    doc.setFont("helvetica", "normal");
    doc.text(clientPhone, col1 + 25, y);

    // Right Column (Dates & Docs)
    y = 52; // Reset Y
    doc.setFont("helvetica", "italic");
    doc.text("Dt.Emissão:", col2, y);
    doc.setFont("helvetica", "normal");
    doc.text(dataToPrint.date.toLocaleDateString(), col2 + 25, y);

    y += 5;
    doc.setFont("helvetica", "italic");
    doc.text("Dt.Validade:", col2, y);
    doc.setFont("helvetica", "normal");
    const validityDate = new Date(dataToPrint.date);
    validityDate.setDate(validityDate.getDate() + 15); // 15 days validity
    doc.text(validityDate.toLocaleDateString(), col2 + 25, y);

    y += 5;
    doc.setFont("helvetica", "italic");
    doc.text("CNPJ/CPF:", col2, y);
    doc.setFont("helvetica", "normal");
    doc.text(clientCpfCnpj, col2 + 25, y);

    // --- SUB-HEADER BACKGROUND ---
    y = 88;
    doc.setFillColor(220, 220, 220); // Light gray
    doc.rect(10, y, 190, 8, 'F');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(0);

    // Columns: Código | Descrição | Medida | Qte | Valor Unit | Valor Desconto | Valor Total
    const xCode = 12;
    const xDesc = 35; // Moved right slightly
    const xMeas = 115;
    const xQty = 135;
    const xUnit = 160;
    const xTotal = 195; // Right aligned reference

    doc.text("Código", xCode, y + 5);
    doc.text("Descrição", xDesc, y + 5);
    doc.text("Medida", xMeas, y + 5, { align: 'center' });
    doc.text("Qtde", xQty, y + 5, { align: 'center' });
    doc.text("V. Unit", xUnit, y + 5, { align: 'center' });
    doc.text("Total", xTotal, y + 5, { align: 'right' }); // Right align

    // --- TABLE ITEMS ---
    y += 12;
    let totalItems = 0;

    dataToPrint.items.forEach((item: any, index: number) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);

      // Code (truncated ID)
      doc.text(item.product_id?.slice(0, 4) || (index + 1).toString(), xCode, y);

      // Description
      doc.setFont("helvetica", "bold");
      doc.text(item.product_name.substring(0, 40), xDesc, y);

      // Calculations for M2 items
      let isM2 = false;
      let isWeight = false;
      let area = 0;
      let displayedUnitPrice = item.price;

      if (item.width && item.height) {
        isM2 = true;
        area = item.width * item.height;
        // For M2 items, user wants the UNIT cost (Price per Piece), not Price per M2
        displayedUnitPrice = area * item.price;
      } else {
        // Try to infer if it's weight based on product data if available, 
        // but PDF usually relies on snapshot. 
        // We don't store "unit" in order_items table typically (unless added).
        // However, we can infer by context or if we fetch product. 
        // Ideally `OrderItem` should store the unit. 
        // For now, if no width/height, it's Unit or Weight.
        // We can check if quantity is large? No.
        // We will assume "UN" unless we can link it.
        // LIMITATION: OrderItems jsonb might not have unit. 
        // We should add `unit` to OrderItem type in future.
        // For this immediate task, we'll try to match with `products` list if available.
        const product = products.find(p => p.id === item.product_id);
        if (product && product.unit === 'g') {
          isWeight = true;
        }
      }

      // Build dimensions detail string
      if (isM2) {
        const details = `${item.width}m x ${item.height}m | Área: ${area.toFixed(4)}m²`; // Increased precision
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text(details, xDesc, y + 4);
        doc.setFontSize(9);
      }

      // Measure Unit
      let unit = "UN";
      if (isM2) unit = "M2";
      if (isWeight) unit = "g";

      doc.text(unit, xMeas, y, { align: 'center' });

      // Qty
      doc.text(item.quantity.toString().replace('.', ','), xQty, y, { align: 'center' });

      // Unit Price
      doc.text(`R$ ${displayedUnitPrice.toFixed(2).replace('.', ',')}`, xUnit, y, { align: 'center' });

      // Total
      doc.setFont("helvetica", "bold");
      doc.text(`R$ ${item.subtotal.toFixed(2).replace('.', ',')}`, xTotal, y, { align: 'right' }); // Right align

      totalItems += item.quantity;
      y += isM2 ? 10 : 7; // Add extra space if details line exists
    });

    // --- FOOTER ---
    const footerY = 240; // Fixed footer position or after Items
    const finalY = Math.max(y + 10, footerY); // Ensure it doesn't overlap items

    drawLine(10, finalY, 200, finalY);

    const bottomY = finalY + 5;

    // Left side: Seller and Payment Info REMOVED


    doc.setFont("helvetica", "italic");
    doc.text("Total Pçs:", 110, bottomY + 5);
    doc.setFont("helvetica", "normal");
    doc.text(totalItems.toString(), 130, bottomY + 5);

    // Right side: Totals
    const rightLabelX = 155; // Right aligned reference for labels
    const rightValueX = 200; // Right aligned reference for values

    doc.setFont("helvetica", "italic");
    doc.text("Sub. Total:", rightLabelX, bottomY + 5, { align: 'right' }); // Right align label
    doc.setFont("helvetica", "bold");
    // Calculate subtotal for PDF view if not stored explicitly (backwards compat)
    const pdfSubTotal = dataToPrint.total / (1 - (dataToPrint.discount || 0) / 100);
    // Wait, if discount is 0, this is fine. If stored total is NET, and we know discount %, we can reverse calc gross.
    // However, floating point issues. Ideally pass subtotal. 
    // Let's use Local calculation logic: Total = Sub - Disc. So Sub = Total + DiscAmount.
    // DiscAmount = Sub * Disc%. 
    // Total = Sub * (1 - Disc%). 
    // Sub = Total / (1 - Disc%).
    // Better yet, just re-sum items? Yes, items are source of truth.
    const calculatedSubTotal = dataToPrint.items.reduce((acc: number, item: any) => acc + item.subtotal, 0);
    const calculatedDiscountVal = (calculatedSubTotal * (dataToPrint.discount || 0)) / 100;

    doc.text(`R$ ${calculatedSubTotal.toFixed(2).replace('.', ',')}`, rightValueX, bottomY + 5, { align: 'right' });

    doc.setFont("helvetica", "italic");
    doc.text(`Desconto (${dataToPrint.discount || 0}%):`, rightLabelX, bottomY + 10, { align: 'right' });
    doc.text(`- R$ ${calculatedDiscountVal.toFixed(2).replace('.', ',')}`, rightValueX, bottomY + 10, { align: 'right' });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(`Total ${title === 'NOTA DE ORÇAMENTO' ? 'Orçamento' : 'Pedido'}:`, rightLabelX, bottomY + 18, { align: 'right' }); // Label
    doc.text(`R$ ${dataToPrint.total.toFixed(2).replace('.', ',')}`, rightValueX, bottomY + 18, { align: 'right' });

    // Signature Line
    drawLine(15, bottomY + 40, 90, bottomY + 40);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Vendedor", 52, bottomY + 44, { align: 'center' });

    // Save
    doc.save(`pedido_${dataToPrint.leadName}_${Date.now()}.pdf`);
    toast({ title: 'PDF gerado com sucesso!' });
  };

  const startEditing = (order: Order) => {
    setEditingOrderId(order.id);
    setSelectedLeadId(order.client_id || '');
    setOrderItems(order.items);
    setDiscount(order.discount || 0);
    setCreationStatus(order.status);
    setActiveTab("new");
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditing = () => {
    setEditingOrderId(null);
    setSelectedLeadId('');
    setOrderItems([]);
    setDiscount(0);
    setCreationStatus('orcamento');
    toast({ title: 'Edição cancelada' });
  };

  const handleSaveOrder = async () => {
    // ... (existing handleSaveOrder implementation)
    if (!selectedLead || orderItems.length === 0 || !user) {
      toast({ title: 'Selecione um cliente e adicione itens', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      if (editingOrderId) {
        // Update existing order
        const updated = await orderService.updateOrder(editingOrderId, {
          client_name: selectedLead.name,
          client_id: selectedLead.id,
          total_amount: total,
          discount: discount,
          status: creationStatus as any,
          items: orderItems,
        });

        if (updated) {
          toast({ title: 'Pedido atualizado com sucesso!' });
          cancelEditing(); // Reset form
          setActiveTab("history");
        }
      } else {
        // Create new order
        const newOrder = await orderService.createOrder(user.id, {
          client_name: selectedLead.name,
          client_id: selectedLead.id,
          total_amount: total,
          discount: discount,
          status: creationStatus as any,
          items: orderItems,
        });

        if (newOrder) {
          toast({ title: 'Pedido salvo com sucesso!' });
          setOrderItems([]);
          setSelectedLeadId('');
          setCreationStatus('orcamento');
          setActiveTab("history");
        }
      }

      // Refresh orders regardless of action
      const updatedOrders = await orderService.getOrders(user.id);
      setOrders(updatedOrders);

    } catch (error) {
      console.error(error);
      toast({ title: 'Erro ao salvar pedido', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (orderId: string) => {
    setOrderToDelete(orderId);
  };

  const confirmDeleteOrder = async () => {
    if (!orderToDelete) return;

    setLoadingOrders(true);
    try {
      const success = await orderService.deleteOrder(orderToDelete);
      if (success) {
        toast({ title: 'Pedido excluído com sucesso!' });
        setOrders(orders.filter(o => o.id !== orderToDelete));
      } else {
        toast({ title: 'Erro ao excluir pedido', variant: 'destructive' });
      }
    } catch (error) {
      console.error(error);
      toast({ title: 'Erro ao excluir pedido', variant: 'destructive' });
    } finally {
      setLoadingOrders(false);
      setOrderToDelete(null);
    }
  };

  // Filter Orders
  const filteredOrders = orders.filter(order => {
    const matchesSearch =
      order.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pago': return 'bg-green-500/10 text-green-500 hover:bg-green-500/20';
      case 'completed': return 'bg-green-500/10 text-green-500 hover:bg-green-500/20'; // legacy
      case 'atrasado': return 'bg-red-500/10 text-red-500 hover:bg-red-500/20';
      case 'cancelled': return 'bg-red-500/10 text-red-500 hover:bg-red-500/20'; // legacy
      case 'aguardando_pagamento': return 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20';
      case 'orcamento': return 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20';
      default: return 'bg-gray-500/10 text-gray-500 hover:bg-gray-500/20';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pago': return 'Pedido Pago';
      case 'completed': return 'Concluído';
      case 'atrasado': return 'Pagamento Atrasado';
      case 'cancelled': return 'Cancelado';
      case 'aguardando_pagamento': return 'Aguardando Pagamento';
      case 'orcamento': return 'Orçamento';
      case 'pending': return 'Pendente';
      default: return status;
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="Gerador de Pedidos" description="Crie e gerencie pedidos de venda" />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="new" className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" />
            {editingOrderId ? 'Editar Pedido' : 'Novo Pedido'}
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="w-4 h-4" />
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="new" className="space-y-6 mt-6">
          <div className="flex justify-end gap-2 mb-4">
            {editingOrderId && (
              <Button variant="ghost" className="text-destructive hover:text-destructive/90" onClick={cancelEditing} disabled={saving}>
                <X className="w-4 h-4 mr-2" />
                Cancelar Edição
              </Button>
            )}
            <Button variant="outline" onClick={() => generatePDF()} disabled={saving}>
              <FileText className="w-4 h-4 mr-2" />
              Pré-visualizar PDF
            </Button>
            <Button className="gradient-primary glow" onClick={handleSaveOrder} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Salvando...' : (editingOrderId ? 'Atualizar Pedido' : 'Salvar Pedido')}
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Order Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Client Selection */}
              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="text-lg font-semibold mb-4">1. Selecionar Cliente</h3>
                <Select value={selectedLeadId} onValueChange={setSelectedLeadId} disabled={loadingLeads}>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingLeads ? "Carregando..." : "Selecione um cliente"} />
                  </SelectTrigger>
                  <SelectContent>
                    {leads.map((lead) => (
                      <SelectItem key={lead.id} value={lead.id}>
                        {lead.name} {lead.phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedLead && (
                  <div className="mt-4 p-3 rounded-lg bg-muted/50">
                    <p className="font-medium">{selectedLead.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedLead.phone} • {selectedLead.email || 'Sem email'}</p>
                  </div>
                )}

                <div className="mt-4">
                  <Label className="mb-2 block">Status Inicial do Pedido</Label>
                  <Select value={creationStatus} onValueChange={setCreationStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="orcamento">Orçamento</SelectItem>
                      <SelectItem value="aguardando_pagamento">Aguardando Pagamento</SelectItem>
                      <SelectItem value="pago">Pedido Pago</SelectItem>
                      <SelectItem value="atrasado">Pagamento Atrasado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Add Products */}
              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="text-lg font-semibold mb-4">2. Adicionar Produtos</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Produto</Label>
                      <Select value={currentProductId} onValueChange={setCurrentProductId} disabled={loadingProducts}>
                        <SelectTrigger>
                          <SelectValue placeholder={loadingProducts ? "Carregando..." : "Selecione"} />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name} - R$ {product.price.toFixed(2)} {product.unit === 'm2' ? '/m²' : product.unit === 'g' ? '/g' : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>{selectedProduct?.unit === 'g' ? 'Peso (g)' : 'Quantidade'}</Label>
                      <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 1)} />
                      {selectedProduct?.unit === 'g' && (
                        <p className="text-xs text-muted-foreground mt-1">Total: {quantity}g</p>
                      )}
                    </div>
                  </div>

                  {selectedProduct?.unit === 'm2' && (
                    <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-primary/10 border border-primary/20">
                      <div>
                        <Label>Largura (m)</Label>
                        <Input type="number" step="0.01" value={width} onChange={(e) => setWidth(parseFloat(e.target.value) || 0)} />
                      </div>
                      <div>
                        <Label>Altura (m)</Label>
                        <Input type="number" step="0.01" value={height} onChange={(e) => setHeight(parseFloat(e.target.value) || 0)} />
                      </div>
                      <div className="col-span-2 flex items-center gap-2 text-sm text-primary">
                        <Calculator className="w-4 h-4" />
                        Área: {(width * height).toFixed(2)} m² | Total: R$ {(width * height * (selectedProduct?.price || 0) * quantity).toFixed(2)}
                      </div>
                    </div>
                  )}

                  <Button onClick={addItem} disabled={!currentProductId} className="w-full text-foreground gradient-primary">
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Item
                  </Button>
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="rounded-xl border border-border bg-card p-6 h-fit">
              <h3 className="text-lg font-semibold mb-4">Resumo do Pedido</h3>
              {orderItems.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Nenhum item adicionado</p>
              ) : (
                <div className="space-y-3">
                  {orderItems.map((item, index) => (
                    <div key={index} className="flex items-start justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.product_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.width && item.height
                            ? `${item.quantity} x(${item.width}m x ${item.height}m)`
                            : `${item.quantity}x R$ ${item.price.toFixed(2)} `}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-primary">R$ {item.subtotal.toFixed(2)}</span>
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => removeItem(index)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <div className="border-t border-border pt-4 mt-4 space-y-2">
                    <div className="flex justify-between items-center text-sm text-muted-foreground">
                      <span>Subtotal</span>
                      <span>R$ {subTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Desconto (%)</span>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={discount}
                        onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                        className="w-20 h-8 text-right"
                      />
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between items-center text-sm text-red-500">
                        <span>Desconto (R$)</span>
                        <span>- R$ {discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-2 border-t border-border">
                      <span className="text-lg font-semibold">Total</span>
                      <span className="text-2xl font-bold text-primary">R$ {total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente ou número do pedido..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="w-[200px]">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="orcamento">Orçamento</SelectItem>
                  <SelectItem value="aguardando_pagamento">Aguardando Pagamento</SelectItem>
                  <SelectItem value="pago">Pedido Pago</SelectItem>
                  <SelectItem value="atrasado">Pagamento Atrasado</SelectItem>
                  <SelectItem value="pending">Pendente (Antigo)</SelectItem>
                  <SelectItem value="completed">Concluído (Antigo)</SelectItem>
                  <SelectItem value="cancelled">Cancelado (Antigo)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Itens</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingOrders ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Carregando pedidos...
                    </TableCell>
                  </TableRow>
                ) : filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhum pedido encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">
                        {new Date(order.created_at).toLocaleDateString()}
                        <div className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleTimeString()}</div>
                      </TableCell>
                      <TableCell>{order.client_name}</TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">
                          {order.items.length} itens
                        </span>
                      </TableCell>
                      <TableCell className="font-semibold">
                        R$ {order.total_amount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={getStatusColor(order.status)}>
                          {getStatusLabel(order.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => setViewOrder(order)} title="Visualizar">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => startEditing(order)} title="Editar">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => generatePDF(order)} title="PDF">
                            <FileText className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/90" onClick={() => handleDeleteClick(order.id)} title="Excluir">
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
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={!!viewOrder} onOpenChange={(open) => !open && setViewOrder(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Pedido</DialogTitle>
            <DialogDescription>
              Visualização detalhada do pedido #{viewOrder?.id.slice(0, 8)}
            </DialogDescription>
          </DialogHeader>

          {viewOrder && (
            <div className="space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-lg">{viewOrder.client_name}</h3>
                  <Badge variant="outline" className={getStatusColor(viewOrder.status)}>
                    {getStatusLabel(viewOrder.status)}
                  </Badge>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  <p>{new Date(viewOrder.created_at).toLocaleDateString()}</p>
                  <p>{new Date(viewOrder.created_at).toLocaleTimeString()}</p>
                </div>
              </div>

              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead>Qtd</TableHead>
                      <TableHead>Preço Un.</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewOrder.items.map((item, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <div className="font-medium">{item.product_name}</div>
                          {item.width && item.height && (
                            <div className="text-xs text-muted-foreground">
                              {item.width}m x {item.height}m
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>R$ {item.price.toFixed(2)}</TableCell>
                        <TableCell className="text-right">R$ {item.subtotal.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-col gap-2 pt-4 border-t border-border">
                {viewOrder.discount && viewOrder.discount > 0 ? (
                  <>
                    <div className="flex justify-end items-center gap-4 text-sm text-muted-foreground">
                      <span>Subtotal:</span>
                      <span>R$ {viewOrder.items.reduce((acc, item) => acc + item.subtotal, 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-end items-center gap-4 text-sm text-red-500">
                      <span>Desconto ({viewOrder.discount}%):</span>
                      <span>- R$ {((viewOrder.items.reduce((acc, item) => acc + item.subtotal, 0) * viewOrder.discount) / 100).toFixed(2)}</span>
                    </div>
                  </>
                ) : null}
                <div className="flex justify-end items-center gap-4">
                  <span className="text-muted-foreground">Total do Pedido:</span>
                  <span className="text-2xl font-bold text-primary">
                    R$ {viewOrder.total_amount.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => generatePDF(viewOrder)}>
                  <FileText className="w-4 h-4 mr-2" />
                  Gerar PDF
                </Button>
                <Button onClick={() => {
                  startEditing(viewOrder);
                  setViewOrder(null);
                }}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Editar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!orderToDelete} onOpenChange={(open) => !open && setOrderToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Pedido</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este pedido? Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteOrder} className="bg-destructive hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div >
  );
}
