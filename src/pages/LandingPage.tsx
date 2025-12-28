import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Check, MessageSquare, Zap, BarChart3, Shield, Users, LayoutDashboard, ArrowRight, Star, Lock } from 'lucide-react';

export default function LandingPage() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const handleLogin = () => {
        if (user) {
            navigate('/dashboard');
        } else {
            navigate('/login');
        }
    };

    const plans = [
        {
            name: 'Essencial',
            price: 'R$ 67',
            period: '/mês',
            description: 'Para quem está começando',
            priceId: 'price_essential',
            checkoutUrl: 'https://link.anok.com.br/plano-essencial',
            features: ['Acesso Individual', 'Leads Ilimitados', 'Kanban', 'Gerador de Pedidos', 'Financeiro & Estoque'],
            highlight: false
        },
        {
            name: 'Performance',
            price: 'R$ 127',
            period: '/mês',
            description: 'Para times em crescimento',
            priceId: 'price_performance',
            checkoutUrl: 'https://link.anok.com.br/plano-performance',
            features: ['Acesso Individual', 'Leads Ilimitados', 'Fluxos de Automação', 'Campanha de Mensagens', 'Financeiro & Estoque'],
            highlight: true
        },
        {
            name: 'Elite',
            price: 'R$ 197',
            period: '/mês',
            description: 'Para grandes operações',
            priceId: 'price_elite',
            checkoutUrl: 'https://link.anok.com.br/plano-elite',
            features: ['Acesso Individual', 'Leads Ilimitados', 'Todas as Funcionalidades', 'Remarketing Automático', 'Api de Integração', 'Suporte Prioritário'],
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
                                <Button onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}>
                                    Assinar
                                </Button>
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
                        Cansado de perder vendas <br />
                        <span className="text-primary">na bagunça?</span>
                    </h1>
                    <h2 className="text-3xl lg:text-4xl font-bold text-primary mb-6">
                        Organize seus clientes de Forma Inteligente!
                    </h2>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
                        Chega de atender no improviso. Organize seus leads, automatize o retorno e nunca mais perca uma venda por esquecimento.
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
                                />
                                <FeatureCard
                                    icon={Users}
                                    title="Gestão de Leads"
                                    description="Centralize seus contatos com histórico completo, anotações, agendamentos e tarefas em um só perfil."
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

            {/* Testimonials Section */}
            <section className="py-24 bg-background">
                <div className="container">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold mb-4">Quem usa, vende mais</h2>
                        <p className="text-muted-foreground">Junte-se a mais de 1.000 empresas que transformaram seu atendimento.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <TestimonialCard
                            name="Ricardo Souza"
                            role="CEO, E-commerce Tech"
                            content="O Kanban do AnokCRM mudou nossa operação. Antes perdíamos leads no WhatsApp web, agora temos controle total de cada venda."
                            initial="RS"
                        />
                        <TestimonialCard
                            name="Fernanda Lima"
                            role="Infoprodutora"
                            content="A integração com a Kiwify e os disparos automáticos me fizeram recuperar R$ 15k em carrinhos abandonados só no primeiro mês."
                            initial="FL"
                        />
                        <TestimonialCard
                            name="Carlos Mendes"
                            role="Microempreendedor"
                            content="Antes eu anotava tudo no caderno e perdia pedidos. Com o AnokCRM, consigo organizar meus clientes e acompanhar cada etapa da venda de forma muito simples."
                            initial="CM"
                        />
                    </div>
                </div>
            </section>

            {/* Integrations Section */}
            <section className="py-24">
                <div className="container text-center">
                    <h2 className="text-3xl font-bold mb-12">Integre com as maiores plataformas do mercado</h2>
                    <div className="flex flex-wrap justify-center items-center gap-12 opacity-70 grayscale hover:grayscale-0 transition-all duration-500">
                        <div className="flex items-center gap-2">
                            <img src="/assets/integrations/hotmart.png" alt="Hotmart" className="h-12 object-contain" />
                        </div>
                        <div className="flex items-center gap-2">
                            <img src="/assets/integrations/kiwify.png" alt="Kiwify" className="h-12 object-contain" />
                        </div>
                        <div className="flex items-center gap-2">
                            <img src="/assets/integrations/braip.png" alt="Braip" className="h-16 object-contain" />
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
                                        onClick={() => window.open(plan.checkoutUrl, '_blank')}
                                    >
                                        Assinar Agora
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* Guarantee & Security Section */}
            <section className="py-16 bg-muted/30 border-t">
                <div className="container max-w-5xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Guarantee */}
                        <div className="flex items-center gap-6 p-8 rounded-2xl bg-background border shadow-sm">
                            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                                <Shield className="w-8 h-8 text-green-500" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold mb-2">Garantia de 7 Dias</h3>
                                <p className="text-muted-foreground">Experimente sem riscos. Se não gostar, devolvemos 100% do seu investimento.</p>
                            </div>
                        </div>

                        {/* Security */}
                        <div className="flex items-center gap-6 p-8 rounded-2xl bg-background border shadow-sm">
                            <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                                <Lock className="w-8 h-8 text-blue-500" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold mb-2">Checkout Seguro</h3>
                                <p className="text-muted-foreground">Seus dados são protegidos com criptografia bancária de ponta a ponta.</p>
                            </div>
                        </div>
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

function FeatureCard({ icon: Icon, title, description }: { icon: any, title: string, description: string }) {
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
        </Card>
    );
}

function TestimonialCard({ name, role, content, initial }: { name: string, role: string, content: string, initial: string }) {
    return (
        <Card className="border-none shadow-sm bg-muted/30">
            <CardHeader className="flex flex-row items-center gap-4 pb-4">
                <Avatar>
                    <AvatarFallback className="bg-primary/20 text-primary font-bold">{initial}</AvatarFallback>
                </Avatar>
                <div>
                    <CardTitle className="text-base">{name}</CardTitle>
                    <CardDescription>{role}</CardDescription>
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex gap-1 mb-3 text-yellow-500">
                    <Star className="w-4 h-4 fill-current" />
                    <Star className="w-4 h-4 fill-current" />
                    <Star className="w-4 h-4 fill-current" />
                    <Star className="w-4 h-4 fill-current" />
                    <Star className="w-4 h-4 fill-current" />
                </div>
                <p className="text-muted-foreground italic">"{content}"</p>
            </CardContent>
        </Card>
    );
}
