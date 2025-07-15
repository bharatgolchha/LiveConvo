import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { 
  Home,
  LogOut,
  Sparkles,
  ChevronRight,
  UserPlus
} from 'lucide-react';

export function SharedReportHeader() {
  const { user, signOut } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo and Brand */}
          <Link href="/" className="flex items-center gap-2 group">
            <Image 
              src={theme === 'dark' 
                ? "https://ucvfgfbjcrxbzppwjpuu.supabase.co/storage/v1/object/public/images//DarkMode2.png"
                : "https://ucvfgfbjcrxbzppwjpuu.supabase.co/storage/v1/object/public/images//LightMode2.png"
              }
              alt="liveprompt.ai - AI-powered conversation intelligence platform"
              width={140}
              height={32}
              className="object-contain transition-transform group-hover:scale-105"
            />
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-primary/10 border border-primary/30 text-primary">
              <Sparkles className="w-3 h-3" />
              Shared Report
            </span>
          </Link>

          {/* Right Side Actions */}
          <div className="flex items-center gap-3">
            <ThemeToggle className="h-9 w-9" />
            
            {user ? (
              // Authenticated User Actions
              <>
                <Button
                  onClick={() => router.push('/dashboard')}
                  variant="ghost"
                  size="sm"
                  className="hidden sm:flex items-center gap-2"
                >
                  <Home className="w-4 h-4" />
                  Dashboard
                </Button>
                <Button
                  onClick={handleSignOut}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Sign Out</span>
                </Button>
              </>
            ) : (
              // Guest Actions
              <>
                <Link href="/auth/login">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="hidden sm:flex items-center gap-2"
                  >
                    Sign In
                  </Button>
                </Link>
                <Link href="/auth/signup">
                  <Button
                    variant="primary"
                    size="sm"
                    className="flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Get Started Free</span>
                    <ChevronRight className="w-3 h-3" />
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}