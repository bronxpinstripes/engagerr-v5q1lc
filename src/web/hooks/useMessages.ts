import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import useAuth from './useAuth';
import useDebounce from './useDebounce';
import useToast from './useToast';
import { 
  Conversation, 
  Message, 
  ConversationFilter, 
  MessageAttachment, 
  ParticipantStatus 
} from '../types/message';
import api from '../lib/api';

/**
 * Interface defining the return value from the useMessages hook
 */
interface UseMessagesReturn {
  // Conversations data
  conversations: Conversation[];
  filteredConversations: Conversation[];
  activeConversation: Conversation | null;
  unreadCount: number;
  
  // Messages data
  messages: Message[];
  
  // Loading states
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  isSending: boolean;
  error: Error | null;
  
  // Conversation functions
  setActiveConversation: (conversationId: string | null) => void;
  filterConversations: (filters: ConversationFilter) => void;
  createNewConversation: (creatorId: string, brandId: string, initialMessage: string) => Promise<Conversation>;
  
  // Message functions
  sendMessage: (conversationId: string, content: string) => Promise<Message>;
  markAsRead: (conversationId: string, messageIds?: string[]) => Promise<void>;
  sendAttachment: (conversationId: string, file: File, caption?: string) => Promise<Message>;
  initiateProposal: (conversationId: string, proposalDetails: any) => Promise<void>;
  
  // Utility functions
  searchMessages: (query: string) => void;
  getUserStatus: (userId: string) => ParticipantStatus;
}

/**
 * Custom hook for managing messaging functionality between creators and brands,
 * including conversation fetching, message sending, and real-time updates.
 * 
 * @returns Object containing conversations, messages, and messaging management functions
 */
const useMessages = (): UseMessagesReturn => {
  // Initialize state
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [filters, setFilters] = useState<ConversationFilter>({
    participantId: null,
    participantType: null,
    partnershipId: null,
    hasUnread: null,
    isArchived: false,
    searchTerm: null
  });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  
  // Get authentication context and toast
  const { user, isAuthenticated } = useAuth();
  const toast = useToast();
  
  // Initialize query client for cache management
  const queryClient = useQueryClient();
  
  // Fetch all conversations
  const { 
    data: conversations = [], 
    isLoading: isLoadingConversations,
    error: conversationsError 
  } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => api.get<Conversation[]>('/api/messages/conversations'),
    enabled: isAuthenticated && !!user,
    staleTime: 1000 * 60, // 1 minute
    refetchInterval: 30000, // 30 seconds
  });
  
  // Apply filters to conversations
  const filteredConversations = useMemo(() => {
    if (!conversations.length) return [];
    
    return conversations.filter(conversation => {
      // Filter by participant ID
      if (filters.participantId && !conversation.participants.some(p => p.id === filters.participantId)) {
        return false;
      }
      
      // Filter by participant type
      if (filters.participantType && !conversation.participants.some(p => p.type === filters.participantType)) {
        return false;
      }
      
      // Filter by partnership ID
      if (filters.partnershipId && conversation.partnershipId !== filters.partnershipId) {
        return false;
      }
      
      // Filter by unread messages
      if (filters.hasUnread === true && conversation.unreadCount === 0) {
        return false;
      }
      
      // Filter by archived status
      if (filters.isArchived === false && conversation.isArchived) {
        return false;
      }
      
      // Filter by search term
      if (filters.searchTerm) {
        const searchTermLower = filters.searchTerm.toLowerCase();
        const titleMatch = conversation.title?.toLowerCase().includes(searchTermLower);
        const participantMatch = conversation.participants.some(p => 
          p.name.toLowerCase().includes(searchTermLower)
        );
        
        if (!titleMatch && !participantMatch) {
          return false;
        }
      }
      
      return true;
    });
  }, [conversations, filters]);
  
  // Calculate total unread message count
  const unreadCount = useMemo(() => {
    return conversations.reduce((total, conversation) => total + conversation.unreadCount, 0);
  }, [conversations]);
  
  // Find active conversation
  const activeConversation = useMemo(() => {
    if (!activeConversationId || !conversations.length) return null;
    return conversations.find(c => c.id === activeConversationId) || null;
  }, [activeConversationId, conversations]);
  
  // Set active conversation
  const setActiveConversation = useCallback((conversationId: string | null) => {
    setActiveConversationId(conversationId);
    
    // Clear search when changing conversations
    setSearchQuery('');
    
    // Mark messages as read when opening a conversation
    if (conversationId) {
      // We'll mark as read after a short delay to ensure the user had time to see the messages
      setTimeout(() => {
        const conversation = conversations.find(c => c.id === conversationId);
        if (conversation && conversation.unreadCount > 0) {
          markAsRead(conversationId);
        }
      }, 1000);
    }
  }, [conversations]);
  
  // Filter conversations
  const filterConversations = useCallback((newFilters: ConversationFilter) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);
  
  // Fetch messages for active conversation
  const {
    data: messages = [],
    isLoading: isLoadingMessages,
    error: messagesError
  } = useQuery({
    queryKey: ['messages', activeConversationId, debouncedSearchQuery],
    queryFn: () => api.get<Message[]>(`/api/messages/conversations/${activeConversationId}/messages`, {
      search: debouncedSearchQuery || undefined
    }),
    enabled: !!activeConversationId,
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 5000, // 5 seconds for real-time updates
    keepPreviousData: true
  });
  
  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: (data: { conversationId: string; content: string }) => 
      api.post<Message>(`/api/messages/conversations/${data.conversationId}/messages`, {
        content: data.content,
        type: 'text'
      }),
    onMutate: async (data) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['messages', data.conversationId] });
      
      // Snapshot the previous messages
      const previousMessages = queryClient.getQueryData<Message[]>(['messages', data.conversationId]);
      
      // Create optimistic message
      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        conversationId: data.conversationId,
        senderId: user?.id || '',
        senderType: user?.userType === 'creator' ? 'creator' : 'brand',
        sender: user,
        content: data.content,
        type: 'text',
        status: 'sending',
        attachments: [],
        proposalId: null,
        contractId: null,
        paymentId: null,
        metadata: null,
        isRead: true,
        readBy: [user?.id || ''],
        readAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Optimistically update messages
      queryClient.setQueryData<Message[]>(['messages', data.conversationId], 
        old => old ? [...old, optimisticMessage] : [optimisticMessage]
      );
      
      // Find and update the conversation's last message
      queryClient.setQueryData<Conversation[]>(['conversations'], old => {
        if (!old) return [];
        
        return old.map(conversation => {
          if (conversation.id === data.conversationId) {
            return {
              ...conversation,
              lastMessage: optimisticMessage
            };
          }
          return conversation;
        });
      });
      
      return { previousMessages };
    },
    onSuccess: (newMessage, variables) => {
      // Update query data with actual message from server
      queryClient.setQueryData<Message[]>(['messages', variables.conversationId], 
        old => old ? old.map(msg => 
          msg.id.startsWith('temp-') ? newMessage : msg
        ) : [newMessage]
      );
      
      // Update conversation's last message
      queryClient.setQueryData<Conversation[]>(['conversations'], old => {
        if (!old) return [];
        
        return old.map(conversation => {
          if (conversation.id === variables.conversationId) {
            return {
              ...conversation,
              lastMessage: newMessage,
              updatedAt: new Date()
            };
          }
          return conversation;
        });
      });
    },
    onError: (error, variables, context) => {
      // Revert to previous messages on error
      if (context?.previousMessages) {
        queryClient.setQueryData<Message[]>(['messages', variables.conversationId], context.previousMessages);
      }
      
      // Show error toast
      toast.error('Failed to send message', error instanceof Error ? error.message : 'An unexpected error occurred');
    }
  });
  
  // Send a message
  const sendMessage = useCallback(async (conversationId: string, content: string): Promise<Message> => {
    if (!content.trim()) {
      throw new Error('Message cannot be empty');
    }
    
    try {
      return await sendMessageMutation.mutateAsync({ conversationId, content });
    } catch (error) {
      throw error;
    }
  }, [sendMessageMutation]);
  
  // Mark messages as read
  const markAsReadMutation = useMutation({
    mutationFn: (data: { conversationId: string, messageIds?: string[] }) => 
      api.put(`/api/messages/conversations/${data.conversationId}/read`, {
        messageIds: data.messageIds
      }),
    onSuccess: (_, variables) => {
      // Update unread count in the conversation
      queryClient.setQueryData<Conversation[]>(['conversations'], old => {
        if (!old) return [];
        
        return old.map(conversation => {
          if (conversation.id === variables.conversationId) {
            return {
              ...conversation,
              unreadCount: 0
            };
          }
          return conversation;
        });
      });
      
      // Update read status in messages
      queryClient.setQueryData<Message[]>(['messages', variables.conversationId], old => {
        if (!old) return [];
        
        return old.map(message => {
          // If specific messageIds were provided, only mark those as read
          if (variables.messageIds && !variables.messageIds.includes(message.id)) {
            return message;
          }
          
          // Skip messages that are already read
          if (message.isRead) {
            return message;
          }
          
          return {
            ...message,
            isRead: true,
            readBy: [...message.readBy, user?.id || ''],
            readAt: new Date()
          };
        });
      });
    }
  });
  
  // Mark messages as read
  const markAsRead = useCallback(async (conversationId: string, messageIds?: string[]): Promise<void> => {
    if (!user?.id) return;
    
    try {
      await markAsReadMutation.mutateAsync({ conversationId, messageIds });
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
    }
  }, [markAsReadMutation, user?.id]);
  
  // Create new conversation
  const createConversationMutation = useMutation({
    mutationFn: (data: { creatorId: string; brandId: string; initialMessage: string }) => 
      api.post<Conversation>('/api/messages/conversations', {
        creatorId: data.creatorId,
        brandId: data.brandId,
        initialMessage: data.initialMessage
      }),
    onSuccess: (newConversation) => {
      // Add new conversation to conversations list
      queryClient.setQueryData<Conversation[]>(['conversations'], old => {
        if (!old) return [newConversation];
        return [newConversation, ...old];
      });
      
      // Set it as active
      setActiveConversationId(newConversation.id);
      
      // Show success toast
      toast.success('Conversation started', 'Your message has been sent');
    }
  });
  
  // Create new conversation
  const createNewConversation = useCallback(async (
    creatorId: string, 
    brandId: string, 
    initialMessage: string
  ): Promise<Conversation> => {
    if (!initialMessage.trim()) {
      throw new Error('Initial message cannot be empty');
    }
    
    try {
      return await createConversationMutation.mutateAsync({ 
        creatorId, 
        brandId, 
        initialMessage 
      });
    } catch (error) {
      toast.error('Failed to start conversation', error instanceof Error ? error.message : 'An unexpected error occurred');
      throw error;
    }
  }, [createConversationMutation, toast]);
  
  // Send attachment
  const sendAttachmentMutation = useMutation({
    mutationFn: async (data: { conversationId: string; file: File; caption?: string }) => {
      // Create form data
      const formData = new FormData();
      formData.append('file', data.file);
      
      if (data.caption) {
        formData.append('caption', data.caption);
      }
      
      // Upload the file
      return api.post<Message>(
        `/api/messages/conversations/${data.conversationId}/attachments`, 
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
    },
    onMutate: async (data) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['messages', data.conversationId] });
      
      // Snapshot the previous messages
      const previousMessages = queryClient.getQueryData<Message[]>(['messages', data.conversationId]);
      
      // Create optimistic attachment
      const optimisticAttachment: MessageAttachment = {
        id: `temp-attachment-${Date.now()}`,
        name: data.file.name,
        fileType: data.file.type,
        url: URL.createObjectURL(data.file),
        size: data.file.size,
        thumbnailUrl: null,
        createdAt: new Date()
      };
      
      // Create optimistic message
      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        conversationId: data.conversationId,
        senderId: user?.id || '',
        senderType: user?.userType === 'creator' ? 'creator' : 'brand',
        sender: user,
        content: data.caption || `Sent ${data.file.name}`,
        type: 'file',
        status: 'sending',
        attachments: [optimisticAttachment],
        proposalId: null,
        contractId: null,
        paymentId: null,
        metadata: null,
        isRead: true,
        readBy: [user?.id || ''],
        readAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Optimistically update messages
      queryClient.setQueryData<Message[]>(['messages', data.conversationId], 
        old => old ? [...old, optimisticMessage] : [optimisticMessage]
      );
      
      return { previousMessages };
    },
    onSuccess: (newMessage, variables) => {
      // Update query data with actual message from server
      queryClient.setQueryData<Message[]>(['messages', variables.conversationId], 
        old => old ? old.map(msg => 
          msg.id.startsWith('temp-') ? newMessage : msg
        ) : [newMessage]
      );
      
      // Update conversation's last message
      queryClient.setQueryData<Conversation[]>(['conversations'], old => {
        if (!old) return [];
        
        return old.map(conversation => {
          if (conversation.id === variables.conversationId) {
            return {
              ...conversation,
              lastMessage: newMessage,
              updatedAt: new Date()
            };
          }
          return conversation;
        });
      });
      
      // Clean up any blob URLs we created
      old => {
        if (!old) return;
        old.forEach(message => {
          if (message.id.startsWith('temp-')) {
            message.attachments.forEach(attachment => {
              if (attachment.url.startsWith('blob:')) {
                URL.revokeObjectURL(attachment.url);
              }
            });
          }
        });
      };
    },
    onError: (error, variables, context) => {
      // Revert to previous messages on error
      if (context?.previousMessages) {
        queryClient.setQueryData<Message[]>(['messages', variables.conversationId], context.previousMessages);
      }
      
      // Show error toast
      toast.error('Failed to send attachment', error instanceof Error ? error.message : 'An unexpected error occurred');
    }
  });
  
  // Send attachment
  const sendAttachment = useCallback(async (
    conversationId: string, 
    file: File, 
    caption?: string
  ): Promise<Message> => {
    try {
      return await sendAttachmentMutation.mutateAsync({ conversationId, file, caption });
    } catch (error) {
      throw error;
    }
  }, [sendAttachmentMutation]);
  
  // Initiate proposal from conversation
  const initiateProposalMutation = useMutation({
    mutationFn: (data: { conversationId: string; proposalDetails: any }) => 
      api.post(`/api/partnerships/proposals/from-conversation/${data.conversationId}`, data.proposalDetails),
    onSuccess: (result, variables) => {
      // Show success toast
      toast.success('Proposal created', 'Your proposal has been sent to the recipient');
      
      // Refresh messages to show the proposal message
      queryClient.invalidateQueries({ queryKey: ['messages', variables.conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    }
  });
  
  // Initiate proposal
  const initiateProposal = useCallback(async (
    conversationId: string, 
    proposalDetails: any
  ): Promise<void> => {
    try {
      await initiateProposalMutation.mutateAsync({ conversationId, proposalDetails });
    } catch (error) {
      toast.error('Failed to create proposal', error instanceof Error ? error.message : 'An unexpected error occurred');
      throw error;
    }
  }, [initiateProposalMutation, toast]);
  
  // Search messages
  const searchMessages = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);
  
  // Get user status
  const getUserStatus = useCallback((userId: string): ParticipantStatus => {
    // In a real implementation, this would query the user's online status
    // For now, we'll return a mocked status based on user ID
    if (!userId) return { isOnline: false, lastActive: null };
    
    // Mock status based on user ID last character
    const lastChar = userId.charAt(userId.length - 1);
    const lastCharCode = lastChar.charCodeAt(0);
    
    if (lastCharCode % 2 === 0) {
      return { isOnline: true, lastActive: new Date() };
    } else {
      // Last active sometime in the last 24 hours
      const hoursAgo = (lastCharCode % 24) + 1;
      const lastActive = new Date();
      lastActive.setHours(lastActive.getHours() - hoursAgo);
      
      return { isOnline: false, lastActive };
    }
  }, []);
  
  // Combine errors from different sources
  const error = useMemo(() => {
    if (conversationsError) return conversationsError instanceof Error 
      ? conversationsError 
      : new Error('Failed to load conversations');
    
    if (messagesError) return messagesError instanceof Error 
      ? messagesError 
      : new Error('Failed to load messages');
    
    return null;
  }, [conversationsError, messagesError]);
  
  return {
    // Conversations data
    conversations,
    filteredConversations,
    activeConversation,
    unreadCount,
    
    // Messages data
    messages,
    
    // Loading states
    isLoadingConversations,
    isLoadingMessages,
    isSending: sendMessageMutation.isPending || sendAttachmentMutation.isPending,
    error,
    
    // Conversation functions
    setActiveConversation,
    filterConversations,
    createNewConversation,
    
    // Message functions
    sendMessage,
    markAsRead,
    sendAttachment,
    initiateProposal,
    
    // Utility functions
    searchMessages,
    getUserStatus
  };
};

export default useMessages;