import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface AppLayoutProps {
  children: ReactNode;
}

import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

export function AppLayout({ children }: AppLayoutProps) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Desktop Sidebar - Hidden on mobile */}
      <div className="hidden md:flex h-full">
        <AppSidebar />
      </div>

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Mobile Header - Visible only on mobile */}
        <header className="md:hidden border-b border-border bg-sidebar p-4 flex items-center gap-4">
          <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="-ml-2">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-[80%] max-w-[300px] border-r-0">
              <AppSidebar onNavigate={() => setIsMobileOpen(false)} />
            </SheetContent>
          </Sheet>
          <div className="font-semibold text-lg">AnokCRM</div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto bg-background">
          <div className="container mx-auto p-4 md:p-6 max-w-[1600px]">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
