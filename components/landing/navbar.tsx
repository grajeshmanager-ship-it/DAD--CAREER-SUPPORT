"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, User, LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="container px-4 md:px-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between h-16">
          <Link href={user ? "/dashboard" : "/"} className="text-2xl font-bold text-primary">
            DAD
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Stories</a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
          </div>

          {user ? (
            <div className="hidden md:flex items-center gap-3">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="gap-2">
                  <User className="w-4 h-4" />
                  Dashboard
                </Button>
              </Link>
              <Button size="sm" variant="outline" className="rounded-full gap-2" onClick={handleSignOut}>
                <LogOut className="w-4 h-4" />
                Sign Out
              </Button>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-3">
              <Link href="/login">
                <Button variant="ghost" size="sm">Sign In</Button>
              </Link>
              <Link href="/signup">
                <Button size="sm" className="rounded-full">Get Started</Button>
              </Link>
            </div>
          )}

          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>

        {/* Mobile nav */}
        {isOpen && (
          <div className="md:hidden py-4 border-t border-border/50">
            <div className="flex flex-col gap-4">
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Stories</a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
              <div className="flex flex-col gap-2 pt-4 border-t border-border/50">
                {user ? (
                  <>
                    <Link href="/dashboard">
                      <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                        <User className="w-4 h-4" /> Dashboard
                      </Button>
                    </Link>
                    <Button size="sm" variant="outline" className="rounded-full gap-2" onClick={handleSignOut}>
                      <LogOut className="w-4 h-4" /> Sign Out
                    </Button>
                  </>
                ) : (
                  <>
                    <Link href="/login">
                      <Button variant="ghost" size="sm" className="w-full">Sign In</Button>
                    </Link>
                    <Link href="/signup">
                      <Button size="sm" className="rounded-full w-full">Get Started</Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
