'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { listChats, deleteChat } from '@/../utils/chatStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { MessageSquare, Clock, Trash2 } from 'lucide-react';

interface ChatSession {
  id: string;
  name?: string;
  createdAt?: string;
  firstMessage?: string;
}

export default function ChatsPage() {
  const router = useRouter();
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadChats();
  }, []);

  const loadChats = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const chatSessions = await listChats();
      // Sort by createdAt descending (newest first)
      const sortedChats = chatSessions.sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      setChats(sortedChats);
    } catch (err) {
      console.error('Error loading chats:', err);
      setError(err instanceof Error ? err.message : 'Failed to load chats');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown date';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const handleChatClick = (chatId: string) => {
    router.push(`/chat?id=${chatId}`);
  };

  const handleDelete = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation(); // Prevent card click navigation
    
    if (!confirm('Are you sure you want to delete this chat?')) {
      return;
    }

    try {
      await deleteChat(chatId);
      // Remove the chat from local state
      setChats(prevChats => prevChats.filter(chat => chat.id !== chatId));
    } catch (err) {
      console.error('Error deleting chat:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete chat');
    }
  };

  if (isLoading) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">Chat History</h1>
            <div className="flex items-center justify-center py-12">
              <div className="text-muted-foreground">Loading chats...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">Chat History</h1>
            <Card className="border-destructive">
              <CardContent className="pt-6">
                <p className="text-destructive">Error: {error}</p>
                <Button onClick={loadChats} className="mt-4">
                  Try Again
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold">Chat History</h1>
            <Button onClick={loadChats} variant="outline" size="sm">
              Refresh
            </Button>
          </div>

          {chats.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No chats yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Start a new chat to begin a conversation
                  </p>
                  <Button onClick={() => router.push('/chat')}>
                    Start New Chat
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {chats.map((chat) => (
                <Card
                  key={chat.id}
                  className="hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => handleChatClick(chat.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <MessageSquare className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          {chat.firstMessage && (
                            <div className="text-sm mb-2 line-clamp-2">
                              {chat.firstMessage}
                            </div>
                          )}
                          <CardDescription className="flex flex-col gap-1">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDate(chat.createdAt)}
                            </div>
                            {chat.createdAt && (
                              <div className="text-xs">
                                {new Date(chat.createdAt).toLocaleString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </div>
                            )}
                          </CardDescription>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => handleDelete(e, chat.id)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0"
                        aria-label="Delete chat"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
