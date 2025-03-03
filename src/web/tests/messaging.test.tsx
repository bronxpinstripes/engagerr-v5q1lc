import React from 'react'; // react ^18.2.0
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'; // @testing-library/react ^14.0.0
import userEvent from '@testing-library/user-event'; // @testing-library/user-event ^14.0.0
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'; // vitest ^0.34.0
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'; // @tanstack/react-query ^5.0.0

import { MessagingInterface } from '../components/shared/MessagingInterface'; // src/web/components/shared/MessagingInterface.tsx
import ConversationList from '../components/shared/ConversationList'; // src/web/components/shared/ConversationList.tsx
import ChatWindow from '../components/shared/ChatWindow'; // src/web/components/shared/ChatWindow.tsx
import useMessages from '../hooks/useMessages'; // src/web/hooks/useMessages.ts
import useAuth from '../hooks/useAuth'; // src/web/hooks/useAuth.ts
import { Conversation, Message, MessageType, ParticipantType, MessageStatus } from '../types/message'; // src/web/types/message.ts

// Mock the useMessages hook
vi.mock('../hooks/useMessages');

// Mock the useAuth hook
vi.mock('../hooks/useAuth');

/**
 * Helper function to render components with required providers
 * @param ui JSX.Element
 * @returns {object} Rendered component with testing utilities
 */
const renderWithProviders = (ui: JSX.Element) => {
  // Create a new QueryClient for React Query with default test options
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
      },
    },
  });

  // Mock the useAuth hook to return a default user
  (useAuth as any).mockReturnValue({
    user: { id: 'test-user', userType: 'creator' },
    isAuthenticated: true,
  });

  // Render the component wrapped in necessary providers (QueryClientProvider, Auth context)
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
};

/**
 * Helper function to create mock conversation data
 * @param overrides Partial<Conversation>
 * @returns {Conversation} A mock conversation object with specified overrides
 */
const createMockConversation = (overrides: Partial<Conversation> = {}): Conversation => {
  // Create a default conversation object with required properties
  const defaultConversation: Conversation = {
    id: 'test-conversation',
    participants: [{
      id: 'test-participant',
      userId: 'test-user',
      type: ParticipantType.CREATOR,
      name: 'Test User',
      avatarUrl: null,
      creator: null,
      brand: null,
      isOnline: true,
      lastActiveAt: new Date(),
    }],
    lastMessage: null,
    title: 'Test Conversation',
    partnershipId: null,
    partnership: null,
    unreadCount: 0,
    isArchived: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Merge with any provided overrides
  return { ...defaultConversation, ...overrides };
};

/**
 * Helper function to create mock message data
 * @param overrides Partial<Message>
 * @returns {Message} A mock message object with specified overrides
 */
const createMockMessage = (overrides: Partial<Message> = {}): Message => {
  // Create a default message object with required properties
  const defaultMessage: Message = {
    id: 'test-message',
    conversationId: 'test-conversation',
    senderId: 'test-user',
    senderType: ParticipantType.CREATOR,
    sender: null,
    content: 'Test Message',
    type: MessageType.TEXT,
    status: MessageStatus.SENT,
    attachments: [],
    proposalId: null,
    contractId: null,
    paymentId: null,
    metadata: null,
    isRead: true,
    readBy: [],
    readAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Merge with any provided overrides
  return { ...defaultMessage, ...overrides };
};

describe('MessagingInterface Component', () => {
  beforeEach(() => {
    // Reset mocks before each test
    (useMessages as any).mockReturnValue({
      conversations: [],
      filteredConversations: [],
      activeConversation: null,
      messages: [],
      isLoadingConversations: false,
      isLoadingMessages: false,
      isSending: false,
      sendMessage: vi.fn().mockResolvedValue({}),
      setActiveConversation: vi.fn(),
      filterConversations: vi.fn(),
      markAsRead: vi.fn(),
      initiateProposal: vi.fn().mockResolvedValue({}),
    });
  });

  it('renders the component with conversation list and empty chat window', () => {
    // Arrange
    renderWithProviders(<MessagingInterface />);

    // Assert
    expect(screen.getByTestId('conversation-list')).toBeInTheDocument();
    expect(screen.getByText('Select a conversation to view messages.')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search conversations...')).toBeInTheDocument();
  });

  it('applies initial filter when provided', () => {
    // Arrange
    const initialFilter = { participantType: ParticipantType.BRAND };
    renderWithProviders(<MessagingInterface initialFilter={initialFilter} />);

    // Assert
    expect(useMessages).toHaveBeenCalled();
    expect(useMessages().filterConversations).toHaveBeenCalledWith(initialFilter);
  });

  it('selects a conversation and displays messages', async () => {
    // Arrange
    const mockConversation = createMockConversation();
    const mockMessage = createMockMessage();
    (useMessages as any).mockReturnValue({
      conversations: [mockConversation],
      filteredConversations: [mockConversation],
      activeConversation: mockConversation,
      messages: [mockMessage],
      isLoadingConversations: false,
      isLoadingMessages: false,
      isSending: false,
      sendMessage: vi.fn().mockResolvedValue({}),
      setActiveConversation: vi.fn(),
      filterConversations: vi.fn(),
      markAsRead: vi.fn(),
      initiateProposal: vi.fn().mockResolvedValue({}),
    });
    renderWithProviders(<MessagingInterface />);

    // Act
    await act(async () => {
      fireEvent.click(screen.getByText(mockConversation.title as string));
    });

    // Assert
    expect(useMessages().setActiveConversation).toHaveBeenCalledWith(mockConversation.id);
    expect(useMessages().markAsRead).toHaveBeenCalledWith(mockConversation.id);
    expect(screen.getByText(mockConversation.title as string)).toBeInTheDocument();
    expect(screen.getByText(mockMessage.content)).toBeInTheDocument();
  });

  it('sends a message when submit button is clicked', async () => {
    // Arrange
    const mockConversation = createMockConversation();
    (useMessages as any).mockReturnValue({
      conversations: [mockConversation],
      filteredConversations: [mockConversation],
      activeConversation: mockConversation,
      messages: [],
      isLoadingConversations: false,
      isLoadingMessages: false,
      isSending: false,
      sendMessage: vi.fn().mockResolvedValue({}),
      setActiveConversation: vi.fn(),
      filterConversations: vi.fn(),
      markAsRead: vi.fn(),
      initiateProposal: vi.fn().mockResolvedValue({}),
    });
    renderWithProviders(<MessagingInterface />);

    // Act
    const messageText = 'Hello, this is a test message';
    fireEvent.change(screen.getByPlaceholderText('Type your message...'), {
      target: { value: messageText },
    });
    fireEvent.click(screen.getByText('Send'));

    // Assert
    expect(useMessages().sendMessage).toHaveBeenCalledWith(mockConversation.id, messageText);
    expect(screen.getByPlaceholderText('Type your message...')).toHaveValue('');
  });

  it('sends a message with file attachments', async () => {
    // Arrange
    const mockConversation = createMockConversation();
    (useMessages as any).mockReturnValue({
      conversations: [mockConversation],
      filteredConversations: [mockConversation],
      activeConversation: mockConversation,
      messages: [],
      isLoadingConversations: false,
      isLoadingMessages: false,
      isSending: false,
      sendMessage: vi.fn().mockResolvedValue({}),
      setActiveConversation: vi.fn(),
      filterConversations: vi.fn(),
      markAsRead: vi.fn(),
      initiateProposal: vi.fn().mockResolvedValue({}),
    });
    renderWithProviders(<MessagingInterface />);

    // Act
    const file = new File(['test'], 'test-file.txt', { type: 'text/plain' });
    const input = screen.getByLabelText('Upload');
    await userEvent.upload(input, file);
    fireEvent.click(screen.getByText('Send'));

    // Assert
    expect(useMessages().sendMessage).toHaveBeenCalledWith(mockConversation.id, '', [file]);
  });

  it('renders correctly on mobile viewport', async () => {
    // Arrange
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 600 });
    window.dispatchEvent(new Event('resize'));
    const mockConversation = createMockConversation();
    (useMessages as any).mockReturnValue({
      conversations: [mockConversation],
      filteredConversations: [mockConversation],
      activeConversation: mockConversation,
      messages: [],
      isLoadingConversations: false,
      isLoadingMessages: false,
      isSending: false,
      sendMessage: vi.fn().mockResolvedValue({}),
      setActiveConversation: vi.fn(),
      filterConversations: vi.fn(),
      markAsRead: vi.fn(),
      initiateProposal: vi.fn().mockResolvedValue({}),
    });
    renderWithProviders(<MessagingInterface />);

    // Act
    fireEvent.click(screen.getByText(mockConversation.title as string));
    fireEvent.click(screen.getByText('Back to Conversations'));

    // Assert
    expect(screen.getByText('Select a conversation to view messages.')).toBeInTheDocument();
  });

  it('creates a proposal when requested', async () => {
    // Arrange
    const mockConversation = createMockConversation();
    (useMessages as any).mockReturnValue({
      conversations: [mockConversation],
      filteredConversations: [mockConversation],
      activeConversation: mockConversation,
      messages: [],
      isLoadingConversations: false,
      isLoadingMessages: false,
      isSending: false,
      sendMessage: vi.fn().mockResolvedValue({}),
      setActiveConversation: vi.fn(),
      filterConversations: vi.fn(),
      markAsRead: vi.fn(),
      initiateProposal: vi.fn().mockResolvedValue({}),
    });
    renderWithProviders(<MessagingInterface />);

    // Act
    fireEvent.click(screen.getByText('Create Proposal'));

    // Assert
    expect(useMessages().initiateProposal).toHaveBeenCalledWith(mockConversation.id, {});
  });
});

describe('ConversationList Component', () => {
  it('renders list of conversations', () => {
    // Arrange
    const mockConversations = [
      createMockConversation({ title: 'Conversation 1' }),
      createMockConversation({ title: 'Conversation 2' }),
    ];
    (useMessages as any).mockReturnValue({
      conversations: mockConversations,
      filteredConversations: mockConversations,
      isLoadingConversations: false,
    });
    renderWithProviders(<ConversationList onSelectConversation={vi.fn()} />);

    // Assert
    expect(screen.getByText('Conversation 1')).toBeInTheDocument();
    expect(screen.getByText('Conversation 2')).toBeInTheDocument();
  });

  it('indicates unread messages correctly', () => {
    // Arrange
    const mockConversations = [
      createMockConversation({ title: 'Conversation 1', unreadCount: 2 }),
      createMockConversation({ title: 'Conversation 2', unreadCount: 0 }),
    ];
    (useMessages as any).mockReturnValue({
      conversations: mockConversations,
      filteredConversations: mockConversations,
      isLoadingConversations: false,
    });
    renderWithProviders(<ConversationList onSelectConversation={vi.fn()} />);

    // Assert
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('filters conversations based on search input', () => {
    // Arrange
    const mockConversations = [
      createMockConversation({ title: 'Conversation 1' }),
      createMockConversation({ title: 'Test Conversation' }),
    ];
    (useMessages as any).mockReturnValue({
      conversations: mockConversations,
      filteredConversations: [mockConversations[1]],
      isLoadingConversations: false,
    });
    renderWithProviders(<ConversationList onSelectConversation={vi.fn()} />);

    // Act
    fireEvent.change(screen.getByPlaceholderText('Search conversations...'), {
      target: { value: 'Test' },
    });

    // Assert
    expect(screen.getByText('Test Conversation')).toBeInTheDocument();
    expect(screen.queryByText('Conversation 1')).not.toBeInTheDocument();
  });

  it('handles empty state when no conversations exist', () => {
    // Arrange
    (useMessages as any).mockReturnValue({
      conversations: [],
      filteredConversations: [],
      isLoadingConversations: false,
    });
    renderWithProviders(<ConversationList onSelectConversation={vi.fn()} />);

    // Assert
    expect(screen.getByText('No conversations yet. Start a new conversation!')).toBeInTheDocument();
  });

  it('shows loading state while fetching conversations', () => {
    // Arrange
    (useMessages as any).mockReturnValue({
      conversations: [],
      filteredConversations: [],
      isLoadingConversations: true,
    });
    renderWithProviders(<ConversationList onSelectConversation={vi.fn()} />);

    // Assert
    expect(screen.getByText('No conversations yet. Start a new conversation!')).toBeInTheDocument();
  });
});

describe('ChatWindow Component', () => {
  it('renders empty state when no conversation is selected', () => {
    // Arrange
    renderWithProviders(<ChatWindow conversation={null} messages={[]} isLoading={false} isSending={false} onSendMessage={vi.fn()} />);

    // Assert
    expect(screen.getByText('Select a conversation to view messages.')).toBeInTheDocument();
  });

  it('renders conversation header with participant info', () => {
    // Arrange
    const mockConversation = createMockConversation();
    renderWithProviders(<ChatWindow conversation={mockConversation} messages={[]} isLoading={false} isSending={false} onSendMessage={vi.fn()} />);

    // Assert
    expect(screen.getByText(mockConversation.title as string)).toBeInTheDocument();
  });

  it('displays messages with correct sender alignment', () => {
    // Arrange
    const mockConversation = createMockConversation();
    const mockMessages = [
      createMockMessage({ senderId: 'test-user', content: 'My message' }),
      createMockMessage({ senderId: 'other-user', content: 'Their message' }),
    ];
    (useAuth as any).mockReturnValue({
      user: { id: 'test-user', userType: 'creator' },
      isAuthenticated: true,
    });
    renderWithProviders(<ChatWindow conversation={mockConversation} messages={mockMessages} isLoading={false} isSending={false} onSendMessage={vi.fn()} />);

    // Assert
    const messageBubbles = screen.getAllByText(/message/);
    expect(messageBubbles).toHaveLength(2);
  });

  it('renders different message types correctly', () => {
    // Arrange
    const mockConversation = createMockConversation();
    const mockMessages = [
      createMockMessage({ type: MessageType.TEXT, content: 'Text message' }),
      createMockMessage({ type: MessageType.SYSTEM, content: 'System message' }),
    ];
    renderWithProviders(<ChatWindow conversation={mockConversation} messages={mockMessages} isLoading={false} isSending={false} onSendMessage={vi.fn()} />);

    // Assert
    expect(screen.getByText('Text message')).toBeInTheDocument();
    expect(screen.getByText('System message')).toBeInTheDocument();
  });

  it('allows sending messages with keyboard shortcut', async () => {
    // Arrange
    const mockConversation = createMockConversation();
    (useMessages as any).mockReturnValue({
      conversations: [mockConversation],
      filteredConversations: [mockConversation],
      activeConversation: mockConversation,
      messages: [],
      isLoadingConversations: false,
      isLoadingMessages: false,
      isSending: false,
      sendMessage: vi.fn().mockResolvedValue({}),
      setActiveConversation: vi.fn(),
      filterConversations: vi.fn(),
      markAsRead: vi.fn(),
      initiateProposal: vi.fn().mockResolvedValue({}),
    });
    renderWithProviders(<MessagingInterface />);

    // Act
    const messageText = 'Hello, this is a test message';
    const input = screen.getByPlaceholderText('Type your message...');
    fireEvent.change(input, {
      target: { value: messageText },
    });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', charCode: 13, shiftKey: false });

    // Assert
    expect(useMessages().sendMessage).toHaveBeenCalledWith(mockConversation.id, messageText);
    expect(input).toHaveValue('');
  });

  it('handles file attachment selection and preview', async () => {
    // Arrange
    const mockConversation = createMockConversation();
    (useMessages as any).mockReturnValue({
      conversations: [mockConversation],
      filteredConversations: [mockConversation],
      activeConversation: mockConversation,
      messages: [],
      isLoadingConversations: false,
      isLoadingMessages: false,
      isSending: false,
      sendMessage: vi.fn().mockResolvedValue({}),
      setActiveConversation: vi.fn(),
      filterConversations: vi.fn(),
      markAsRead: vi.fn(),
      initiateProposal: vi.fn().mockResolvedValue({}),
    });
    renderWithProviders(<MessagingInterface />);

    // Act
    const file = new File(['test'], 'test-file.txt', { type: 'text/plain' });
    const input = screen.getByLabelText('Upload');
    await userEvent.upload(input, file);

    // Assert
    expect(screen.getByText('test-file.txt')).toBeInTheDocument();
  });

  it('scrolls to bottom when new messages arrive', async () => {
    // Arrange
    const mockConversation = createMockConversation();
    const mockMessages = [
      createMockMessage({ content: 'Message 1' }),
      createMockMessage({ content: 'Message 2' }),
    ];
    (useMessages as any).mockReturnValue({
      conversations: [mockConversation],
      filteredConversations: [mockConversation],
      activeConversation: mockConversation,
      messages: mockMessages,
      isLoadingConversations: false,
      isLoadingMessages: false,
      isSending: false,
      sendMessage: vi.fn().mockResolvedValue({}),
      setActiveConversation: vi.fn(),
      filterConversations: vi.fn(),
      markAsRead: vi.fn(),
      initiateProposal: vi.fn().mockResolvedValue({}),
    });
    renderWithProviders(<MessagingInterface />);

    // Act
    const newMessage = createMockMessage({ content: 'New Message' });
    (useMessages as any).mockReturnValue({
      conversations: [mockConversation],
      filteredConversations: [mockConversation],
      activeConversation: mockConversation,
      messages: [...mockMessages, newMessage],
      isLoadingConversations: false,
      isLoadingMessages: false,
      isSending: false,
      sendMessage: vi.fn().mockResolvedValue({}),
      setActiveConversation: vi.fn(),
      filterConversations: vi.fn(),
      markAsRead: vi.fn(),
      initiateProposal: vi.fn().mockResolvedValue({}),
    });
    renderWithProviders(<MessagingInterface />);

    // Assert
    expect(screen.getByText('New Message')).toBeInTheDocument();
  });
});