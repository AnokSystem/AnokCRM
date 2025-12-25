import { useEffect, useState } from 'react';
import { FunnelChart } from '@/components/dashboard/FunnelChart';
import { Button } from '@/components/ui/button';
import {
  Users,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Activity,
  MessageSquare,
  Calendar,
  Filter,
  Zap,
  ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { LeadsChart, SalesDistributionChart, RevenueChart, CampaignChart, TopStatesChart } from '@/components/dashboard/DashboardCharts';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface DashboardMetrics {
  totalLeads: number;
  recentLeads: number;
  totalCampaigns: number;
  totalFlows: number;
  totalOrdersCount: number;
  avgTicket: number;
  netRevenue: number;
  forecastedRevenue: number;
  chartData: any[]; // Leads vs Sales
  campaignChartData: any[]; // Campaigns Sent
  topStatesData: any[]; // Top 5 States
}

export default function Dashboard() {
  const { user, activeFeatures, isAdmin } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalLeads: 0,
    recentLeads: 0,
    totalCampaigns: 0,
    totalFlows: 0,
    totalOrdersCount: 0,
    avgTicket: 0,
    netRevenue: 0,
    forecastedRevenue: 0,
    chartData: [],
    campaignChartData: [],
    topStatesData: [],
  });
  const [loading, setLoading] = useState(true);

  // Helper validation for features
  const hasFeature = (feature: string) => isAdmin || activeFeatures.includes(feature) || activeFeatures.includes('all');

  useEffect(() => {
    if (user) {
      loadMetrics();
    }
  }, [user]);

  const loadMetrics = async () => {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      const startDateStr = startDate.toISOString();

      const promises = [
        supabase.from('leads').select('id', { count: 'exact', head: true }),
        supabase.from('leads').select('created_at, address_state').gte('created_at', startDateStr),
        supabase.from('campaigns').select('id', { count: 'exact', head: true }),
        // [MOD] Fetch Campaigns Data (created_at) for Charting
        supabase.from('campaigns').select('created_at').gte('created_at', startDateStr),
        supabase.from('flows').select('id', { count: 'exact', head: true }),
        // [NEW] Fetch Lead Orders (Integration Sales)
        supabase.from('lead_orders')
          .select('amount, status, created_at')
          .gte('created_at', startDateStr),
        // [NEW] Fetch Manual Orders (Orders Table)
        supabase.from('orders')
          .select('total_amount, status, created_at')
          .gte('created_at', startDateStr),
        // [NEW] Fetch Bills (Expenses)
        supabase.from('bills')
          .select('amount, status')
          .gte('due_date', startDateStr)
      ];

      const [
        leadsResult,
        recentLeadsData,
        campaignsResult,
        recentCampaignsData, // [NEW]
        flowsResult,
        leadOrdersResult,
        manualOrdersResult,
        billsResult
      ] = await Promise.all(promises);

      // --- Financial Calculations (Last 7 Days) ---

      const leadOrders = (leadOrdersResult.data || []) as any[];
      const manualOrders = (manualOrdersResult.data || []) as any[];
      const bills = (billsResult.data || []) as any[];

      // Normalize and Merge Orders
      const allOrders = [
        ...leadOrders.map(o => ({
          amount: Number(o.amount) || 0,
          status: o.status === 'paid' ? 'paid' : (o.status === 'pending' ? 'pending' : o.status),
          created_at: o.created_at
        })),
        ...manualOrders.map(o => ({
          amount: Number(o.total_amount) || 0,
          status: o.status === 'pago' ? 'paid' :
            (o.status === 'aguardando_pagamento' ? 'pending' :
              (o.status === 'atrasado' ? 'overdue' :
                (o.status === 'orcamento' ? 'quote' : o.status))),
          created_at: o.created_at
        }))
      ];

      // Exclude Quotes/Cancelled from metrics
      const validOrders = allOrders.filter(o =>
        ['paid', 'pending', 'completed', 'overdue'].includes(o.status)
      );

      // 1. Vendas (Count): Valid Sales
      const totalOrdersCount = validOrders.length;

      // 2. Ticket Médio: Sum(All Valid) / Count(All Valid)
      const totalOrdersValue = validOrders.reduce((acc, order) => acc + order.amount, 0);
      const avgTicket = totalOrdersCount > 0 ? totalOrdersValue / totalOrdersCount : 0;

      // 3. Receita Geral (Net Revenue): Paid Sales - Bills
      const paidOrdersValue = validOrders
        .filter(o => o.status === 'paid' || o.status === 'completed')
        .reduce((acc, order) => acc + order.amount, 0);

      const totalBillsValue = bills.reduce((acc, bill) => acc + (Number(bill.amount) || 0), 0);

      const netRevenue = paidOrdersValue - totalBillsValue;

      // 4. Receita Prevista (Forecast): Paid + Pending Sales
      // Matches totalOrdersValue since we filtered validOrders
      const forecastedRevenue = totalOrdersValue;

      // --- CHART DATA GENERATION ---
      const chartDataMap = new Map<string, { leads: number, vendas: number }>();

      // Initialize map for last 7 days
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        // Use ISO string for strict day comparison
        const isoDate = d.toISOString().split('T')[0];
        chartDataMap.set(isoDate, { leads: 0, vendas: 0 }); // Key by ISO
      }

      // Fill Leads
      const recentLeads = (recentLeadsData.data || []) as any[]; // Use recentLeadsData from destructuring
      recentLeads.forEach(lead => {
        const date = new Date(lead.created_at).toISOString().split('T')[0];
        if (chartDataMap.has(date)) {
          const current = chartDataMap.get(date)!;
          chartDataMap.set(date, { ...current, leads: current.leads + 1 });
        }
      });

      // Fill Sales (Orders)
      validOrders.forEach(order => {
        const date = new Date(order.created_at).toISOString().split('T')[0];
        if (chartDataMap.has(date)) {
          const current = chartDataMap.get(date)!;
          chartDataMap.set(date, { ...current, vendas: current.vendas + 1 });
        }
      });

      // Convert Map to Array sorted by date
      const chartData = Array.from(chartDataMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([isoDate, counts]) => {
          // Convert ISO back to DD/MM for display
          const [year, month, day] = isoDate.split('-');
          return {
            name: `${day}/${month}`,
            leads: counts.leads,
            vendas: counts.vendas
          };
        });

      // --- CAMPAIGN CHART DATA (Daily Sends) ---
      const campaignMap = new Map<string, number>();
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const isoDate = d.toISOString().split('T')[0];
        campaignMap.set(isoDate, 0);
      }

      const recentCampaigns = (recentCampaignsData.data || []) as any[];
      recentCampaigns.forEach(camp => {
        // Assuming 'created_at' or 'scheduled_at'. Using created_at for simplicity.
        const date = new Date(camp.created_at).toISOString().split('T')[0];
        if (campaignMap.has(date)) {
          campaignMap.set(date, (campaignMap.get(date) || 0) + 1);
        }
      });

      const campaignChartData = Array.from(campaignMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([isoDate, count]) => {
          const [year, month, day] = isoDate.split('-');
          return {
            name: `${day}/${month}`,
            enviados: count, // Count of campaigns created/sent
            aberturas: 0 // We don't have open tracking yet.
          };
        });

      // --- TOP STATES DATA ---
      // Group recent leads by address_state
      const stateMap = new Map<string, number>();
      recentLeads.forEach(lead => {
        const state = lead.address_state ? lead.address_state.trim().toUpperCase() : 'N/A';
        // Normalize state codes if needed (e.g. "São Paulo" -> "SP"). Assuming 2-letter codes.
        if (state && state.length === 2) {
          stateMap.set(state, (stateMap.get(state) || 0) + 1);
        } else if (state !== 'N/A' && state.length > 2) {
          // Simple heuristic: Take first 2 chars
          const code = state.substring(0, 2);
          stateMap.set(code, (stateMap.get(code) || 0) + 1);
        }
      });

      const topStatesData = Array.from(stateMap.entries())
        .sort((a, b) => b[1] - a[1]) // Sort desc by value
        .slice(0, 5) // Take top 5
        .map(([name, value]) => ({ name, value }));


      setMetrics({
        totalLeads: leadsResult.count || 0,
        recentLeads: recentLeads.length || 0,
        totalCampaigns: campaignsResult.count || 0,
        totalFlows: flowsResult.count || 0,

        // [NEW] Financial Metrics
        totalOrdersCount,
        avgTicket,
        netRevenue,
        forecastedRevenue,
        chartData,
        campaignChartData,
        topStatesData
      });
    } catch (error) {
      console.error('Error loading dashboard metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Header Section matching reference */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/50">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-blue-500 rounded-md">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Visão Geral – Últimos 7 dias</h1>
          </div>
          <p className="text-muted-foreground flex items-center gap-2 text-sm">
            <Zap className="w-4 h-4 text-amber-500" />
            Foco: Conversão de Leads em Vendas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="bg-background gap-2">
                Últimos 7 dias
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Período</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Calendar className="mr-2 h-4 w-4" />
                <span>Últimos 7 dias</span>
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <span>Personalizado (Em breve)</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="ghost" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-stretch">

        {/* ROW 1: Metrics (Left) + Funnel (Right) */}

        {/* Metrics Section */}
        <div className="xl:col-span-3 flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Aquisição</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
            {/* Row 1 Metrics */}
            <MetricCard
              title="Novos Leads"
              value={metrics.recentLeads}
              description="semana atual"
              icon={Users}
              trend={{ value: 12, isPositive: true }}
              className="bg-card border-l-4 border-l-indigo-500"
            />
            <MetricCard
              title="Remarketing Ativos"
              value={metrics.totalLeads}
              description="Leads em processo"
              icon={TrendingUp}
              trend={{ value: 5, isPositive: true }}
              className="bg-card border-l-4 border-l-cyan-500"
            />
            <MetricCard
              title="Campanhas Ativas"
              value={metrics.totalCampaigns}
              description="disparos hoje"
              icon={ShoppingBag}
              className="bg-card border-l-4 border-l-violet-500"
            />

            {/* Row 2 Metrics */}
            <MetricCard
              title="Vendas"
              value={metrics.totalOrdersCount.toString()}
              description="Últimos 7 dias"
              icon={Activity}
              trend={{ value: 12, isPositive: true }}
              className="bg-card border-l-4 border-l-purple-500"
            />
            <MetricCard
              title="Ticket Médio"
              value={`R$ ${metrics.avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              description="Por venda"
              icon={Activity}
              className="bg-card border-l-4 border-l-blue-500"
            />
            <MetricCard
              title="Receita Geral"
              value={`R$ ${metrics.netRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              description={`Receita prevista: R$ ${metrics.forecastedRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              icon={DollarSign}
              className="bg-card border-l-4 border-l-emerald-500"
            />
          </div>
        </div>

        {/* Funnel Section (Aligned with Metrics) */}
        <div className="xl:col-span-1 pt-[44px]"> {/* pt-[44px] to offset the 'Aquisição' header height + gap */}
          <FunnelChart />
        </div>


        {/* ROW 2: Leads Chart (Full Width) */}

        <div className="xl:col-span-4">
          <LeadsChart data={metrics.chartData} />
        </div>


        {/* ROW 3: Campaigns + States (Left - Occupies 3 cols) */}
        {/* ROW 3: Campaigns (Left) + States (Right) */}
        <div className="xl:col-span-3">
          <CampaignChart data={metrics.campaignChartData} />
        </div>

        <div className="xl:col-span-1">
          <TopStatesChart data={metrics.topStatesData} />
        </div>

      </div>
    </div>
  );
}
