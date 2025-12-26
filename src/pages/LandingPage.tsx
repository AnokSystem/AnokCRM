import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, MessageSquare, Zap, BarChart3, Shield, Users, LayoutDashboard, ArrowRight } from 'lucide-react';

export default function LandingPage() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const handleSubscribe = (priceId: string) => {
        if (user) {
            // If user is logged in, redirect to Subscription page to handle checkout
            // Or we could call checkout directly here, but Subscription page has the logic.
            // Let's redirect to Subscription page with a query param to auto-select?
            // For simplicity v1: Redirect to Subscription page (internal)
            navigate('/subscription');
        } else {
            // If not logged in, redirect to Auth then they can find plans inside
            navigate('/auth');
        }
    };

    const plans = [
        {
            name: 'Plano Essencial',
            price: 'R$ 67',
            period: '/mês',
            description: 'Ideal para quem está começando',
            priceId: 'price_1ShipCCTlrm02nOy5GvIo4HL',
            features: ['1 Conexão de WhatsApp', 'Gestão de Leads Básica', 'Relatórios Simples', 'Mensagens Ilimitadas'],
            highlight: false
        },
        {
            name: 'Plano Performance',
            price: 'R$ 127',
            period: '/mês',
            description: 'Para escalar suas vendas',
            priceId: 'price_1ShitOCTlrm02nOyKfAzotve',
            features: ['3 Conexões de WhatsApp', 'Kanban Ilimitado', 'Automações e Webhooks', 'Módulo Financeiro Completo'],
            highlight: true
        },
        {
            name: 'Plano Elite',
            price: 'R$ 197',
            period: '/mês',
            description: 'Estrutura completa',
            priceId: 'price_1ShiuHCTlrm02nOyKHTroyFe',
            features: ['10 Conexões de WhatsApp', 'Múltiplos Usuários', 'API Dedicada', 'Suporte Prioritário 24/7'],
            highlight: false
        }
    ];

    return (
        <div className="min-h-screen bg-background">
            {/* Navbar */}
            <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
                <div className="container flex h-16 items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                            <LayoutDashboard className="w-5 h-5 text-primary-foreground" />
                        </div>
                        <span className="text-xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                            AnokCRM
                        </span>
                    </div>
                    <div className="flex items-center gap-4">
                        {user ? (
                            <Button onClick={() => navigate('/')}>Ir para o Dashboard</Button>
                        ) : (
                            <>
                                <Button variant="ghost" onClick={() => navigate('/auth')}>Entrar</Button>
                                <Button onClick={() => navigate('/auth')}>Começar Grátis</Button>
                            </>
                        )}
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative overflow-hidden py-24 lg:py-32">
                <div className="absolute inset-0 z-0">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-3xl" />
                </div>
                <div className="container relative z-10 text-center">
                    <h1 className="text-5xl lg:text-7xl font-bold tracking-tight mb-6 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                        Seu WhatsApp. <br />
                        <span className="text-primary">Máquina de Vendas.</span>
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
                        Organize leads, automatize conversas e gerencie suas vendas em um único lugar.
                        O CRM perfeito para quem vende pelo WhatsApp.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Button size="lg" className="h-12 px-8 text-lg gradient-primary glow" onClick={() => navigate(user ? '/' : '/auth')}>
                            Começar Agora <ArrowRight className="ml-2 w-5 h-5" />
                        </Button>
                        <Button size="lg" variant="outline" className="h-12 px-8 text-lg" onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}>
                            Ver Planos
                        </Button>
                    </div>
                </div>
            </section>

            {/* Product Showcase */}
            <section className="py-12 lg:py-24">
                <div className="container">
                    <div className="rounded-xl overflow-hidden border shadow-2xl bg-card">
                        <img src="/assets/screenshots/dashboard.png" alt="Dashboard AnokCRM" className="w-full h-auto" />
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-24 bg-muted/30">
                <div className="container">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl lg:text-4xl font-bold mb-4">Tudo o que você precisa em um só lugar</h2>
                        <p className="text-muted-foreground max-w-2xl mx-auto">
                            O AnokCRM unifica atendimento, vendas e gestão. Escolha o módulo que mais importa para você ou use todos juntos.
                        </p>
                    </div>

                    <div className="grid gap-12">
                        {/* CRM & Vendas */}
                        <div className="space-y-8">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="p-3 rounded-xl bg-purple-500/10">
                                    <MessageSquare className="w-8 h-8 text-purple-500" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold">CRM & Vendas</h3>
                                    <p className="text-muted-foreground">Transforme conversas em vendas organizadas.</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <FeatureCard
                                    icon={LayoutDashboard}
                                    title="Kanban Live Chat"
                                    description="Visualize todos os seus atendimentos do WhatsApp em colunas personalizáveis. Arraste e solte para mudar o status."
                                    image="/assets/screenshots/kanban.png"
                                />
                                <FeatureCard
                                    icon={Users}
                                    title="Gestão de Leads"
                                    description="Centralize seus contatos com histórico completo, anotações, agendamentos e tarefas em um só perfil."
                                    image="/assets/screenshots/leads.png"
                                />
                                <FeatureCard
                                    icon={Zap}
                                    title="Funil de Vendas"
                                    description="Crie etapas personalizadas para o seu processo comercial e monitore a taxa de conversão em cada fase."
                                />
                            </div>
                        </div>

                        {/* Marketing no WhatsApp */}
                        <div className="space-y-8">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="p-3 rounded-xl bg-green-500/10">
                                    <Zap className="w-8 h-8 text-green-500" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold">Marketing Inteligente no WhatsApp</h3>
                                    <p className="text-muted-foreground">Automatize sua comunicação e venda mais.</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <FeatureCard
                                    icon={Zap}
                                    title="Construtor de Fluxos"
                                    description="Crie chatbots avançados para o WhatsApp arrastando blocos. Envie áudios como se fossem gravados na hora e PDFs."
                                    image="/assets/screenshots/flow_builder.png"
                                />
                                <FeatureCard
                                    icon={MessageSquare}
                                    title="Disparos em Massa"
                                    description="Crie campanhas de mensagens para toda a sua base ou segmentos específicos com alta taxa de entrega."
                                />
                                <FeatureCard
                                    icon={BarChart3}
                                    title="Remarketing Automático"
                                    description="Recupere vendas perdidas enviando sequências automáticas para quem parou de responder no WhatsApp."
                                    image="/assets/screenshots/remarketing.png"
                                />
                            </div>
                        </div>

                        {/* Gestão Completa */}
                        <div className="space-y-8">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="p-3 rounded-xl bg-blue-500/10">
                                    <BarChart3 className="w-8 h-8 text-blue-500" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold">Gestão Total</h3>
                                    <p className="text-muted-foreground">Controle financeiro e estoque integrado.</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <FeatureCard
                                    icon={LayoutDashboard}
                                    title="Financeiro Integrado"
                                    description="Acompanhe fluxo de caixa, contas a pagar/receber e gere relatórios financeiros detalhados."
                                />
                                <FeatureCard
                                    icon={Shield}
                                    title="Controle de Estoque"
                                    description="Gerencie produtos e fornecedores. O estoque é atualizado automaticamente conforme as vendas."
                                />
                                <FeatureCard
                                    icon={Users}
                                    title="Dashboard de Métricas"
                                    description="Tenha uma visão 360º do seu negócio: Vendas por dia, conversão de leads e ROI de campanhas."
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="py-24">
                <div className="container">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold mb-4">Planos que crescem com você</h2>
                        <p className="text-muted-foreground">Escolha a melhor opção para o seu negócio</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                        {plans.map((plan) => (
                            <Card
                                key={plan.name}
                                className={`relative flex flex-col ${plan.highlight
                                    ? 'border-primary shadow-2xl shadow-primary/20 scale-105 z-10'
                                    : 'border-border'
                                    }`}
                            >
                                {plan.highlight && (
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-bold">
                                        Recomendado
                                    </div>
                                )}

                                <CardHeader>
                                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                                    <CardDescription>{plan.description}</CardDescription>
                                </CardHeader>

                                <CardContent className="flex-1">
                                    <div className="mb-6">
                                        <span className="text-4xl font-bold">{plan.price}</span>
                                        <span className="text-muted-foreground">{plan.period}</span>
                                    </div>

                                    <ul className="space-y-3">
                                        {plan.features.map((feature) => (
                                            <li key={feature} className="flex items-center gap-2">
                                                <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                                                <span className="text-sm">{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>

                                <CardFooter>
                                    <Button
                                        className={`w-full ${plan.highlight ? 'gradient-primary' : ''}`}
                                        variant={plan.highlight ? 'default' : 'outline'}
                                        size="lg"
                                        onClick={() => handleSubscribe(plan.priceId)}
                                    >
                                        Assinar Agora
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 border-t bg-muted/20">
                <div className="container text-center text-muted-foreground">
                    <p>© 2024 AnokCRM. Todos os direitos reservados.</p>
                </div>
            </footer>
        </div>
    );
}

function FeatureCard({ icon: Icon, title, description, image }: { icon: any, title: string, description: string, image?: string }) {
    return (
        <Card className="bg-card/50 backdrop-blur border-none shadow-lg hover:shadow-xl transition-all h-full flex flex-col overflow-hidden group">
            <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <Icon className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
                <p className="text-muted-foreground mb-4">{description}</p>
            </CardContent>
            {image && (
                <div className="mt-auto border-t border-border/50">
                    <img src={image} alt={title} className="w-full h-40 object-cover object-top opacity-80 group-hover:opacity-100 transition-opacity" />
                </div>
            )}
        </Card>
    );
}
