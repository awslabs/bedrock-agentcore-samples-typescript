'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu';
import UserMenu from './UserMenu';
import { Home, Plus, List, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createChat } from '@/../utils/chatStore';

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [isCreatingChat, setIsCreatingChat] = useState(false);

  const navItems = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/chats', label: 'Chat History', icon: List },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

  const handleNewChat = async () => {
    setIsCreatingChat(true);
    try {
      const sessionId = await createChat();
      router.push(`/chat?id=${sessionId}`);
    } catch (error) {
      console.error('Error creating chat session:', error);
    } finally {
      setIsCreatingChat(false);
    }
  };

  return (
    <nav className="border-b bg-nav-background border-nav-border text-nav-foreground">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Logo/Brand */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center space-x-2 text-nav-foreground hover:text-nav-foreground/80">
            <span className="font-bold text-xl">Agents for Energy</span>
          </Link>

          {/* Navigation Links - Desktop */}
          <NavigationMenu className="hidden md:flex">
            <NavigationMenuList>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                
                return (
                  <NavigationMenuItem key={item.href}>
                    <NavigationMenuLink
                      asChild
                      className={cn(
                        navigationMenuTriggerStyle(),
                        'gap-2 h-8 bg-transparent text-nav-foreground hover:bg-nav-foreground/10',
                        isActive && 'bg-nav-foreground/20 text-nav-foreground'
                      )}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <Link href={item.href}>
                        <Icon className="h-4 w-4" aria-hidden="true" />
                        {item.label}
                      </Link>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                );
              })}
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        {/* New Chat Button & User Menu */}
        <div className="flex items-center gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={handleNewChat}
            disabled={isCreatingChat}
            className="gap-2"
            aria-label="Create new chat"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">New Chat</span>
          </Button>
          <UserMenu />
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden border-t border-nav-border">
        <NavigationMenu className="container">
          <NavigationMenuList className="flex items-center justify-around px-4 py-2 space-x-0">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              
              return (
                <NavigationMenuItem key={item.href} className="flex-1">
                  <NavigationMenuLink
                    asChild
                    className={cn(
                      navigationMenuTriggerStyle(),
                      'gap-2 h-8 w-full bg-transparent text-nav-foreground hover:bg-nav-foreground/10',
                      isActive && 'bg-nav-foreground/20 text-nav-foreground'
                    )}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Link href={item.href}>
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      {item.label}
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              );
            })}
          </NavigationMenuList>
        </NavigationMenu>
      </div>
    </nav>
  );
}
