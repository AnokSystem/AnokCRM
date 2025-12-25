import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';

const areaData = [
  { name: 'Seg', leads: 12, vendas: 8 },
  { name: 'Ter', leads: 19, vendas: 12 },
  { name: 'Qua', leads: 15, vendas: 10 },
  { name: 'Qui', leads: 22, vendas: 18 },
  { name: 'Sex', leads: 28, vendas: 22 },
  { name: 'Sáb', leads: 18, vendas: 14 },
  { name: 'Dom', leads: 10, vendas: 6 },
];

const pieData = [
  { name: 'Pagas', value: 65 },
  { name: 'Pendentes', value: 25 },
  { name: 'Canceladas', value: 10 },
];

const COLORS = ['hsl(267, 84%, 60%)', 'hsl(280, 90%, 55%)', 'hsl(240, 5%, 30%)'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass rounded-lg p-3 shadow-lg">
        <p className="text-sm font-medium mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function LeadsChart({ data }: { data?: any[] }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 h-full flex flex-col">
      <h3 className="text-lg font-semibold mb-6">Leads vs Vendas (7 dias)</h3>
      <div className="flex-1 min-h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data || areaData}>
            <defs>
              <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(267, 84%, 60%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(267, 84%, 60%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorVendas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(280, 90%, 55%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(280, 90%, 55%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 5%, 18%)" />
            <XAxis dataKey="name" stroke="hsl(240, 5%, 64%)" fontSize={12} />
            <YAxis stroke="hsl(240, 5%, 64%)" fontSize={12} />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="leads"
              stroke="hsl(267, 84%, 60%)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorLeads)"
              name="Leads"
            />
            <Area
              type="monotone"
              dataKey="vendas"
              stroke="hsl(280, 90%, 55%)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorVendas)"
              name="Vendas"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function SalesDistributionChart() {
  return (
    <div className="rounded-xl border border-border bg-card p-6 h-full flex flex-col">
      <h3 className="text-lg font-semibold mb-6">Distribuição de Vendas</h3>
      <div className="flex-1 min-h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={5}
              dataKey="value"
            >
              {pieData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-center gap-6 mt-4">
        {pieData.map((entry, index) => (
          <div key={entry.name} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: COLORS[index] }}
            />
            <span className="text-sm text-muted-foreground">{entry.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const monthlyData = [
  { month: 'Jan', value: 4500 },
  { month: 'Fev', value: 5200 },
  { month: 'Mar', value: 4800 },
  { month: 'Abr', value: 6100 },
  { month: 'Mai', value: 7200 },
  { month: 'Jun', value: 6800 },
];

export function RevenueChart() {
  return (
    <div className="rounded-xl border border-border bg-card p-6 h-full flex flex-col">
      <h3 className="text-lg font-semibold mb-6">Receita Mensal</h3>
      <div className="flex-1 min-h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={monthlyData}>
            <defs>
              <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(267, 84%, 60%)" />
                <stop offset="100%" stopColor="hsl(280, 90%, 50%)" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 5%, 18%)" />
            <XAxis dataKey="month" stroke="hsl(240, 5%, 64%)" fontSize={12} />
            <YAxis stroke="hsl(240, 5%, 64%)" fontSize={12} />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="value"
              fill="url(#barGradient)"
              radius={[4, 4, 0, 0]}
              name="Receita (R$)"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

const campaignData = [
  { name: 'Seg', enviados: 240, aberturas: 120 },
  { name: 'Ter', enviados: 380, aberturas: 190 },
  { name: 'Qua', enviados: 290, aberturas: 150 },
  { name: 'Qui', enviados: 450, aberturas: 230 },
  { name: 'Sex', enviados: 520, aberturas: 280 },
  { name: 'Sáb', enviados: 310, aberturas: 160 },
  { name: 'Dom', enviados: 180, aberturas: 90 },
];

export function CampaignChart({ data }: { data?: any[] }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 h-full flex flex-col">
      <h3 className="text-lg font-semibold mb-6">Envio das Campanhas</h3>
      <div className="flex-1 min-h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data || campaignData}>
            <defs>
              <linearGradient id="colorEnviados" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(220, 80%, 60%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(220, 80%, 60%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 5%, 18%)" />
            <XAxis dataKey="name" stroke="hsl(240, 5%, 64%)" fontSize={12} />
            <YAxis stroke="hsl(240, 5%, 64%)" fontSize={12} />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="enviados"
              stroke="hsl(220, 80%, 60%)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorEnviados)"
              name="Enviados"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

const geoData = [
  { name: 'SP', value: 45 },
  { name: 'RJ', value: 20 },
  { name: 'MG', value: 15 },
  { name: 'RS', value: 10 },
  { name: 'PR', value: 10 },
];

const GEO_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

export function TopStatesChart({ data }: { data?: any[] }) {
  // Safe colors handling for various lengths
  const safeData = data || geoData;

  return (
    <div className="rounded-xl border border-border bg-card p-6 h-full flex flex-col">
      <h3 className="text-lg font-semibold mb-6">Top 5 Estados</h3>
      <div className="flex-1 min-h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={safeData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={5}
              dataKey="value"
            >
              {safeData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={GEO_COLORS[index % GEO_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-center flex-wrap gap-4 mt-4">
        {safeData.map((entry, index) => (
          <div key={entry.name} className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: GEO_COLORS[index % GEO_COLORS.length] }}
            />
            <span className="text-sm text-muted-foreground">{entry.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
