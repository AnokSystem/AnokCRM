import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function FunnelChart() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [steps, setSteps] = useState<any[]>([]);

    useEffect(() => {
        if (user) {
            loadFunnelData();
        }
    }, [user]);

    const loadFunnelData = async () => {
        try {
            // 1. Fetch all columns to get labels and colors
            // Order by position to respect kanban flow, though we will sort by value for "funnel" shape later
            const { data: columns, error: columnsError } = await supabase
                .from('kanban_columns')
                .select('*')
                .eq('user_id', user?.id)
                .order('position');

            if (columnsError) throw columnsError;

            // 2. Fetch leads distribution to count them
            const { data: leads, error: leadsError } = await supabase
                .from('leads')
                .select('column_id')
                .eq('user_id', user?.id);

            if (leadsError) throw leadsError;

            // 3. Aggregate counts
            const counts: Record<string, number> = {};
            leads?.forEach(lead => {
                counts[lead.column_id] = (counts[lead.column_id] || 0) + 1;
            });

            // 4. Merge and Format data
            // Deduplicate column_ids in case of multiple workspaces (basic approach: take first found)
            const uniqueStepsMap = new Map();

            columns?.forEach(col => {
                if (!uniqueStepsMap.has(col.column_id)) {
                    // Handle Tailwind gradient strings if present, or fallback
                    let colorClass = col.color || 'bg-gray-500';

                    uniqueStepsMap.set(col.column_id, {
                        label: col.label,
                        value: counts[col.column_id] || 0,
                        color: colorClass,
                    });
                }
            });

            let formattedSteps = Array.from(uniqueStepsMap.values());

            // 5. SORT BY VALUE DESCENDING
            formattedSteps.sort((a, b) => b.value - a.value);

            // [NEW] Limit to max 5 categories as per requirement
            formattedSteps = formattedSteps.slice(0, 5);

            // 6. Apply rainbow colors and rank-based widths for perfect funnel shape
            const totalItems = formattedSteps.length;
            const funnelColors = [
                'bg-indigo-500',
                'bg-sky-400',
                'bg-emerald-500',
                'bg-violet-600',
                'bg-rose-400',
                'bg-orange-400'
            ];

            const finalSteps = formattedSteps.map((step, index) => {
                // Linearly taper width from 100% down to 40%
                const percentage = totalItems > 1
                    ? 100 - (index * (60 / (totalItems - 1)))
                    : 100;

                return {
                    ...step,
                    width: `${Math.max(40, percentage)}%`,
                    color: funnelColors[index % funnelColors.length]
                };
            });

            setSteps(finalSteps);

        } catch (error) {
            console.error('Error loading funnel:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="rounded-xl border border-border bg-card p-6 h-full flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    // Calculate generic conversion rate (last step / first step)
    const conversionRate = steps.length > 1 && steps[0].value > 0
        ? Math.round((steps[steps.length - 1].value / steps[0].value) * 100)
        : 0;

    return (
        <div className="rounded-xl border border-border bg-card p-6 h-full font-sans flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-lg">Conversão</h3>
                {steps.length > 0 && (
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-500/10 text-green-500 flex items-center gap-1">
                        {conversionRate}% <ArrowRight className="w-3 h-3 rotate-[-45deg]" />
                    </span>
                )}
            </div>

            <div className="relative flex flex-col items-center gap-2 flex-1 justify-center">
                {steps.map((step, index) => (
                    <div
                        key={index}
                        className="relative group transition-all duration-300 hover:scale-[1.02]"
                        style={{ width: step.width }}
                    >
                        <div
                            className={cn(
                                "h-10 rounded-lg flex items-center justify-between px-4 text-white shadow-sm mx-auto cursor-default",
                                step.color
                            )}
                        >
                            <span className="text-sm font-medium truncate mr-2 flex-1">{step.label}</span>
                            <span className="font-bold text-sm bg-white/20 px-2 py-0.5 rounded">{step.value}</span>
                        </div>
                    </div>
                ))}

                {steps.length === 0 && (
                    <div className="text-center text-muted-foreground text-sm py-10">
                        Nenhum dado de funil disponível
                    </div>
                )}
            </div>

            <div className="mt-6 space-y-2 pt-4 border-t border-border/40">
                {steps.map((step, i) => (
                    <div key={i} className="flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors">
                        <div className="flex items-center gap-2">
                            <div className={cn("w-2 h-2 rounded-full", step.color)} />
                            <span className="truncate max-w-[140px]">{step.label}</span>
                        </div>
                        <span className="font-medium bg-secondary/50 px-1.5 rounded">{step.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
