import { Share2, Check, Zap, MessageSquare, BarChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export default function Subscription() {
    const { user } = useAuth();
    const { toast } = useToast();

    const handleSubscribe = async (priceId: string) => {
        if (!user) {
            toast({ title: 'Erro', description: 'Você precisa estar logado.', variant: 'destructive' });
            return;
        }

        try {
            // In production, user would provide their own API URL or this would call the backend
            const response = await fetch('http://localhost:3000/create-checkout-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    priceId,
                    userId: user.id,
                    successUrl: window.location.origin + '/settings?success=true',
                    cancelUrl: window.location.origin + '/subscription?canceled=true',
                }),
            });

            const data = await response.json();

            if (data.url) {
                window.location.href = data.url;
            } else {
                toast({ title: 'Erro', description: 'Não foi possível iniciar o pagamento.', variant: 'destructive' });
            }
        } catch (error) {
            console.error('Error:', error);
            toast({ title: 'Erro', description: 'Erro ao conectar com o servidor.', variant: 'destructive' });
        }
    };

    const plans = [
        {
            name: 'Plano Essencial',
            price: 'R$ 67',
            period: '/mês',
            description: 'Ideal para quem está començando',
            priceId: 'price_1ShipCCTlrm02nOy5GvIo4HL',
            features: [
                '1 Conexão de WhatsApp',
                'Gestão de Leads Básica',
                'Relatórios Simples',
                'Até 1.000 mensagens/mês'
            ],
            highlight: false
        },
        {
            name: 'Plano Performance',
            price: 'R$ 127',
            period: '/mês',
            description: 'Para escalar suas vendas',
            priceId: 'price_1ShitOCTlrm02nOyKfAzotve',
            features: [
                '3 Conexões de WhatsApp',
                'Kanban Ilimitado',
                'Automações e Webhooks',
                'Módulo Financeiro Completo',
                'Relatórios em PDF'
            ],
            highlight: true
        },
        {
            name: 'Plano Elite',
            price: 'R$ 197',
            period: '/mês',
            description: 'Estrutura completa',
            priceId: 'price_1ShiuHCTlrm02nOyKHTroyFe',
            features: [
                '10 Conexões de WhatsApp',
                'Múltiplos Usuários',
                'API Dedicada',
                'Suporte Prioritário 24/7',
                'Consultoria de Implantação'
            ],
            highlight: false
        }
    ];

    return (
        <div className="p-8 max-w-7xl mx-auto animate-fade-in">
            <div className="text-center mb-12">
                <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                    Escolha o Plano Ideal
                </h1>
                <p className="text-xl text-muted-foreground">
                    Escale seu atendimento e vendas com a melhor ferramenta de CRM
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
                                Mais Popular
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
                                onClick={() => handleSubscribe(plan.priceId)}
                                className={`w-full ${plan.highlight ? 'gradient-primary' : ''}`}
                                variant={plan.highlight ? 'default' : 'outline'}
                                size="lg"
                            >
                                Assinar Agora
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>

            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-center text-muted-foreground">
                <div className="p-4">
                    <Share2 className="w-10 h-10 mx-auto mb-4 text-primary" />
                    <h3 className="font-semibold text-foreground mb-2">Multi-Canal</h3>
                    <p>Centralize WhatsApp, Instagram e Facebook em um só lugar</p>
                </div>
                <div className="p-4">
                    <Zap className="w-10 h-10 mx-auto mb-4 text-primary" />
                    <h3 className="font-semibold text-foreground mb-2">Automação</h3>
                    <p>Responda 24/7 com fluxos inteligentes e automáticos</p>
                </div>
                <div className="p-4">
                    <BarChart className="w-10 h-10 mx-auto mb-4 text-primary" />
                    <h3 className="font-semibold text-foreground mb-2">Métricas</h3>
                    <p>Acompanhe conversões e desempenho da equipe em tempo real</p>
                </div>
            </div>
        </div>
    );
}
