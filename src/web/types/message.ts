/**
 * Message Types
 * 
 * This file contains TypeScript definitions for the messaging system of the Engagerr platform.
 * It defines the core structures for conversations, messages, attachments, and related interfaces
 * used in communication between creators and brands.
 */

import { User } from './user';
import { Creator } from './creator';
import { Brand } from './brand';
import { Partnership } from './partnership';

/**
 * Types of messages that can be sent in the platform
 */
export enum MessageType {
  TEXT = 'text',       // Regular text message
  FILE = 'file',       // File attachment message
  PROPOSAL = 'proposal', // Partnership proposal
  CONTRACT = 'contract', // Legal contract
  PAYMENT = 'payment',   // Payment notification or request
  SYSTEM = 'system'      // System notification or alert
}

/**
 * Status of message delivery
 */
export enum MessageStatus {
  SENDING = 'sending',     // Message is being sent
  SENT = 'sent',           // Message has been sent to the server
  DELIVERED = 'delivered', // Message has been delivered to the recipient
  READ = 'read',           // Message has been read by the recipient
  FAILED = 'failed'        // Message failed to send
}

/**
 * Types of participants in a conversation
 */
export enum ParticipantType {
  CREATOR = 'creator', // Content creator
  BRAND = 'brand',     // Brand/company
  SYSTEM = 'system'    // System automated messages
}

/**
 * File attachment in a message
 */
export interface MessageAttachment {
  id: string;               // Unique identifier for the attachment
  name: string;             // Original filename
  fileType: string;         // MIME type of the file
  url: string;              // URL to access the file
  size: number;             // File size in bytes
  thumbnailUrl: string | null; // URL to a thumbnail preview (for images/videos)
  createdAt: Date;          // When the attachment was uploaded
}

/**
 * Individual message within a conversation
 */
export interface Message {
  id: string;               // Unique identifier for the message
  conversationId: string;   // ID of the conversation this message belongs to
  senderId: string;         // ID of the user who sent the message
  senderType: ParticipantType; // Type of sender (creator, brand, system)
  sender: User | null;      // User details of the sender
  content: string;          // Message content
  type: MessageType;        // Type of message
  status: MessageStatus;    // Delivery status
  attachments: MessageAttachment[]; // File attachments
  proposalId: string | null; // ID of related proposal if applicable
  contractId: string | null; // ID of related contract if applicable
  paymentId: string | null;  // ID of related payment if applicable
  metadata: Record<string, any> | null; // Additional data specific to message type
  isRead: boolean;           // Whether the message has been read
  readBy: string[];          // IDs of users who have read the message
  readAt: Date | null;       // When the message was first read
  createdAt: Date;           // When the message was created
  updatedAt: Date;           // When the message was last updated
}

/**
 * Participant in a conversation (creator or brand)
 */
export interface Participant {
  id: string;               // Unique identifier for the participant
  userId: string;           // ID of the user account
  type: ParticipantType;    // Type of participant (creator or brand)
  name: string;             // Display name
  avatarUrl: string | null; // URL to avatar/profile image
  creator: Creator | null;  // Creator details if participant is a creator
  brand: Brand | null;      // Brand details if participant is a brand
  isOnline: boolean;        // Whether the participant is currently online
  lastActiveAt: Date | null; // When the participant was last active
}

/**
 * Conversation between participants (creator and brand)
 */
export interface Conversation {
  id: string;               // Unique identifier for the conversation
  participants: Participant[]; // Participants in the conversation
  lastMessage: Message | null; // Most recent message in the conversation
  title: string | null;     // Optional conversation title
  partnershipId: string | null; // ID of related partnership if applicable
  partnership: Partnership | null; // Partnership details if related to one
  unreadCount: number;      // Number of unread messages for current user
  isArchived: boolean;      // Whether the conversation is archived
  createdAt: Date;          // When the conversation was created
  updatedAt: Date;          // When the conversation was last updated
}

/**
 * Filters for retrieving conversations
 */
export interface ConversationFilter {
  participantId: string | null; // Filter by participant ID
  participantType: ParticipantType | null; // Filter by participant type
  partnershipId: string | null; // Filter by related partnership
  hasUnread: boolean | null; // Filter to only show conversations with unread messages
  isArchived: boolean | null; // Filter to show/hide archived conversations
  searchTerm: string | null; // Search term to filter conversations
}

/**
 * Filters for retrieving messages
 */
export interface MessageFilter {
  conversationId: string;   // ID of the conversation to fetch messages from
  types: MessageType[] | null; // Filter by message types
  startDate: Date | null;   // Filter messages after this date
  endDate: Date | null;     // Filter messages before this date
  searchTerm: string | null; // Search term to filter messages
  limit: number;            // Maximum number of messages to return
  cursor: string | null;    // Cursor for pagination
}

/**
 * Input for creating a new conversation
 */
export interface CreateConversationInput {
  creatorId: string;        // ID of the creator participant
  brandId: string;          // ID of the brand participant
  initialMessage: string;   // First message content to start the conversation
  partnershipId: string | null; // Optional ID of related partnership
  attachments: File[] | null; // Optional file attachments for the initial message
}

/**
 * Input for sending a new message
 */
export interface SendMessageInput {
  conversationId: string;   // ID of the conversation to send message to
  content: string;          // Message content
  type: MessageType;        // Type of message
  attachments: File[] | null; // Optional file attachments
  proposalId: string | null; // ID of related proposal if applicable
  contractId: string | null; // ID of related contract if applicable
  paymentId: string | null;  // ID of related payment if applicable
  metadata: Record<string, any> | null; // Additional data specific to message type
}

/**
 * Response format for conversation listings with pagination
 */
export interface ConversationListResponse {
  conversations: Conversation[]; // List of conversations
  totalCount: number;         // Total number of conversations matching filters
  hasMore: boolean;           // Whether there are more conversations to fetch
  nextCursor: string | null;  // Cursor for fetching next page
}

/**
 * Response format for message listings with pagination
 */
export interface MessageListResponse {
  messages: Message[];       // List of messages
  totalCount: number;        // Total number of messages matching filters
  hasMore: boolean;          // Whether there are more messages to fetch
  nextCursor: string | null; // Cursor for fetching next page
}

/**
 * Request for marking messages as read
 */
export interface MarkMessagesReadRequest {
  conversationId: string;    // ID of the conversation
  messageIds: string[] | null; // IDs of specific messages to mark as read, null for all
}