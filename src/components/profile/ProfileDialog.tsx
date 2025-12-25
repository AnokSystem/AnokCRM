import { useState, useEffect } from 'react';
import { User, Mail, Phone, Lock, Camera, LogOut, Sun, Moon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { fileToBase64 } from '@/lib/fileUtils';

interface ProfileDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onLogout?: () => void;
}

export function ProfileDialog({ open, onOpenChange, onLogout }: ProfileDialogProps) {
    const { user } = useAuth();
    const { toast } = useToast();

    // Theme state
    const [theme, setTheme] = useState<'dark' | 'light'>(() => {
        return (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
    });

    // Apply theme effect
    useEffect(() => {
        const root = window.document.documentElement;
        if (theme === 'light') {
            root.classList.add('light');
        } else {
            root.classList.remove('light');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    // Load user data when dialog opens
    useEffect(() => {
        if (open && user) {
            loadUserData();
        }
    }, [open, user]);

    const loadUserData = async () => {
        if (!user) return;

        const { data, error } = await supabase
            .from('profiles')
            .select('full_name, phone, avatar_url')
            .eq('id', user.id)
            .single();

        if (data) {
            setFullName(data.full_name || '');
            setPhone(data.phone || '');
            setAvatarUrl(data.avatar_url || '');
        }
    };

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const base64 = await fileToBase64(file);
            setAvatarUrl(base64);
        }
    };

    const handleSaveProfile = async () => {
        if (!user) return;

        setLoading(true);
        try {
            // Update profile info
            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    full_name: fullName,
                    phone: phone,
                    avatar_url: avatarUrl
                })
                .eq('id', user.id);

            if (profileError) throw profileError;

            toast({ title: 'Perfil atualizado com sucesso!' });
            onOpenChange(false);
        } catch (error: any) {
            toast({
                title: 'Erro ao atualizar perfil',
                description: error.message,
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async () => {
        if (!newPassword || !confirmPassword) {
            toast({ title: 'Preencha a nova senha', variant: 'destructive' });
            return;
        }

        if (newPassword !== confirmPassword) {
            toast({ title: 'As senhas não coincidem', variant: 'destructive' });
            return;
        }

        if (newPassword.length < 6) {
            toast({ title: 'A senha deve ter pelo menos 6 caracteres', variant: 'destructive' });
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            toast({ title: 'Senha alterada com sucesso!' });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            toast({
                title: 'Erro ao alterar senha',
                description: error.message,
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold">Configurações de Perfil</DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 py-4">
                    {/* Left Column: Avatar & Personal Info */}
                    <div className="md:col-span-5 space-y-6">
                        {/* Avatar Section */}
                        <div className="flex flex-col items-center gap-4 p-6 rounded-xl bg-muted/30 border border-border/50">
                            <div className="relative group">
                                <div className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border-4 border-primary/20 shadow-xl">
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                    ) : (
                                        <User className="w-16 h-16 text-primary/50" />
                                    )}
                                </div>
                                <label className="absolute bottom-1 right-1 p-2.5 rounded-full bg-primary text-primary-foreground cursor-pointer hover:bg-primary/90 transition-all shadow-lg hover:scale-110 active:scale-95">
                                    <Camera className="w-5 h-5" />
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleAvatarChange}
                                        className="hidden"
                                    />
                                </label>
                            </div>
                            <div className="text-center">
                                <h3 className="font-semibold text-lg">{fullName || 'Usuário'}</h3>
                                <p className="text-sm text-muted-foreground">{user?.email}</p>
                            </div>
                        </div>

                        {/* Profile Info */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold uppercase text-muted-foreground tracking-wider mb-3">Dados Pessoais</h3>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="fullName">Nome Completo</Label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            id="fullName"
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            placeholder="Seu nome"
                                            className="pl-10"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            id="email"
                                            value={user?.email || ''}
                                            disabled
                                            className="pl-10 bg-muted/50"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="phone">Telefone</Label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            id="phone"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            placeholder="(11) 99999-9999"
                                            className="pl-10"
                                        />
                                    </div>
                                </div>

                                <Button onClick={handleSaveProfile} disabled={loading} className="w-full gradient-primary font-medium shadow-lg shadow-primary/20">
                                    Salvar Alterações
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Security & Settings */}
                    <div className="md:col-span-7 space-y-8 md:pl-8 md:border-l border-border/50">
                        {/* Theme Section */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold uppercase text-muted-foreground tracking-wider">Aparência</h3>
                            <div className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-card hover:bg-accent/5 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-full ${theme === 'dark' ? 'bg-indigo-500/10' : 'bg-orange-500/10'}`}>
                                        {theme === 'dark' ? (
                                            <Moon className="w-6 h-6 text-indigo-500 fill-indigo-500/20" />
                                        ) : (
                                            <Sun className="w-6 h-6 text-orange-500 fill-orange-500/20" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-base">Tema {theme === 'dark' ? 'Escuro' : 'Claro'}</p>
                                        <p className="text-sm text-muted-foreground"> {theme === 'dark' ? 'Visual confortável para a noite' : 'Visual claro para o dia'}</p>
                                    </div>
                                </div>
                                <Button
                                    variant="outline"
                                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                                >
                                    Alternar
                                </Button>
                            </div>
                        </div>

                        {/* Password Section */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold uppercase text-muted-foreground tracking-wider">Segurança</h3>
                            <div className="p-5 rounded-xl border border-border/50 bg-card space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="newPassword">Nova Senha</Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            id="newPassword"
                                            type="password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder="Mínimo 6 caracteres"
                                            className="pl-10"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            id="confirmPassword"
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="Digite novamente"
                                            className="pl-10"
                                        />
                                    </div>
                                </div>

                                <Button
                                    onClick={handleChangePassword}
                                    disabled={loading || !newPassword}
                                    variant="secondary"
                                    className="w-full"
                                >
                                    Atualizar Senha
                                </Button>
                            </div>
                        </div>

                        {/* Logout Section */}
                        {onLogout && (
                            <div className="pt-4">
                                <Button
                                    onClick={() => {
                                        onLogout();
                                        onOpenChange(false);
                                    }}
                                    variant="destructive"
                                    className="w-full opacity-90 hover:opacity-100"
                                >
                                    <LogOut className="w-4 h-4 mr-2" />
                                    Sair da Conta
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
