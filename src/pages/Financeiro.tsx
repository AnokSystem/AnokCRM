import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
    Plus,
    DollarSign,
    Calendar,
    CheckCircle2,
    AlertCircle,
    Clock,
    Loader2,
    Trash2,
    Edit,
    Bell,
    TrendingUp,
    Filter,
    Upload,
    X,
    PartyPopper,
    FileText,
    Building2,
    CreditCard,
    Eye,
    ExternalLink,
    FileDown
} from 'lucide-react';
import confetti from 'canvas-confetti';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Bill {
    id: string;
    title: string;
    description: string | null;
    amount: number;
    due_date: string;
    paid_at: string | null;
    status: 'pending' | 'paid' | 'overdue';
    type: 'one_time' | 'recurring';
    category_id: string | null;
    created_at: string;
    payment_method?: string | null;
    bank?: string | null;
    proof_url?: string | null;
    total_installments?: number | null;
    current_installment?: number;
}

interface Category {
    id: string;
    name: string;
    color: string;
    icon: string;
}

interface NotificationSettings {
    id?: string;
    user_id: string;
    whatsapp_instance: string;
    notification_phone: string;
    notify_1day_before: boolean;
    notify_on_due_date: boolean;
}

interface WhatsAppConnection {
    id: string;
    name: string;
    instance: string;
    phone: string;
    status: string;
}

export default function Financeiro() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [bills, setBills] = useState<Bill[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterType, setFilterType] = useState<string>('all');
    const [filterMonth, setFilterMonth] = useState<Date>(new Date());
    const [showNewBillForm, setShowNewBillForm] = useState(false);
    const [editingBill, setEditingBill] = useState<Bill | null>(null);
    const [showNotificationsModal, setShowNotificationsModal] = useState(false);
    const [whatsappConnections, setWhatsappConnections] = useState<WhatsAppConnection[]>([]);
    const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
        user_id: user?.id || '',
        whatsapp_instance: '',
        notification_phone: '',
        notify_1day_before: true,
        notify_on_due_date: true
    });
    const [savingSettings, setSavingSettings] = useState(false);

    // Payment Modal State
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [selectedBillToPay, setSelectedBillToPay] = useState<Bill | null>(null);
    const [paymentDetails, setPaymentDetails] = useState({
        payment_method: 'money',
        bank: '',
        proof_file: null as File | null
    });
    const [uploadingProof, setUploadingProof] = useState(false);

    // View Details Modal State
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [selectedBillToView, setSelectedBillToView] = useState<Bill | null>(null);

    // Form state
    const [billForm, setBillForm] = useState({
        title: '',
        description: '',
        amount: '',
        due_date: '',
        category_id: '',
        type: 'one_time' as 'one_time' | 'recurring',
        recurrence_pattern: 'monthly' as const,
        recurrence_day: new Date().getDate(),
        total_installments: ''
    });

    useEffect(() => {
        if (user) {
            loadData();
        }
    }, [user, filterMonth]);

    useEffect(() => {
        if (showNotificationsModal && user) {
            loadNotificationSettings();
        }
    }, [showNotificationsModal, user]);

    // Block body scroll when modal is open
    useEffect(() => {
        if (showNotificationsModal) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }

        // Cleanup on unmount
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [showNotificationsModal]);

    const loadData = async () => {
        try {
            setLoading(true);

            const monthStart = startOfMonth(filterMonth);
            const monthEnd = endOfMonth(filterMonth);

            // Load bills for the selected month
            const { data: billsData, error: billsError } = await supabase
                .from('bills')
                .select('*')
                .eq('user_id', user?.id)
                .gte('due_date', monthStart.toISOString().split('T')[0])
                .lte('due_date', monthEnd.toISOString().split('T')[0])
                .order('due_date', { ascending: true });

            if (billsError) throw billsError;

            // Update status to overdue if past due date
            const billsWithStatus = (billsData || []).map(bill => {
                if (bill.status === 'pending' && !bill.paid_at) {
                    const dueDate = new Date(bill.due_date);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    dueDate.setHours(0, 0, 0, 0);

                    if (dueDate < today) {
                        return { ...bill, status: 'overdue' as const };
                    }
                }
                return bill;
            });

            // Load categories
            const { data: categoriesData, error: categoriesError } = await supabase
                .from('bill_categories')
                .select('*')
                .eq('user_id', user?.id);

            if (categoriesError) throw categoriesError;

            setBills(billsWithStatus);
            setCategories(categoriesData || []);
        } catch (error) {
            console.error('Error loading financial data:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadNotificationSettings = async () => {
        try {
            // Load WhatsApp instances from correct table
            const { data: instances, error: instancesError } = await supabase
                .from('whatsapp_instances')
                .select('instance_name, display_name')
                .eq('user_id', user?.id);

            if (instancesError) throw instancesError;

            // Map to WhatsAppConnection format
            const connections: WhatsAppConnection[] = (instances || []).map(inst => ({
                id: inst.instance_name,
                name: inst.display_name || inst.instance_name,
                instance: inst.instance_name,
                phone: '',
                status: 'connected'
            }));

            setWhatsappConnections(connections);

            // Load notification settings
            const { data: settings, error: settingsError } = await supabase
                .from('bill_notification_settings')
                .select('*')
                .eq('user_id', user?.id)
                .single();

            if (settingsError && settingsError.code !== 'PGRST116') {
                // PGRST116 = no rows found, which is fine for first time users
                throw settingsError;
            }

            if (settings) {
                setNotificationSettings(settings);
            }
        } catch (error) {
            console.error('Error loading notification settings:', error);
        }
    };

    const handleSaveNotificationSettings = async () => {
        try {
            setSavingSettings(true);

            const { error } = await supabase
                .from('bill_notification_settings')
                .upsert({
                    user_id: user?.id,
                    whatsapp_instance: notificationSettings.whatsapp_instance,
                    notification_phone: notificationSettings.notification_phone,
                    notify_1day_before: notificationSettings.notify_1day_before,
                    notify_on_due_date: notificationSettings.notify_on_due_date
                }, {
                    onConflict: 'user_id'
                });

            if (error) throw error;

            toast({
                title: '✅ Configurações salvas!',
                description: 'Suas preferências de notificação foram atualizadas com sucesso.',
            });
            setShowNotificationsModal(false);
        } catch (error) {
            console.error('Error saving notification settings:', error);
            alert('Erro ao salvar configurações: ' + (error as Error).message);
        } finally {
            setSavingSettings(false);
        }
    };

    const handleSaveBill = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const billData = {
                user_id: user?.id,
                title: billForm.title,
                description: billForm.description || null,
                amount: parseFloat(billForm.amount),
                due_date: billForm.due_date,
                category_id: billForm.category_id || null,
                status: 'pending' as const,
                type: billForm.type,
                ...(billForm.type === 'recurring' ? {
                    recurrence_pattern: billForm.recurrence_pattern,
                    recurrence_day: billForm.recurrence_day,
                    total_installments: billForm.total_installments ? parseInt(billForm.total_installments) : null,
                    current_installment: 1
                } : {})
            };

            if (editingBill) {
                // Update existing bill
                const { error } = await supabase
                    .from('bills')
                    .update(billData)
                    .eq('id', editingBill.id);

                if (error) throw error;
            } else {
                // Create new bill
                const { error } = await supabase
                    .from('bills')
                    .insert(billData);

                if (error) throw error;
            }

            // Reset form
            setBillForm({
                title: '',
                description: '',
                amount: '',
                due_date: '',
                category_id: '',
                type: 'one_time',
                recurrence_pattern: 'monthly',
                recurrence_day: new Date().getDate(),
                total_installments: ''
            });
            setShowNewBillForm(false);
            setEditingBill(null);
            loadData();
        } catch (error) {
            console.error('Error saving bill:', error);
            alert('Erro ao salvar conta: ' + (error as Error).message);
        }
    };

    const handleEditBill = (bill: Bill) => {
        setEditingBill(bill);
        setBillForm({
            title: bill.title,
            description: bill.description || '',
            amount: bill.amount.toString(),
            due_date: bill.due_date,
            category_id: bill.category_id || '',
            type: bill.type,
            recurrence_pattern: 'monthly',
            recurrence_day: new Date().getDate(),
            total_installments: bill.total_installments?.toString() || ''
        });
        setShowNewBillForm(true);
    };

    const openPaymentModal = (bill: Bill) => {
        setSelectedBillToPay(bill);
        setPaymentDetails({
            payment_method: 'pix', // Default
            bank: '',
            proof_file: null
        });
        setPaymentModalOpen(true);
    };

    const handleConfirmPayment = async () => {
        if (!selectedBillToPay) return;

        try {
            setUploadingProof(true);
            let proofUrl = null;

            // Upload proof if exists
            if (paymentDetails.proof_file) {
                const file = paymentDetails.proof_file;
                const fileExt = file.name.split('.').pop();
                const fileName = `${selectedBillToPay.id}_proof_${Date.now()}.${fileExt}`;
                const filePath = `${user?.id}/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('bill-attachments')
                    .upload(filePath, file);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('bill-attachments')
                    .getPublicUrl(filePath);

                proofUrl = publicUrl;
            }

            // Mark current bill as paid
            const { error: updateError } = await supabase
                .from('bills')
                .update({
                    paid_at: new Date().toISOString(),
                    status: 'paid',
                    payment_method: paymentDetails.payment_method,
                    bank: paymentDetails.bank,
                    proof_url: proofUrl
                })
                .eq('id', selectedBillToPay.id);

            if (updateError) throw updateError;

            // If it's a recurring bill and NOT the last installment, create the next month's bill
            if (selectedBillToPay.type === 'recurring') {
                const currentInstallment = selectedBillToPay.current_installment || 1;
                const totalInstallments = selectedBillToPay.total_installments;

                // Check if we should generate the next bill
                const shouldGenerateNext = !totalInstallments || currentInstallment < totalInstallments;

                if (shouldGenerateNext) {
                    const currentDueDate = new Date(selectedBillToPay.due_date);

                    // Add one month to the due date
                    const nextDueDate = new Date(currentDueDate);
                    nextDueDate.setMonth(nextDueDate.getMonth() + 1);

                    // Create next month's bill
                    const { error: insertError } = await supabase
                        .from('bills')
                        .insert({
                            user_id: user?.id,
                            title: selectedBillToPay.title,
                            description: selectedBillToPay.description,
                            amount: selectedBillToPay.amount,
                            due_date: nextDueDate.toISOString().split('T')[0],
                            category_id: selectedBillToPay.category_id,
                            status: 'pending',
                            type: 'recurring',
                            total_installments: totalInstallments,
                            current_installment: currentInstallment + 1
                        });

                    if (insertError) {
                        console.error('Error creating next recurring bill:', insertError);
                        toast({ title: 'Conta paga, mas erro ao criar próxima parcela.', variant: 'destructive' });
                    }
                } else {
                    // It was the last installment! CELEBRATE! 🎉
                    confetti({
                        particleCount: 150,
                        spread: 70,
                        origin: { y: 0.6 },
                        colors: ['#26ccff', '#a25afd', '#ff5e7e', '#88ff5a', '#fcff42', '#ffa62d', '#ff36ff']
                    });

                    // Extra burst
                    setTimeout(() => {
                        confetti({
                            particleCount: 50,
                            angle: 60,
                            spread: 55,
                            origin: { x: 0 }
                        });
                        confetti({
                            particleCount: 50,
                            angle: 120,
                            spread: 55,
                            origin: { x: 1 }
                        });
                    }, 250);

                    toast({
                        title: 'Parabéns! 🎊',
                        description: 'Você finalizou todas as parcelas desta conta!',
                        className: 'bg-primary text-primary-foreground'
                    });
                }
            }

            toast({ title: 'Conta paga com sucesso!' });
            setPaymentModalOpen(false);
            loadData();
        } catch (error: any) {
            console.error('Error marking bill as paid:', error);
            toast({ title: 'Erro ao pagar conta', description: error.message, variant: 'destructive' });
        } finally {
            setUploadingProof(false);
        }
    };

    const generateFinancialReport = async () => {
        try {
            // 1. Fetch Organization Settings (Company Info)
            const { data: orgSettings } = await supabase
                .from('organization_settings')
                .select('*')
                .eq('user_id', user?.id)
                .single();

            // 2. Calculate Totals
            const totalPaid = bills.filter(b => b.status === 'paid').reduce((acc, curr) => acc + curr.amount, 0);
            const totalPending = bills.filter(b => b.status === 'pending').reduce((acc, curr) => acc + curr.amount, 0);
            const totalOverdue = bills.filter(b => b.status === 'overdue').reduce((acc, curr) => acc + curr.amount, 0);
            const totalAmount = totalPaid + totalPending + totalOverdue;

            // 3. Initialize PDF
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            let yPos = 20;

            // --- HEADER (Centered) ---
            let headerY = 15;

            // 1. Logo (Centered)
            if (orgSettings?.empresa_logo_base64) {
                try {
                    const img = new Image();
                    img.src = orgSettings.empresa_logo_base64;
                    await new Promise((resolve) => { img.onload = resolve; });

                    const maxW = 40;
                    const maxH = 40;
                    const ratio = Math.min(maxW / img.width, maxH / img.height);
                    const w = img.width * ratio;
                    const h = img.height * ratio;

                    const logoX = (pageWidth - w) / 2;
                    doc.addImage(orgSettings.empresa_logo_base64, 'PNG', logoX, headerY, w, h);
                    headerY += h + 5;
                } catch (e) {
                    console.warn('Could not add logo', e);
                }
            }

            // 2. Company Info (Centered)
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
            const companyName = orgSettings?.empresa_nome || 'Relatório Financeiro';
            doc.text(companyName, pageWidth / 2, headerY, { align: 'center' });
            headerY += 7;

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.text(`CNPJ: ${orgSettings?.empresa_cnpj || 'Não cadastrado'}`, pageWidth / 2, headerY, { align: 'center' });
            headerY += 10;

            // 3. Report Metadata (Centered below company info)
            doc.setDrawColor(200);
            doc.line(20, headerY, pageWidth - 20, headerY); // Separator line
            headerY += 10;

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.text('RELATÓRIO FINANCEIRO', pageWidth / 2, headerY, { align: 'center' });
            headerY += 6;

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.text(`Período: ${format(filterMonth, 'MMMM yyyy', { locale: ptBR })}`, pageWidth / 2, headerY, { align: 'center' });
            headerY += 6;

            doc.setFontSize(8);
            doc.setTextColor(100);
            doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`, pageWidth / 2, headerY, { align: 'center' });
            doc.setTextColor(0);

            yPos = headerY + 15;





















            // 1b. Fetch Sales (Revenue) - Both Integrations and Manual Orders
            const [leadOrdersResult, manualOrdersResult] = await Promise.all([
                supabase
                    .from('lead_orders')
                    .select('amount, status, created_at')
                    .eq('user_id', user?.id),
                supabase
                    .from('orders')
                    .select('total_amount, status, created_at')
                    .eq('user_id', user?.id)
            ]);

            const leadOrders = leadOrdersResult.data || [];
            const manualOrders = manualOrdersResult.data || [];

            // Calculate Revenue (Paid/Completed Orders in current month)
            const revenueFromIntegrations = leadOrders
                .filter(order => {
                    const orderDate = new Date(order.created_at);
                    const isSameMonth = orderDate.getMonth() === filterMonth.getMonth() &&
                        orderDate.getFullYear() === filterMonth.getFullYear();
                    const status = (order.status || '').toLowerCase();
                    return isSameMonth && ['paid', 'pago', 'completed'].includes(status);
                })
                .reduce((sum, order) => sum + (Number(order.amount) || 0), 0);

            const revenueFromManual = manualOrders
                .filter(order => {
                    const orderDate = new Date(order.created_at);
                    const isSameMonth = orderDate.getMonth() === filterMonth.getMonth() &&
                        orderDate.getFullYear() === filterMonth.getFullYear();
                    const status = (order.status || '').toLowerCase();
                    return isSameMonth && ['paid', 'pago', 'completed'].includes(status);
                })
                .reduce((sum, order) => sum + (Number(order.total_amount) || 0), 0);

            const totalRevenue = revenueFromIntegrations + revenueFromManual;


            // --- SUMMARY CARDS ---
            const drawCard = (title: string, value: string, x: number, color: [number, number, number]) => {
                doc.setFillColor(...color);
                doc.roundedRect(x, yPos, 40, 20, 3, 3, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(8);
                doc.text(title, x + 20, yPos + 7, { align: 'center' });
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                doc.text(value, x + 20, yPos + 14, { align: 'center' });
            };

            const formatMoney = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

            drawCard('RECEITAS', formatMoney(totalRevenue), 15, [16, 185, 129]); // Green
            drawCard('PAGOS', formatMoney(totalPaid), 60, [16, 185, 129]); // Green
            drawCard('PENDENTES', formatMoney(totalPending), 105, [234, 179, 8]); // Yellow
            drawCard('ATRASADOS', formatMoney(totalOverdue), 150, [239, 68, 68]); // Red

            yPos += 30;

            // --- TABLE ---
            const tableData = bills.map(bill => [
                format(new Date(bill.due_date), 'dd/MM/yyyy'),
                bill.title,
                categories.find(c => c.id === bill.category_id)?.name || 'Sem categoria',
                bill.type === 'recurring'
                    ? `Recorrente ${bill.total_installments ? `(${bill.current_installment}/${bill.total_installments})` : ''}`
                    : 'Única',
                bill.status === 'paid' ? 'PAGO' : bill.status === 'overdue' ? 'ATRASADO' : 'PENDENTE',
                formatMoney(bill.amount)
            ]);

            autoTable(doc, {
                startY: yPos,
                head: [['Vencimento', 'Descrição', 'Categoria', 'Tipo', 'Status', 'Valor']],
                body: tableData,
                theme: 'grid',
                headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
                styles: { fontSize: 8, cellPadding: 3 },
                columnStyles: {
                    0: { cellWidth: 25 },
                    1: { cellWidth: 'auto' },
                    4: { fontStyle: 'bold' },
                    5: { halign: 'right' }
                },
                didParseCell: function (data) {
                    if (data.section === 'body' && data.column.index === 4) {
                        const status = data.cell.raw;
                        if (status === 'PAGO') data.cell.styles.textColor = [22, 163, 74];
                        if (status === 'ATRASADO') data.cell.styles.textColor = [220, 38, 38];
                        if (status === 'PENDENTE') data.cell.styles.textColor = [202, 138, 4];
                    }
                }
            });

            // --- FOOTER ---
            const pageCount = (doc as any).internal.getNumberOfPages();
            doc.setFontSize(8);
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setTextColor(150);
                doc.text(`Página ${i} de ${pageCount} - Gerado por Purple Flow`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
            }

            doc.save(`relatorio_${format(filterMonth, 'yyyy_MM')}.pdf`);

            toast({
                title: 'Relatório Gerado! 📄',
                description: 'O download do PDF foi iniciado.',
            });

        } catch (error) {
            console.error('Error generating PDF:', error);
            toast({
                title: 'Erro ao gerar relatório',
                description: 'Não foi possível gerar o PDF. Verifique os dados da empresa.',
                variant: 'destructive'
            });
        }
    };

    const openViewModal = (bill: Bill) => {
        setSelectedBillToView(bill);
        setViewModalOpen(true);
    };

    const handleDeleteBill = async (billId: string) => {
        if (!confirm('Tem certeza que deseja excluir esta conta?')) return;

        try {
            const { error } = await supabase
                .from('bills')
                .delete()
                .eq('id', billId);

            if (error) throw error;
            loadData();
        } catch (error) {
            console.error('Error deleting bill:', error);
        }
    };

    const filteredBills = bills.filter(bill => {
        if (filterStatus !== 'all' && bill.status !== filterStatus) return false;
        if (filterType !== 'all' && bill.category_id !== filterType) return false;
        return true;
    });

    const totalAPagar = bills
        .filter(b => b.status === 'pending' || b.status === 'overdue')
        .reduce((acc, b) => acc + parseFloat(b.amount.toString()), 0);

    const totalPagas = bills
        .filter(b => b.status === 'paid')
        .reduce((acc, b) => acc + parseFloat(b.amount.toString()), 0);

    const totalPendentes = bills
        .filter(b => b.status === 'pending')
        .reduce((acc, b) => acc + parseFloat(b.amount.toString()), 0);

    const totalAtrasadas = bills
        .filter(b => b.status === 'overdue')
        .reduce((acc, b) => acc + parseFloat(b.amount.toString()), 0);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Financeiro - Contas a Pagar</h1>
                    <p className="text-sm text-muted-foreground">
                        Gerencie suas despesas e receba lembretes automáticos via WhatsApp.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowNotificationsModal(true)}>
                        <Bell className="w-4 h-4 mr-2" />
                        Notificações
                    </Button>
                    <Button
                        variant="outline"
                        className="flex items-center gap-2 border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900/30 dark:text-red-400 dark:hover:bg-red-900/20"
                        onClick={generateFinancialReport}
                    >
                        <FileDown className="w-4 h-4 mr-2" />
                        Exportar PDF
                    </Button>
                    <Button onClick={() => {
                        setEditingBill(null);
                        setBillForm({
                            title: '',
                            description: '',
                            amount: '',
                            due_date: '',
                            category_id: '',
                            type: 'one_time',
                            recurrence_pattern: 'monthly',
                            recurrence_day: new Date().getDate(),
                            total_installments: ''
                        });
                        setShowNewBillForm(!showNewBillForm);
                    }}>
                        <Plus className="w-4 h-4 mr-2" />
                        Nova Conta
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="rounded-lg border bg-card p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Total a Pagar</span>
                    </div>
                    <p className="text-2xl font-bold">R$ {totalAPagar.toFixed(2)}</p>
                </div>

                <div className="rounded-lg border bg-card p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span className="text-sm text-muted-foreground">Pagas</span>
                    </div>
                    <p className="text-2xl font-bold text-green-500">R$ {totalPagas.toFixed(2)}</p>
                </div>

                <div className="rounded-lg border bg-card p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-yellow-500" />
                        <span className="text-sm text-muted-foreground">Pendentes</span>
                    </div>
                    <p className="text-2xl font-bold text-yellow-500">R$ {totalPendentes.toFixed(2)}</p>
                </div>

                <div className="rounded-lg border bg-card p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="w-4 h-4 text-red-500" />
                        <span className="text-sm text-muted-foreground">Atrasadas</span>
                    </div>
                    <p className="text-2xl font-bold text-red-500">R$ {totalAtrasadas.toFixed(2)}</p>
                </div>
            </div>

            {/* New/Edit Bill Form */}
            {showNewBillForm && (
                <div className="rounded-lg border bg-card p-6">
                    <h3 className="font-semibold text-lg mb-4">
                        {editingBill ? 'Editar Conta' : 'Nova Conta'}
                    </h3>
                    <form onSubmit={handleSaveBill} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Título *</label>
                                <input
                                    type="text"
                                    value={billForm.title}
                                    onChange={(e) => setBillForm({ ...billForm, title: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg bg-background"
                                    required
                                    placeholder="Ex: Anúncio Facebook"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Valor (R$) *</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={billForm.amount}
                                    onChange={(e) => setBillForm({ ...billForm, amount: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg bg-background"
                                    required
                                    placeholder="0.00"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Vencimento *</label>
                                <input
                                    type="date"
                                    value={billForm.due_date}
                                    onChange={(e) => setBillForm({ ...billForm, due_date: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg bg-background"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Tipo/Categoria</label>
                                <select
                                    value={billForm.category_id}
                                    onChange={(e) => setBillForm({ ...billForm, category_id: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg bg-background"
                                >
                                    <option value="">Selecione...</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Recorrência *</label>
                                <select
                                    value={billForm.type}
                                    onChange={(e) => setBillForm({ ...billForm, type: e.target.value as 'one_time' | 'recurring' })}
                                    className="w-full px-3 py-2 border rounded-lg bg-background"
                                    required
                                >
                                    <option value="one_time">Única</option>
                                    <option value="recurring">Recorrente (mensal)</option>
                                </select>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Contas recorrentes criam automaticamente a próxima parcela ao serem pagas
                                </p>
                            </div>

                            {billForm.type === 'recurring' && (
                                <div>
                                    <label className="block text-sm font-medium mb-2">Parcelas (Opcional)</label>
                                    <input
                                        type="number"
                                        min="2"
                                        value={billForm.total_installments}
                                        onChange={(e) => setBillForm({ ...billForm, total_installments: e.target.value })}
                                        placeholder="Ex: 12"
                                        className="w-full px-3 py-2 border rounded-lg bg-background"
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Deixe em branco para recorrência infinita (ex: Aluguel, Netflix)
                                    </p>
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Descrição</label>
                            <textarea
                                value={billForm.description}
                                onChange={(e) => setBillForm({ ...billForm, description: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg bg-background"
                                rows={2}
                                placeholder="Detalhes adicionais..."
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button type="submit">
                                {editingBill ? 'Salvar Alterações' : 'Criar Conta'}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setShowNewBillForm(false);
                                    setEditingBill(null);
                                }}
                            >
                                Cancelar
                            </Button>
                        </div>
                    </form>
                </div>
            )}

            {/* Filters */}
            <div className="rounded-lg border bg-card p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">Status</label>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg bg-background"
                        >
                            <option value="all">Todas</option>
                            <option value="pending">Pendente</option>
                            <option value="paid">Paga</option>
                            <option value="overdue">Atrasada</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">Tipo</label>
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg bg-background"
                        >
                            <option value="all">Todos</option>
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">Mês</label>
                        <input
                            type="month"
                            value={format(filterMonth, 'yyyy-MM')}
                            onChange={(e) => {
                                const [year, month] = e.target.value.split('-');
                                setFilterMonth(new Date(parseInt(year), parseInt(month) - 1, 1));
                            }}
                            className="w-full px-3 py-2 border rounded-lg bg-background"
                        />
                    </div>
                </div>
            </div>

            {/* Bills Table */}
            <div className="rounded-lg border bg-card">
                <div className="p-4 border-b">
                    <h3 className="font-semibold">Contas ({filteredBills.length})</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-muted/50">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-medium">Título</th>
                                <th className="px-4 py-3 text-left text-sm font-medium">Vencimento</th>
                                <th className="px-4 py-3 text-left text-sm font-medium">Valor</th>
                                <th className="px-4 py-3 text-left text-sm font-medium">Tipo</th>
                                <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                                <th className="px-4 py-3 text-right text-sm font-medium">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filteredBills.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                                        Nenhuma conta encontrada
                                    </td>
                                </tr>
                            ) : (
                                filteredBills.map(bill => {
                                    const category = categories.find(c => c.id === bill.category_id);
                                    return (
                                        <tr key={bill.id} className="hover:bg-muted/50">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-lg">
                                                        {bill.type === 'recurring' ? '🔄' : '📄'}
                                                    </span>
                                                    <TrendingUp className="w-4 h-4 text-muted-foreground" />
                                                    {bill.title}
                                                    {bill.type === 'recurring' && (
                                                        <div className="flex items-center gap-1.5 ml-2">
                                                            <span className="text-[10px] uppercase font-bold tracking-wider text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md">
                                                                Recorrente
                                                            </span>
                                                            {bill.total_installments && (
                                                                <span className="text-xs text-muted-foreground font-mono">
                                                                    ({bill.current_installment || 1}/{bill.total_installments})
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                {format(new Date(bill.due_date), 'dd/MM/yyyy')}
                                            </td>
                                            <td className="px-4 py-3 font-semibold">
                                                R$ {parseFloat(bill.amount.toString()).toFixed(2)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs"
                                                    style={{
                                                        backgroundColor: category?.color ? `${category.color}20` : '#6366f120',
                                                        color: category?.color || '#6366f1'
                                                    }}
                                                >
                                                    {category?.name || 'Sem categoria'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${bill.status === 'paid'
                                                        ? 'bg-green-100 text-green-700'
                                                        : bill.status === 'overdue'
                                                            ? 'bg-red-100 text-red-700'
                                                            : 'bg-yellow-100 text-yellow-700'
                                                        }`}
                                                >
                                                    {bill.status === 'paid' ? 'Pago' : bill.status === 'overdue' ? 'Atrasada' : 'Pendente'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-end gap-2">
                                                    {bill.status === 'paid' && (
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => openViewModal(bill)}
                                                            title="Ver detalhes do pagamento"
                                                        >
                                                            <Eye className="w-4 h-4 text-blue-500" />
                                                        </Button>
                                                    )}
                                                    {bill.status !== 'paid' && (
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => openPaymentModal(bill)}
                                                            title="Marcar como paga"
                                                        >
                                                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                                                        </Button>
                                                    )}
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleEditBill(bill)}
                                                        title="Editar"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleDeleteBill(bill.id)}
                                                        title="Excluir"
                                                    >
                                                        <Trash2 className="w-4 h-4 text-red-500" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
                {/* Payment Modal */}
                {paymentModalOpen && selectedBillToPay && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]" onClick={() => setPaymentModalOpen(false)}>
                        <div className="bg-card rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-semibold text-lg">Confirmar Pagamento</h3>
                                <Button variant="ghost" size="icon" onClick={() => setPaymentModalOpen(false)}>
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>

                            <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                                <p className="font-medium">{selectedBillToPay.title}</p>
                                <p className="text-2xl font-bold text-primary mt-1">
                                    R$ {parseFloat(selectedBillToPay.amount.toString()).toFixed(2)}
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Forma de Pagamento</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[
                                            { id: 'money', label: 'Dinheiro', icon: DollarSign },
                                            { id: 'pix', label: 'Pix', icon: TrendingUp },
                                            { id: 'card', label: 'Cartão', icon: CreditCard },
                                            { id: 'deposit', label: 'Depósito', icon: Building2 },
                                        ].map(method => (
                                            <div
                                                key={method.id}
                                                onClick={() => setPaymentDetails({ ...paymentDetails, payment_method: method.id })}
                                                className={`
                                                cursor-pointer border rounded-lg p-3 flex items-center gap-2 transition-all
                                                ${paymentDetails.payment_method === method.id
                                                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                                        : 'hover:bg-muted'
                                                    }
                                            `}
                                            >
                                                <method.icon className={`w-4 h-4 ${paymentDetails.payment_method === method.id ? 'text-primary' : 'text-muted-foreground'}`} />
                                                <span className="text-sm">{method.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2">Banco / Instituição</label>
                                    <input
                                        type="text"
                                        value={paymentDetails.bank}
                                        onChange={(e) => setPaymentDetails({ ...paymentDetails, bank: e.target.value })}
                                        placeholder="Ex: Nubank, Itaú..."
                                        className="w-full px-3 py-2 border rounded-lg bg-background"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2">Comprovante</label>
                                    <div className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors relative">
                                        <input
                                            type="file"
                                            accept="image/*,.pdf"
                                            onChange={(e) => {
                                                if (e.target.files && e.target.files[0]) {
                                                    setPaymentDetails({ ...paymentDetails, proof_file: e.target.files[0] });
                                                }
                                            }}
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                        />
                                        <div className="flex flex-col items-center gap-2">
                                            {paymentDetails.proof_file ? (
                                                <>
                                                    <FileText className="w-8 h-8 text-primary" />
                                                    <span className="text-sm font-medium text-primary break-all">
                                                        {paymentDetails.proof_file.name}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">Clique para alterar</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Upload className="w-8 h-8 text-muted-foreground" />
                                                    <span className="text-sm text-muted-foreground">
                                                        Clique para anexar comprovante
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <Button onClick={handleConfirmPayment} disabled={uploadingProof} className="w-full mt-4">
                                    {uploadingProof ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                            Processando...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 className="w-4 h-4 mr-2" />
                                            Confirmar Pagamento
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

            </div>


            {/* View Details Modal */}
            {viewModalOpen && selectedBillToView && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]" onClick={() => setViewModalOpen(false)}>
                    <div className="bg-card rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-semibold text-lg">Detalhes do Pagamento</h3>
                            <Button variant="ghost" size="icon" onClick={() => setViewModalOpen(false)}>
                                <X className="w-4 h-4" />
                            </Button>
                        </div>

                        <div className="space-y-4">
                            <div className="p-3 bg-muted/50 rounded-lg">
                                <p className="text-sm text-muted-foreground mb-1">Título</p>
                                <p className="font-medium">{selectedBillToView.title}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-muted/50 rounded-lg">
                                    <p className="text-sm text-muted-foreground mb-1">Valor</p>
                                    <p className="font-medium">R$ {parseFloat(selectedBillToView.amount.toString()).toFixed(2)}</p>
                                </div>
                                <div className="p-3 bg-muted/50 rounded-lg">
                                    <p className="text-sm text-muted-foreground mb-1">Data Pagamento</p>
                                    <p className="font-medium">
                                        {selectedBillToView.paid_at ? format(new Date(selectedBillToView.paid_at), 'dd/MM/yyyy') : '-'}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-muted/50 rounded-lg">
                                    <p className="text-sm text-muted-foreground mb-1">Forma de Pagto</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        {selectedBillToView.payment_method === 'money' && <DollarSign className="w-4 h-4" />}
                                        {selectedBillToView.payment_method === 'pix' && <TrendingUp className="w-4 h-4" />}
                                        {selectedBillToView.payment_method === 'card' && <CreditCard className="w-4 h-4" />}
                                        {selectedBillToView.payment_method === 'deposit' && <Building2 className="w-4 h-4" />}
                                        <span className="capitalize">{selectedBillToView.payment_method || '-'}</span>
                                    </div>
                                </div>
                                <div className="p-3 bg-muted/50 rounded-lg">
                                    <p className="text-sm text-muted-foreground mb-1">Banco</p>
                                    <p className="font-medium">{selectedBillToView.bank || '-'}</p>
                                </div>
                            </div>

                            <div className="p-3 bg-muted/50 rounded-lg">
                                <p className="text-sm text-muted-foreground mb-2">Comprovante</p>
                                {selectedBillToView.proof_url ? (
                                    <a
                                        href={selectedBillToView.proof_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 text-primary hover:underline bg-background p-2 rounded border"
                                    >
                                        <FileText className="w-4 h-4" />
                                        <span className="text-sm truncate flex-1">Visualizar Comprovante</span>
                                        <ExternalLink className="w-3 h-3" />
                                    </a>
                                ) : (
                                    <p className="text-sm text-muted-foreground italic">Nenhum comprovante anexado</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Notifications Modal */}
            {showNotificationsModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]" onClick={() => setShowNotificationsModal(false)}>
                    <div className="bg-card rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <h3 className="font-semibold text-lg mb-4">Notificações Inteligentes</h3>

                        <div className="space-y-4 mb-6">
                            {/* WhatsApp Instance Selection */}
                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    Instância WhatsApp *
                                </label>
                                <select
                                    value={notificationSettings.whatsapp_instance}
                                    onChange={(e) => setNotificationSettings({
                                        ...notificationSettings,
                                        whatsapp_instance: e.target.value
                                    })}
                                    className="w-full px-3 py-2 border rounded-lg bg-background"
                                    required
                                >
                                    <option value="">Selecione uma instância...</option>
                                    {whatsappConnections.map(conn => (
                                        <option key={conn.id} value={conn.instance}>
                                            {conn.name}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Configure suas conexões WhatsApp em Configurações → Conexões WhatsApp
                                </p>
                            </div>

                            {/* Phone Number */}
                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    Número para Notificações *
                                </label>
                                <input
                                    type="tel"
                                    value={notificationSettings.notification_phone}
                                    onChange={(e) => setNotificationSettings({
                                        ...notificationSettings,
                                        notification_phone: e.target.value
                                    })}
                                    className="w-full px-3 py-2 border rounded-lg bg-background"
                                    placeholder="5511999999999"
                                    required
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    Formato: código do país + DDD + número (ex: 5511999999999)
                                </p>
                            </div>

                            {/* Notification Toggles */}
                            <div className="space-y-3 pt-4 border-t">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-start gap-3">
                                        <Bell className="w-5 h-5 text-primary mt-0.5" />
                                        <div>
                                            <p className="font-medium">Lembrete 1 dia antes</p>
                                            <p className="text-sm text-muted-foreground">
                                                Receba um lembrete no WhatsApp 1 dia antes do vencimento
                                            </p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={notificationSettings.notify_1day_before}
                                            onChange={(e) => setNotificationSettings({
                                                ...notificationSettings,
                                                notify_1day_before: e.target.checked
                                            })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                    </label>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-start gap-3">
                                        <Calendar className="w-5 h-5 text-primary mt-0.5" />
                                        <div>
                                            <p className="font-medium">Lembrete no dia do vencimento</p>
                                            <p className="text-sm text-muted-foreground">
                                                Receba um lembrete no WhatsApp no dia do vencimento
                                            </p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={notificationSettings.notify_on_due_date}
                                            onChange={(e) => setNotificationSettings({
                                                ...notificationSettings,
                                                notify_on_due_date: e.target.checked
                                            })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setShowNotificationsModal(false)}
                                disabled={savingSettings}
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleSaveNotificationSettings}
                                disabled={savingSettings || !notificationSettings.whatsapp_instance || !notificationSettings.notification_phone}
                            >
                                {savingSettings ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Salvando...
                                    </>
                                ) : (
                                    'Salvar Configurações'
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
