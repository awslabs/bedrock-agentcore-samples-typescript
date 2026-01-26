'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Save, RefreshCw } from 'lucide-react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../../../amplify/data/resource';

const client = generateClient<Schema>();

// Types for GraphQL responses
interface SettingsItem {
  id: string;
  name: string;
  value: string;
}

interface ListSettingsResponse {
  data: {
    listSettings: {
      items: SettingsItem[];
    };
  };
}

interface GraphQLResult {
  data?: unknown;
  errors?: unknown[];
}

export default function SettingsPage() {
  const [systemPrompt, setSystemPrompt] = useState('');
  const [originalPrompt, setOriginalPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Load the current system prompt using raw GraphQL
  const loadSystemPrompt = async () => {
    setIsLoading(true);
    setMessage(null);
    
    try {
      const query = `
        query ListSettings($filter: ModelSettingsFilterInput) {
          listSettings(filter: $filter) {
            items {
              id
              name
              value
            }
          }
        }
      `;

      const result = await client.graphql({
        query: query,
        variables: {
          filter: {
            name: {
              eq: 'system_prompt'
            }
          }
        }
      }) as ListSettingsResponse;

      const settings = result?.data?.listSettings?.items;

      if (settings && settings.length > 0) {
        const prompt = settings[0].value || '';
        setSystemPrompt(prompt);
        setOriginalPrompt(prompt);
      } else {
        setMessage({ type: 'error', text: 'System prompt not found in database' });
      }
    } catch (error) {
      console.error('Error loading system prompt:', error);
      setMessage({ type: 'error', text: 'Failed to load system prompt' });
    } finally {
      setIsLoading(false);
    }
  };

  // Save the system prompt using raw GraphQL
  const saveSystemPrompt = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      // First, try to find existing setting
      const listQuery = `
        query ListSettings($filter: ModelSettingsFilterInput) {
          listSettings(filter: $filter) {
            items {
              id
              name
              value
            }
          }
        }
      `;

      const existingResult = await client.graphql({
        query: listQuery,
        variables: {
          filter: {
            name: {
              eq: 'system_prompt'
            }
          }
        }
      }) as ListSettingsResponse;

      const existingSettings = existingResult?.data?.listSettings?.items;

      if (existingSettings && existingSettings.length > 0) {
        // Update existing setting
        const updateMutation = `
          mutation UpdateSettings($input: UpdateSettingsInput!) {
            updateSettings(input: $input) {
              id
              name
              value
            }
          }
        `;

        await client.graphql({
          query: updateMutation,
          variables: {
            input: {
              id: existingSettings[0].id,
              value: systemPrompt
            }
          }
        }) as GraphQLResult;
      } else {
        // Create new setting
        const createMutation = `
          mutation CreateSettings($input: CreateSettingsInput!) {
            createSettings(input: $input) {
              id
              name
              value
            }
          }
        `;

        await client.graphql({
          query: createMutation,
          variables: {
            input: {
              name: 'system_prompt',
              value: systemPrompt
            }
          }
        }) as GraphQLResult;
      }

      setOriginalPrompt(systemPrompt);
      setHasChanges(false);
      setMessage({ type: 'success', text: 'System prompt saved successfully! Changes will take effect after agent restart.' });
    } catch (error) {
      console.error('Error saving system prompt:', error);
      setMessage({ type: 'error', text: 'Failed to save system prompt' });
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to original prompt
  const resetPrompt = () => {
    setSystemPrompt(originalPrompt);
    setHasChanges(false);
    setMessage(null);
  };

  // Handle textarea change
  const handlePromptChange = (value: string) => {
    setSystemPrompt(value);
    setHasChanges(value !== originalPrompt);
    setMessage(null);
  };

  // Load system prompt on component mount
  useEffect(() => {
    loadSystemPrompt();
  }, []);

  return (
    <div className="h-full overflow-auto">
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-2">
            Configure system settings and AI agent behavior
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              System Prompt Configuration
            </CardTitle>
            <CardDescription>
              Customize the AI agent&apos;s behavior by modifying the system prompt. 
              Changes will take effect after the agent is restarted.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {message && (
              <Alert className={message.type === 'error' ? 'border-red-500 bg-red-50' : 'border-green-500 bg-green-50'}>
                <AlertDescription className={message.type === 'error' ? 'text-red-700' : 'text-green-700'}>
                  {message.text}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <label htmlFor="system-prompt" className="text-sm font-medium">
                System Prompt
              </label>
              <Textarea
                id="system-prompt"
                value={systemPrompt}
                onChange={(e) => handlePromptChange(e.target.value)}
                placeholder="Enter the system prompt for the AI agent..."
                className="min-h-[400px] font-mono text-sm"
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                {systemPrompt.length} characters
              </p>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                onClick={saveSystemPrompt}
                disabled={!hasChanges || isSaving || isLoading}
                className="flex items-center gap-2"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Changes
              </Button>

              <Button
                variant="outline"
                onClick={resetPrompt}
                disabled={!hasChanges || isLoading}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Reset
              </Button>

              <Button
                variant="outline"
                onClick={loadSystemPrompt}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Reload
              </Button>
            </div>

            {hasChanges && (
              <Alert>
                <AlertDescription>
                  You have unsaved changes. Don&apos;t forget to save your modifications.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}