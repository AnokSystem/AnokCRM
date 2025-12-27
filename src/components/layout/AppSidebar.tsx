import { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Workflow,
  FolderOpen,
  Megaphone,
  Package,
  Truck,
  ShoppingCart,
  Settings,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Tags,
  MessagesSquare,
  Shield,
  LogOut,
  LogIn,
  User as UserIcon,
  Plug, // [NEW]
  Wallet, // Financial
  CreditCard, // [NEW]
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { ProfileDialog } from '@/components/profile/ProfileDialog';
import { supabase } from '@/lib/supabase';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/', feature: null }, // Always visible
  { icon: MessagesSquare, label: 'Kanban', path: '/live-chat', feature: 'live_chat' },
  { icon: Users, label: 'Leads', path: '/leads', feature: 'leads' },
  { icon: Tags, label: 'Categorias', path: '/lead-categories', feature: 'leads' }, // Same as leads
  { icon: Workflow, label: 'Flow Builder', path: '/flows', feature: 'flows' },
  { icon: FolderOpen, label: 'Fluxos Salvos', path: '/saved-flows', feature: 'flows' }, // Same as flows
  { icon: Megaphone, label: 'Campanhas', path: '/campanhas', feature: 'campaigns' },
  { icon: MessageSquare, label: 'Remarketing', path: '/remarketing', feature: 'remarketing' },
  { icon: Package, label: 'Produtos', path: '/products', feature: 'products' },
  { icon: Truck, label: 'Fornecedores', path: '/suppliers', feature: 'suppliers' },
  { icon: ShoppingCart, label: 'Pedidos', path: '/orders', feature: 'orders' },
  { icon: Plug, label: 'Integrações', path: '/integrations', feature: 'integrations' },
  { icon: Wallet, label: 'Financeiro', path: '/financeiro', feature: 'financeiro' },
  { icon: Settings, label: 'Configurações', path: '/settings', feature: null }, // Always visible

];

interface AppSidebarProps {
  onNavigate?: () => void;
}

export function AppSidebar({ onNavigate }: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, activeFeatures, signOut } = useAuth();

  // Force expand on mobile
  const isMobile = !!onNavigate;
  const isCollapsed = isMobile ? false : collapsed;

  useEffect(() => {
    if (user) {
      loadAvatar();
    }
  }, [user]);

  const loadAvatar = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', user.id)
      .single();
    if (data?.avatar_url) {
      setAvatarUrl(data.avatar_url);
    }
  };

  const hasFeatureAccess = (feature: string | null) => {
    if (feature === null) return true;
    if (isAdmin) return true;
    return activeFeatures.includes(feature);
  };

  const handleLogout = async () => {
    await signOut();
    onNavigate?.();
    navigate('/auth');
  };

  return (
    <aside
      className={cn(
        'bg-sidebar border-r border-sidebar-border h-full flex flex-col transition-all duration-300 relative z-50',
        isCollapsed ? 'w-16 min-w-[4rem]' : isMobile ? 'w-full' : 'w-64 min-w-[16rem]'
      )}
    >
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <div className={cn("flex items-center gap-3", isCollapsed && "justify-center")}>
          <div className="w-10 h-10 flex-shrink-0 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
            <LayoutDashboard className="w-6 h-6 text-primary-foreground" />
          </div>
          {!isCollapsed && (
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                AnokCRM
              </h1>
              <p className="text-xs text-muted-foreground">Gestão Inteligente</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {menuItems
          .filter((item) => hasFeatureAccess(item.feature))
          .map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => onNavigate?.()}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group',
                  isActive
                    ? 'bg-primary/20 text-primary'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                )}
              >
                <item.icon
                  className={cn(
                    'w-5 h-5 flex-shrink-0 transition-colors',
                    isActive ? 'text-primary' : 'group-hover:text-primary'
                  )}
                />
                {!isCollapsed && <span className="font-medium truncate">{item.label}</span>}
                {isActive && !isCollapsed && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                )}
              </NavLink>
            );
          })}

        {/* Admin Link */}
        {isAdmin && (
          <NavLink
            to="/admin"
            onClick={() => onNavigate?.()}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group',
              location.pathname === '/admin'
                ? 'bg-primary/20 text-primary'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
            )}
          >
            <Shield
              className={cn(
                'w-5 h-5 flex-shrink-0 transition-colors',
                location.pathname === '/admin' ? 'text-primary' : 'group-hover:text-primary'
              )}
            />
            {!isCollapsed && <span className="font-medium truncate">Admin</span>}
          </NavLink>
        )}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-sidebar-border">
        {user ? (
          <button
            onClick={() => setProfileDialogOpen(true)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-sidebar-accent transition-colors group",
              isCollapsed && "justify-center"
            )}
          >
            <div className="w-8 h-8 flex-shrink-0 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border-2 border-primary/20">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-4 h-4 text-primary/50" />
              )}
            </div>
            {!isCollapsed && (
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-sidebar-foreground">{user.email}</p>
                <p className="text-xs text-muted-foreground">Ver perfil</p>
              </div>
            )}
          </button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/auth')}
            className="w-full justify-start hover:bg-sidebar-accent text-sidebar-foreground/70"
          >
            <LogIn className="w-4 h-4 mr-2" />
            {!isCollapsed && <span>Entrar</span>}
          </Button>
        )}
      </div>

      {/* Version Info */}
      <div className="pb-4 px-4 text-center">
        {!isCollapsed && <p className="text-[10px] text-muted-foreground/50">v1.1.0</p>}
      </div>

      {/* Floating Collapse Button - Hide on Mobile */}
      {!isMobile && (
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-1/2 -translate-y-1/2 z-50 w-6 h-6 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all flex items-center justify-center"
        >
          {collapsed ? (
            <ChevronRight className="w-3 h-3" />
          ) : (
            <ChevronLeft className="w-3 h-3" />
          )}
        </button>
      )}

      {/* Glow Effect */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-primary/20 rounded-full blur-3xl" />
      </div>

      {/* Profile Dialog */}
      <ProfileDialog
        open={profileDialogOpen}
        onOpenChange={(open) => {
          setProfileDialogOpen(open);
          if (!open) loadAvatar();
        }}
        onLogout={handleLogout}
      />
    </aside>
  );
}