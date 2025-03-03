import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react'; // React v18.0+
import {
  Send,
  Paperclip,
  X,
  CheckCheck,
  DownloadCloud,
  PaperclipIcon,
  FileIcon,
} from 'lucide-react'; // lucide-react ^0.279.0
import Avatar from '../ui/Avatar'; // src/web/components/ui/Avatar.tsx
import Button from '../ui/Button'; // src/web/components/ui/Button.tsx
import Input from '../ui/Input'; // src/web/components/ui/Input.tsx
import Tooltip from '../ui/Tooltip'; // src/web/components/ui/Tooltip.tsx
import FileUpload from '../ui/FileUpload'; // src/web/components/ui/FileUpload.tsx
import Badge from '../ui/Badge'; // src/web/components/ui/Badge.tsx
import { useAuth } from '../../hooks/useAuth'; // src/web/hooks/useAuth.ts
import { cn } from '../../lib/utils'; // src/web/lib/utils.ts
import {
  formatRelativeTime,
  formatDate,
} from '../../lib/formatters'; // src/web/lib/formatters.ts
import {
  Conversation,
  Message,
  MessageType,
  MessageStatus,
  ParticipantType,
} from '../../types/message'; // src/web/types/message.ts

/**
 * Interface for ChatWindow component props
 */
export interface ChatWindowProps {
  conversation: Conversation | null;
  messages: Message[];
  isLoading: boolean;
  isSending: boolean;
  onSendMessage: (message: string, attachments?: File[]) => void;
  onCreateProposal?: () => void;
  showHeader?: boolean;
  className?: string;
}

/**
 * Interface for MessageBubble subcomponent props
 */
interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
}

/**
 * Interface for AttachmentPreview subcomponent props
 */
interface AttachmentPreviewProps {
  file: File;
  index: number;
  onRemove: (index: number) => void;
}

/**
 * Scroll to Bottom Function
 * Scrolls the message container to the bottom to show most recent messages
 * @param container HTMLDivElement | null
 * @param smooth boolean
 * @returns void
 */
const scrollToBottom = (container: HTMLDivElement | null, smooth: boolean) => {
  if (container) {
    container.scrollTop = container.scrollHeight;
    if (smooth) {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    }
  }
};

/**
 * ChatWindow Component
 * A component that displays chat conversations between users with message history and input for new messages
 */
export const ChatWindow: React.FC<ChatWindowProps> = ({
  conversation,
  messages,
  isLoading,
  isSending,
  onSendMessage,
  onCreateProposal,
  showHeader = true,
  className,
}) => {
  // State for the message input field
  const [messageInput, setMessageInput] = useState('');

  // State for selected file attachments
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // State to track if the message container is scrolled to the bottom
  const [isAtBottom, setIsAtBottom] = useState(true);

  // Ref for the message container to enable scrolling
  const messageContainerRef = useRef<HTMLDivElement>(null);

  // Ref for the input element to enable focus management
  const inputRef = useRef<HTMLInputElement>(null);

  // Access authenticated user information
  const { user } = useAuth();

  /**
   * useEffect Hook
   * Scrolls to bottom when new messages arrive if already at bottom
   */
  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom(messageContainerRef.current, true);
    }
  }, [messages, isAtBottom]);

  /**
   * useEffect Hook
   * Reset message input and selected files when conversation changes
   */
  useEffect(() => {
    setMessageInput('');
    setSelectedFiles([]);
  }, [conversation]);

  /**
   * useCallback Hook
   * Handles sending a new message
   * @returns void
   */
  const handleSendMessage = useCallback(() => {
    if (!messageInput.trim() && selectedFiles.length === 0) return;

    onSendMessage(messageInput, selectedFiles);
    setMessageInput('');
    setSelectedFiles([]);

    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [onSendMessage, messageInput, selectedFiles]);

  /**
   * useCallback Hook
   * Handles keyboard shortcuts for sending messages
   * @param e React.KeyboardEvent
   * @returns void
   */
  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    },
    [handleSendMessage]
  );

  /**
   * useCallback Hook
   * Handles file selection for attachment
   * @param files File[]
   * @returns void
   */
  const handleFileSelect = useCallback((files: File[]) => {
    setSelectedFiles(files);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  /**
   * useCallback Hook
   * Removes a file from the selected attachments
   * @param index number
   * @returns void
   */
  const removeFile = useCallback((index: number) => {
    const newFiles = [...selectedFiles];
    newFiles.splice(index, 1);
    setSelectedFiles(newFiles);
  }, [selectedFiles]);

  /**
   * useCallback Hook
   * Renders the content of a message based on its type
   * @param message Message
   * @returns JSX.Element
   */
  const renderMessageContent = useCallback((message: Message) => {
    switch (message.type) {
      case MessageType.TEXT:
        return <p>{message.content}</p>;
      case MessageType.FILE:
        return (
          <div>
            {message.attachments.map((attachment) => (
              <AttachmentPreview
                key={attachment.id}
                file={attachment as any} // TODO: Fix type
                onRemove={() => {}} // No remove functionality for existing attachments
                index={0} // Index not relevant for existing attachments
              />
            ))}
          </div>
        );
      case MessageType.PROPOSAL:
        return <p>Proposal: {message.content}</p>; // TODO: Render proposal details
      case MessageType.CONTRACT:
        return <p>Contract: {message.content}</p>; // TODO: Render contract details
      case MessageType.PAYMENT:
        return <p>Payment: {message.content}</p>; // TODO: Render payment details
      case MessageType.SYSTEM:
        return <p>{message.content}</p>;
      default:
        return <p>Unsupported message type</p>;
    }
  }, []);

  /**
   * useCallback Hook
   * Renders a file attachment with download options
   * @param attachment MessageAttachment
   * @returns JSX.Element
   */
  const renderAttachment = useCallback((attachment: any) => { // TODO: Fix type
    let icon = <FileIcon className="h-4 w-4 mr-1" />;
    if (attachment.fileType.startsWith('image/')) {
      icon = <PaperclipIcon className="h-4 w-4 mr-1" />;
    }

    return (
      <div key={attachment.id} className="flex items-center space-x-2">
        {icon}
        <a
          href={attachment.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:underline"
        >
          {attachment.name} ({attachment.fileType}, {attachment.size} bytes)
        </a>
        <a href={attachment.url} download className="text-gray-500 hover:text-gray-700">
          <DownloadCloud className="h-4 w-4" />
        </a>
      </div>
    );
  }, []);

  /**
   * useCallback Hook
   * Returns the appropriate icon for a message status
   * @param status MessageStatus
   * @returns JSX.Element | null
   */
  const getMessageStatusIcon = useCallback((status: MessageStatus) => {
    switch (status) {
      case MessageStatus.SENDING:
        return null; // TODO: Replace with sending icon
      case MessageStatus.SENT:
        return <CheckCheck className="h-3 w-3 text-gray-400" />;
      case MessageStatus.DELIVERED:
        return <CheckCheck className="h-3 w-3 text-blue-500" />;
      case MessageStatus.READ:
        return <CheckCheck className="h-3 w-3 text-green-500" />;
      case MessageStatus.FAILED:
        return <X className="h-3 w-3 text-red-500" />;
      default:
        return null;
    }
  }, []);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {showHeader && conversation && (
        <ConversationHeader conversation={conversation} />
      )}
      <div
        ref={messageContainerRef}
        className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-gray-300 scrollbar-track-gray-100"
        onScroll={() => {
          if (messageContainerRef.current) {
            const element = messageContainerRef.current;
            const isBottom = element.scrollHeight - element.scrollTop === element.clientHeight;
            setIsAtBottom(isBottom);
          }
        }}
      >
        {isLoading ? (
          <div>Loading messages...</div> // TODO: Replace with skeleton loaders
        ) : conversation ? (
          messages.length > 0 ? (
            messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isOwnMessage={message.senderId === user?.id}
              />
            ))
          ) : (
            <EmptyStateMessage conversation={conversation} />
          )
        ) : (
          <EmptyStateMessage conversation={null} />
        )}
      </div>
      <div className="p-4 border-t">
        {selectedFiles.length > 0 && (
          <div className="mb-2 space-x-2">
            {selectedFiles.map((file, index) => (
              <AttachmentPreview
                key={index}
                file={file}
                index={index}
                onRemove={removeFile}
              />
            ))}
          </div>
        )}
        <div className="flex items-center space-x-2">
          <FileUpload
            accept="image/*,application/pdf,.docx,.txt"
            multiple
            onFilesSelected={handleFileSelect}
            disabled={isSending}
            ref={inputRef as any} // TODO: Fix type
          />
          <Input
            placeholder="Type your message..."
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={isSending}
            ref={inputRef}
            className="flex-1"
          />
          <Button onClick={handleSendMessage} disabled={isSending}>
            <Send className="h-4 w-4 mr-2" />
            Send
          </Button>
        </div>
      </div>
    </div>
  );
};

/**
 * MessageBubble Subcomponent
 * Renders an individual message bubble with content and metadata
 */
const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isOwnMessage }) => {
  const { user } = useAuth();
  const getMessageStatusIcon = useCallback((status: MessageStatus) => {
    switch (status) {
      case MessageStatus.SENDING:
        return null; // TODO: Replace with sending icon
      case MessageStatus.SENT:
        return <CheckCheck className="h-3 w-3 text-gray-400" />;
      case MessageStatus.DELIVERED:
        return <CheckCheck className="h-3 w-3 text-blue-500" />;
      case MessageStatus.READ:
        return <CheckCheck className="h-3 w-3 text-green-500" />;
      case MessageStatus.FAILED:
        return <X className="h-3 w-3 text-red-500" />;
      default:
        return null;
    }
  }, []);

  return (
    <div
      className={cn(
        'flex py-2',
        isOwnMessage ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'flex items-end space-x-2 max-w-[80%] rounded-xl px-3 py-2',
          isOwnMessage
            ? 'bg-blue-100 text-gray-800'
            : 'bg-gray-100 text-gray-800'
        )}
      >
        <Avatar
          src={message.sender?.avatar || undefined}
          alt={message.sender?.fullName || 'User'}
          name={message.sender?.fullName}
          size="sm"
        />
        <div>
          <p className="text-sm">{message.content}</p>
          <div className="flex items-center space-x-1 text-xs text-gray-500">
            <Tooltip content={formatDate(message.createdAt)}>
              <span>{formatRelativeTime(message.createdAt)}</span>
            </Tooltip>
            {isOwnMessage && message.status && getMessageStatusIcon(message.status)}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * ConversationHeader Subcomponent
 * Header component showing conversation details
 */
interface ConversationHeaderProps {
  conversation: Conversation;
}

const ConversationHeader: React.FC<ConversationHeaderProps> = ({ conversation }) => {
  return (
    <div className="flex items-center justify-between p-4 border-b">
      <div>
        <h2 className="text-lg font-semibold">{conversation.title || 'Conversation'}</h2>
        {/* TODO: Add participant status and actions */}
      </div>
      {/* TODO: Add action buttons */}
    </div>
  );
};

/**
 * AttachmentPreview Subcomponent
 * Preview of a file attachment before sending
 */
const AttachmentPreview: React.FC<AttachmentPreviewProps> = ({ file, index, onRemove }) => {
  const [previewURL, setPreviewURL] = useState<string | null>(null);

  useEffect(() => {
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewURL(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file]);

  return (
    <div className="flex items-center justify-between p-3 bg-white border rounded-lg">
      <div className="flex items-center space-x-3 overflow-hidden">
        {previewURL ? (
          <div className="relative w-10 h-10 overflow-hidden rounded bg-gray-100 flex-shrink-0">
            <img
              src={previewURL}
              alt={file.name}
              className="object-cover w-full h-full"
            />
          </div>
        ) : (
          <div className="flex items-center justify-center w-10 h-10 rounded bg-gray-100 flex-shrink-0">
            <FileIcon className="w-5 h-5 text-gray-500" aria-hidden="true" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
          <p className="text-xs text-gray-500">{file.type}, {file.size} bytes</p>
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-gray-500 hover:text-gray-700"
        onClick={() => onRemove(index)}
        aria-label={`Remove file ${file.name}`}
      >
        <X className="w-4 h-4" aria-hidden="true" />
      </Button>
    </div>
  );
};

/**
 * EmptyStateMessage Subcomponent
 * Displayed when no conversation is selected or when the conversation has no messages
 */
interface EmptyStateMessageProps {
  conversation: Conversation | null;
}

const EmptyStateMessage: React.FC<EmptyStateMessageProps> = ({ conversation }) => {
  return (
    <div className="flex items-center justify-center h-full text-gray-500">
      {conversation ? (
        <p>Start the conversation!</p>
      ) : (
        <p>Select a conversation to view messages.</p>
      )}
    </div>
  );
};