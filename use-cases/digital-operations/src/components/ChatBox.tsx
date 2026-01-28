'use client';

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import { Message, MessageContent } from '@/components/ai-elements/message';
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputHeader,
  type PromptInputMessage,
  PromptInputModelSelect,
  PromptInputModelSelectContent,
  PromptInputModelSelectItem,
  PromptInputModelSelectTrigger,
  PromptInputModelSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
} from '@/components/ai-elements/prompt-input';
import { Action, Actions } from '@/components/ai-elements/actions';
import { Suggestion } from '@/components/ai-elements/suggestion';
import { Fragment, useState, useEffect, useRef, useMemo } from 'react';
import { useChat } from '@ai-sdk/react';
import type { ToolUIPart } from 'ai';
import { Response } from '@/components/ai-elements/response';
import { preprocessContent } from '@/lib/htmlPreprocessing';
import { AgentCoreChatTransport } from '@/lib/agentCoreTransport';
import { CopyIcon, RefreshCcwIcon } from 'lucide-react';
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from '@/components/ai-elements/sources';
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from '@/components/ai-elements/reasoning';
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from '@/components/ai-elements/tool';
import { Loader } from '@/components/ai-elements/loader';

import { saveChat, loadChat } from '@/../utils/chatStore';
import { Zap } from 'lucide-react';

const models: { name: string, id: string }[] = [
  {
    name: 'Claude Sonnet 4.5',
    id: 'us.anthropic.claude-sonnet-4-5-20250929-v1:0'
  },
  {
    name: 'Claude Haiku 3.5',
    id: 'us.anthropic.claude-3-5-haiku-20241022-v1:0'
  },
  {
    name: 'Nova Premier',
    id: 'us.amazon.nova-premier-v1:0'
  },
  {
    name: 'Claude Haiku 4.5',
    id: 'us.anthropic.claude-haiku-4-5-20251001-v1:0'
  },
  {
    name: 'Lamma3 70B Instruct',
    id: 'meta.llama3-70b-instruct-v1:0',
  },
];

interface ChatBoxProps {
  chatSessionId: string;
}

export const ChatBox = ({ chatSessionId }: ChatBoxProps) => {
  const [input, setInput] = useState('');
  const [model, setModel] = useState<string>(models[0].id);
  const savedMessages = useRef<typeof messages>([]);

  const { messages, setMessages, sendMessage, status, error, regenerate } = useChat({
    transport: new AgentCoreChatTransport(),
    onFinish: async ({ messages }) => {
      console.log('onFinish called.')
      if (chatSessionId) {
        const newMessages = messages.filter(
          msg => !savedMessages.current.some(savedMsg => savedMsg.id === msg.id)
        );
        try {
          await saveChat({
            chatSessionId,
            messages: newMessages
          });
          savedMessages.current = messages;
          console.log('Completed the saveChat call')
        } catch (error) {
          console.error('Error saving message:', error);
        }
      }
      else console.log('No Chat Session Id')
    },
  });

  const defaultSuggestions = [
    'Show me a map of the largest ports in the US, and plot their throughput over the past 5 years.',
    'Make a report on expected future electricty demand in the USA.',
  ];

  const suggestions = useMemo(() => {
    const latestAssistantMessage = messages.filter(m => m.role === 'assistant').at(-1);
    const suggestionsToolCall = latestAssistantMessage?.parts.find(
      (part) => (part.type === 'tool-generate_suggestions')
    );

    const extractedSuggestions = suggestionsToolCall
      ? (suggestionsToolCall as { input?: { suggestions?: string[] } }).input?.suggestions
      : undefined;

    return extractedSuggestions || defaultSuggestions;
  }, [messages, defaultSuggestions]);

  // Load messages on mount
  useEffect(() => {
    if (chatSessionId) {
      loadChat(chatSessionId)
        .then((loadedMessages) => {
          setMessages(loadedMessages);
          savedMessages.current = loadedMessages
        })
        .catch((error) => {
          console.error('Error loading messages:', error);
        });
    }
  }, [chatSessionId, setMessages]);

  const handleSubmit = (message: PromptInputMessage) => {
    const hasText = Boolean(message.text);
    const hasAttachments = Boolean(message.files?.length);

    if (!(hasText || hasAttachments)) {
      return;
    }

    sendMessage(
      {
        text: message.text || 'Sent with attachments',
        files: message.files,
        metadata: {
          createdAt: new Date().toISOString()
        }
      },
      {
        body: {
          modelId: model,
          chatSessionId
        },
      },
    );
    setInput('');
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
  };

  return (
    <div className="w-full p-6 relative h-full">
      <div className="flex flex-col h-full max-w-6xl mx-auto">
        <Conversation className="h-full">
          <ConversationContent>
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full space-y-4">
                <Zap className="h-16 w-16 text-gray-300" />
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-semibold text-gray-700">
                    Ready to Get Started
                  </h3>
                  <p className="text-gray-500 max-w-md">
                    Ask questions about your operations, analyze production data, or manage work orders.
                    Click below to load sample data for the demonstration.
                  </p>
                </div>
                {/* <div className="flex gap-3 mt-4">
                  <Button
                    onClick={handleDemoStart}
                    disabled={isStartingDemo || isResettingDemo}
                    size="lg"
                  >
                    {isStartingDemo ? (
                      <>
                        <RefreshCcwIcon className="mr-2 h-4 w-4 animate-spin" />
                        Loading Demo Data...
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="mr-2 h-4 w-4" />
                        Load Demo Data
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleDemoReset}
                    disabled={isStartingDemo || isResettingDemo}
                    variant="outline"
                    size="lg"
                  >
                    {isResettingDemo ? (
                      <>
                        <RefreshCcwIcon className="mr-2 h-4 w-4 animate-spin" />
                        Clearing...
                      </>
                    ) : (
                      <>
                        <RefreshCcwIcon className="mr-2 h-4 w-4" />
                        Clear Demo Data
                      </>
                    )}
                  </Button>
                </div> */}
              </div>
            )}
            {messages.map((message) => (
              <div key={message.id}>
                {/* <p>{(message.metadata as any)?.createdAt || "No date"}</p> */}
                {message.role === 'assistant' && message.parts.filter((part) => part.type === 'source-url').length > 0 && (
                  <Sources>
                    <SourcesTrigger
                      count={
                        message.parts.filter(
                          (part) => part.type === 'source-url',
                        ).length
                      }
                    />
                    {message.parts.filter((part) => part.type === 'source-url').map((part, i) => (
                      <SourcesContent key={`${message.id}-${i}`}>
                        <Source
                          key={`${message.id}-${i}`}
                          href={part.url}
                          title={part.url}
                        />
                      </SourcesContent>
                    ))}
                  </Sources>
                )}
                {message.parts.map((part, i) => {
                  switch (part.type) {
                    case 'text':
                      return (
                        <Fragment key={`${message.id}-${i}`}>
                          <Message from={message.role}>
                            <MessageContent>
                              <Response>
                                {preprocessContent(part.text, chatSessionId)}
                              </Response>
                            </MessageContent>
                          </Message>
                          {message.role === 'assistant' && (
                            <Actions className="mt-2">
                              {i === messages.length - 1 && (
                                <Action
                                  onClick={() => regenerate()}
                                  label="Retry"
                                >
                                  <RefreshCcwIcon className="size-3" />
                                </Action>
                              )}
                              <Action
                                onClick={() =>
                                  navigator.clipboard.writeText(part.text)
                                }
                                label="Copy"
                              >
                                <CopyIcon className="size-3" />
                              </Action>
                            </Actions>
                          )}
                        </Fragment>
                      );

                    case 'step-start':
                      return null
                    // return (
                    //   <div key={i} className="my-4">
                    //     <hr className="border-gray-300" />
                    //   </div>
                    // );

                    case 'reasoning':
                      return (
                        <Reasoning
                          key={`${message.id}-${i}`}
                          className="w-full"
                          isStreaming={status === 'streaming' && i === message.parts.length - 1 && message.id === messages.at(-1)?.id}
                        >
                          <ReasoningTrigger />
                          <ReasoningContent>{part.text}</ReasoningContent>
                        </Reasoning>
                      );

                    // case 'dynamic-tool':
                    //   const dynamicToolPart = part as DynamicToolUIPart;
                      
                    //   // Special handling for draft-work-order tool
                    //   if (dynamicToolPart.toolName === 'draft-work-order') {
                    //     const toolId = `${message.id}-${i}`;
                    //     const draftStatus = workOrderDraftStatuses[toolId] || 'pending';
                    //     const draftData = dynamicToolPart.input as any;

                    //     console.log('Rendering draft-work-order:', { toolId, draftStatus, draftData });

                    //     const handleApprove = async (data: any) => {
                    //       const workOrderNumber = `WO-${Date.now().toString().slice(-8)}`;
                          
                    //       setWorkOrderDraftStatuses(prev => ({
                    //         ...prev,
                    //         [toolId]: 'approved'
                    //       }));

                    //       await sendMessage(
                    //         {
                    //           text: `Please create the approved work order with number ${workOrderNumber}`,
                    //         },
                    //         {
                    //           body: {
                    //             modelId: model,
                    //             chatSessionId,
                    //             toolCall: {
                    //               name: 'create-work-order',
                    //               input: {
                    //                 workOrderNumber,
                    //                 ...data,
                    //                 status: 'CREATED'
                    //               }
                    //             }
                    //           }
                    //         }
                    //       );
                    //     };

                    //     const handleReject = async (reason?: string) => {
                    //       setWorkOrderDraftStatuses(prev => ({
                    //         ...prev,
                    //         [toolId]: 'rejected'
                    //       }));
                    //     };

                    //     return (
                    //       <WorkOrderDraft
                    //         key={toolId}
                    //         data={draftData}
                    //         onApprove={handleApprove}
                    //         onReject={handleReject}
                    //         status={draftStatus}
                    //       />
                    //     );
                    //   }
                      
                    //   return (
                    //     <Tool key={`${message.id}-${i}`}>
                    //       <ToolHeader
                    //         type={`tool-${dynamicToolPart.toolName}`}
                    //         state={dynamicToolPart.state}
                    //       />
                    //       <ToolContent>
                    //         <ToolInput input={dynamicToolPart.input} />
                    //         {(dynamicToolPart.state === 'output-available' || dynamicToolPart.state === 'output-error') && (
                    //           <ToolOutput
                    //             output={dynamicToolPart.output}
                    //             errorText={dynamicToolPart.errorText}
                    //           />
                    //         )}
                    //       </ToolContent>
                    //     </Tool>
                    //   );
                    default:
                      // Handle tool invocations
                      if (part.type.startsWith('tool-')) {
                        const toolPart = part as ToolUIPart;

                        // Special handling for draft-work-order tool
                        if (toolPart.type === 'tool-draft-work-order') {
                          // const toolId = `${message.id}-${i}`;
                          // Check if approval status is stored in the part itself (persisted)
                          // const persistedStatus = (toolPart as ToolUIPart & { approvalStatus?: 'pending' | 'approved' | 'rejected' }).approvalStatus;
                          // const draftStatus = persistedStatus || workOrderDraftStatuses[toolId] || 'pending';
                          // const draftData = toolPart.input// as DraftWorkOrderInput;

                        }

                        // Hide the suggestions tool from UI
                        if (toolPart.type === 'tool-generate_suggestions') {
                          return null;
                        }


                        return (
                          <Tool key={`${message.id}-${i}`}>
                            <ToolHeader
                              type={toolPart.type}
                              state={toolPart.state}
                            />
                            <ToolContent>
                              <ToolInput input={toolPart.input} />
                              {(toolPart.state === 'output-available' || toolPart.state === 'output-error') && (
                                <ToolOutput
                                  output={toolPart.output}
                                  errorText={toolPart.errorText}
                                />
                              )}
                            </ToolContent>
                          </Tool>
                        );
                      }
                      return <div>Unhandled part <pre>{JSON.stringify(part, null, 2)}</pre></div>
                      return null;
                  }
                })}
              </div>
            ))}
            {status === 'submitted' && <Loader />}
            {/* Render suggestions if available */}
            {status === 'ready' && (suggestions) && (
              <div className="mb-4 flex flex-col gap-2">
                {suggestions.map((suggestion, i) => (
                  <Suggestion
                    key={i}
                    suggestion={suggestion}
                    onClick={handleSuggestionClick}
                    className="w-full justify-start"
                  />
                ))}
              </div>
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        {error && (
          <>
            <div>An error occurred.</div>
            <button type="button" onClick={() => regenerate()}>
              Retry
            </button>
            <p>{error.message}</p>
          </>
        )}



        <PromptInput onSubmit={handleSubmit} className="mt-4" globalDrop multiple>
          <PromptInputHeader>
            <PromptInputAttachments>
              {(attachment) => <PromptInputAttachment data={attachment} />}
            </PromptInputAttachments>
          </PromptInputHeader>
          <PromptInputBody>
            <PromptInputTextarea
              onChange={(e) => setInput(e.target.value)}
              value={input}
            />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputTools>
              <PromptInputActionMenu>
                <PromptInputActionMenuTrigger />
                <PromptInputActionMenuContent>
                  <PromptInputActionAddAttachments />
                </PromptInputActionMenuContent>
              </PromptInputActionMenu>
              {/* <PromptInputButton
                variant={webSearch ? 'default' : 'ghost'}
                onClick={() => setWebSearch(!webSearch)}
              >
                <GlobeIcon size={16} />
                <span>Search</span>
              </PromptInputButton> */}
              <PromptInputModelSelect
                onValueChange={(value) => {
                  setModel(value);
                }}
                value={model}
              >
                <PromptInputModelSelectTrigger>
                  <PromptInputModelSelectValue />
                </PromptInputModelSelectTrigger>
                <PromptInputModelSelectContent>
                  {models.map((model) => (
                    <PromptInputModelSelectItem key={model.id} value={model.id}>
                      {model.name}
                    </PromptInputModelSelectItem>
                  ))}
                </PromptInputModelSelectContent>
              </PromptInputModelSelect>
            </PromptInputTools>
            <PromptInputSubmit disabled={!input && !status} status={status} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
};
