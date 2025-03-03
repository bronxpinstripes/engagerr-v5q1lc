# Partnerships API

This documentation covers the API endpoints for managing partnerships between creators and brands on the Engagerr platform. Partnerships represent the formalized collaboration between creators and brands, including proposals, contracts, deliverables tracking, and payments through the entire partnership lifecycle.

## Authentication

All partnership API endpoints require authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer {your_jwt_token}
```

Access to partnership data is strictly controlled:
- Creators can only access partnerships where they are the creator party
- Brands can only access partnerships where they are the brand party
- Team members can access partnerships based on their assigned permissions

## Base URL

All API endpoints are relative to:

```
https://api.engagerr.io/api
```

## Endpoints

### Proposals

Proposals represent the initial offer for collaboration between a creator and brand.

#### Create Proposal

```http
POST /partnerships/proposals
```

**Request Body:**

```json
{
  "recipientId": "string", // User ID of the recipient (creator or brand)
  "campaignId": "string", // Optional, if associated with a campaign
  "deliverables": [
    {
      "type": "string", // e.g., "instagram_post", "tiktok_video"
      "description": "string",
      "dueDate": "string", // ISO 8601 format
      "requirements": "string"
    }
  ],
  "compensation": {
    "amount": "number",
    "currency": "string", // e.g., "USD"
    "paymentSchedule": "string" // e.g., "50% upfront, 50% on completion"
  },
  "timeline": {
    "startDate": "string", // ISO 8601 format
    "endDate": "string" // ISO 8601 format
  },
  "terms": {
    "contentRights": "string",
    "exclusivity": "string",
    "revisions": "string",
    "additionalTerms": "string"
  }
}
```

**Response:**

```json
{
  "id": "string",
  "status": "draft", // draft, sent, accepted, countered, rejected
  "senderId": "string",
  "recipientId": "string",
  "campaignId": "string",
  "deliverables": [...],
  "compensation": {...},
  "timeline": {...},
  "terms": {...},
  "createdAt": "string",
  "updatedAt": "string"
}
```

**Status Codes:**
- `201 Created` - Proposal created successfully
- `400 Bad Request` - Invalid parameters
- `403 Forbidden` - Insufficient permissions
- `409 Conflict` - Cannot create proposal (e.g., existing active proposal)

#### Get Proposal

```http
GET /partnerships/proposals/{proposalId}
```

**Response:**

```json
{
  "id": "string",
  "status": "string",
  "senderId": "string",
  "senderType": "creator|brand",
  "senderDetails": {
    "name": "string",
    "image": "string",
    // Additional sender details
  },
  "recipientId": "string",
  "recipientType": "creator|brand",
  "recipientDetails": {
    "name": "string",
    "image": "string",
    // Additional recipient details
  },
  "campaignId": "string",
  "campaignName": "string",
  "deliverables": [...],
  "compensation": {...},
  "timeline": {...},
  "terms": {...},
  "history": [
    {
      "action": "created|sent|viewed|accepted|countered|rejected",
      "timestamp": "string",
      "userId": "string"
    }
  ],
  "createdAt": "string",
  "updatedAt": "string"
}
```

**Status Codes:**
- `200 OK` - Successful response
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Proposal not found

#### List Proposals

```http
GET /partnerships/proposals
```

**Query Parameters:**

- `status` - Filter by status (optional)
- `role` - Filter by role: "sender" or "recipient" (optional)
- `page` - Page number (default: 1)
- `limit` - Results per page (default: 20, max: 100)

**Response:**

```json
{
  "proposals": [
    {
      "id": "string",
      "status": "string",
      "recipientName": "string",
      "senderName": "string",
      "campaignName": "string",
      "compensation": {
        "amount": "number",
        "currency": "string"
      },
      "createdAt": "string",
      "updatedAt": "string"
    }
  ],
  "pagination": {
    "total": "number",
    "pages": "number",
    "current": "number",
    "limit": "number"
  }
}
```

**Status Codes:**
- `200 OK` - Successful response
- `400 Bad Request` - Invalid parameters

#### Update Proposal (Draft)

```http
PATCH /partnerships/proposals/{proposalId}
```

**Request Body:**

Similar to create proposal, with only the fields to be updated.

**Response:**

Same as Get Proposal.

**Status Codes:**
- `200 OK` - Successfully updated
- `400 Bad Request` - Invalid parameters
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Proposal not found
- `409 Conflict` - Cannot update (e.g., proposal already sent)

#### Send Proposal

```http
POST /partnerships/proposals/{proposalId}/send
```

**Response:**

Same as Get Proposal with updated status.

**Status Codes:**
- `200 OK` - Successfully sent
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Proposal not found
- `409 Conflict` - Cannot send (e.g., invalid state)

#### Accept Proposal

```http
POST /partnerships/proposals/{proposalId}/accept
```

**Response:**

```json
{
  "proposal": {
    // Proposal data as in Get Proposal
  },
  "partnership": {
    "id": "string",
    "status": "active",
    // Partnership data
  }
}
```

**Status Codes:**
- `200 OK` - Successfully accepted
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Proposal not found
- `409 Conflict` - Cannot accept (e.g., invalid state)

#### Counter Proposal

```http
POST /partnerships/proposals/{proposalId}/counter
```

**Request Body:**

Similar to create proposal, with modifications to the original proposal.

**Response:**

Same as Get Proposal with updated status and a new proposal ID.

**Status Codes:**
- `201 Created` - Counter proposal created
- `400 Bad Request` - Invalid parameters
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Original proposal not found
- `409 Conflict` - Cannot counter (e.g., invalid state)

#### Reject Proposal

```http
POST /partnerships/proposals/{proposalId}/reject
```

**Request Body:**

```json
{
  "reason": "string" // Optional reason for rejection
}
```

**Response:**

Same as Get Proposal with updated status.

**Status Codes:**
- `200 OK` - Successfully rejected
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Proposal not found
- `409 Conflict` - Cannot reject (e.g., invalid state)

### Partnerships

Partnerships represent the active collaboration between a creator and brand after a proposal has been accepted.

#### Get Partnership

```http
GET /partnerships/{partnershipId}
```

**Response:**

```json
{
  "id": "string",
  "status": "string", // active, completed, terminated
  "creatorId": "string",
  "creatorDetails": {
    "name": "string",
    "image": "string",
    // Additional creator details
  },
  "brandId": "string",
  "brandDetails": {
    "name": "string",
    "image": "string",
    // Additional brand details
  },
  "campaignId": "string",
  "campaignName": "string",
  "proposalId": "string",
  "contractId": "string",
  "deliverables": [
    {
      "id": "string",
      "type": "string",
      "description": "string",
      "dueDate": "string",
      "requirements": "string",
      "status": "string", // pending, in_progress, submitted, approved, rejected
      "submissionUrl": "string",
      "feedback": "string",
      "submittedAt": "string",
      "approvedAt": "string"
    }
  ],
  "compensation": {
    "amount": "number",
    "currency": "string",
    "paymentSchedule": "string",
    "payments": [
      {
        "id": "string",
        "type": "initial|milestone|final",
        "amount": "number",
        "status": "pending|in_progress|completed",
        "dueDate": "string",
        "paidAt": "string"
      }
    ]
  },
  "timeline": {
    "startDate": "string",
    "endDate": "string",
    "milestones": [
      {
        "description": "string",
        "dueDate": "string",
        "status": "pending|completed",
        "completedAt": "string"
      }
    ]
  },
  "activity": [
    {
      "type": "string", // contract_signed, deliverable_submitted, etc.
      "description": "string",
      "userId": "string",
      "userName": "string",
      "timestamp": "string"
    }
  ],
  "createdAt": "string",
  "updatedAt": "string"
}
```

**Status Codes:**
- `200 OK` - Successful response
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Partnership not found

#### List Partnerships

```http
GET /partnerships
```

**Query Parameters:**

- `status` - Filter by status (optional)
- `role` - Filter by role: "creator" or "brand" (optional)
- `campaignId` - Filter by campaign ID (optional)
- `page` - Page number (default: 1)
- `limit` - Results per page (default: 20, max: 100)

**Response:**

```json
{
  "partnerships": [
    {
      "id": "string",
      "status": "string",
      "creatorName": "string",
      "brandName": "string",
      "campaignName": "string",
      "compensation": {
        "amount": "number",
        "currency": "string"
      },
      "startDate": "string",
      "endDate": "string",
      "deliverablesCount": "number",
      "deliverablesCompleted": "number",
      "createdAt": "string",
      "updatedAt": "string"
    }
  ],
  "pagination": {
    "total": "number",
    "pages": "number",
    "current": "number",
    "limit": "number"
  }
}
```

**Status Codes:**
- `200 OK` - Successful response
- `400 Bad Request` - Invalid parameters

### Contracts

Contracts represent the legal agreement between a creator and brand for a partnership.

#### Generate Contract

```http
POST /partnerships/{partnershipId}/contract
```

**Response:**

```json
{
  "id": "string",
  "partnershipId": "string",
  "status": "draft", // draft, sent, signed_creator, signed_brand, active, terminated
  "documentUrl": "string", // URL to view the contract document
  "createdAt": "string",
  "updatedAt": "string"
}
```

**Status Codes:**
- `201 Created` - Contract generated successfully
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Partnership not found
- `409 Conflict` - Contract already exists

#### Get Contract

```http
GET /partnerships/{partnershipId}/contract
```

**Response:**

```json
{
  "id": "string",
  "partnershipId": "string",
  "status": "string",
  "documentUrl": "string",
  "creatorSignedAt": "string",
  "brandSignedAt": "string",
  "signatories": [
    {
      "userId": "string",
      "name": "string",
      "role": "creator|brand",
      "signedAt": "string",
      "ipAddress": "string"
    }
  ],
  "createdAt": "string",
  "updatedAt": "string"
}
```

**Status Codes:**
- `200 OK` - Successful response
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Contract or partnership not found

#### Sign Contract

```http
POST /partnerships/{partnershipId}/contract/sign
```

**Request Body:**

```json
{
  "signature": "string" // Base64 encoded signature image (optional)
}
```

**Response:**

Same as Get Contract with updated status.

**Status Codes:**
- `200 OK` - Successfully signed
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Contract or partnership not found
- `409 Conflict` - Cannot sign (e.g., already signed by this party)

### Deliverables

Deliverables represent the content or services that the creator must provide as part of the partnership.

#### List Deliverables

```http
GET /partnerships/{partnershipId}/deliverables
```

**Response:**

```json
{
  "deliverables": [
    {
      "id": "string",
      "partnershipId": "string",
      "type": "string",
      "description": "string",
      "dueDate": "string",
      "requirements": "string",
      "status": "string",
      "submissionUrl": "string",
      "feedback": "string",
      "submittedAt": "string",
      "approvedAt": "string",
      "createdAt": "string",
      "updatedAt": "string"
    }
  ]
}
```

**Status Codes:**
- `200 OK` - Successful response
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Partnership not found

#### Get Deliverable

```http
GET /partnerships/{partnershipId}/deliverables/{deliverableId}
```

**Response:**

Same as individual deliverable from List Deliverables.

**Status Codes:**
- `200 OK` - Successful response
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Deliverable or partnership not found

#### Submit Deliverable

```http
POST /partnerships/{partnershipId}/deliverables/{deliverableId}/submit
```

**Request Body:**

```json
{
  "submissionUrl": "string", // URL to the content
  "notes": "string" // Optional notes about the submission
}
```

**Response:**

Same as Get Deliverable with updated status.

**Status Codes:**
- `200 OK` - Successfully submitted
- `400 Bad Request` - Invalid parameters
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Deliverable or partnership not found
- `409 Conflict` - Cannot submit (e.g., already submitted)

#### Approve Deliverable

```http
POST /partnerships/{partnershipId}/deliverables/{deliverableId}/approve
```

**Request Body:**

```json
{
  "feedback": "string" // Optional feedback
}
```

**Response:**

Same as Get Deliverable with updated status.

**Status Codes:**
- `200 OK` - Successfully approved
- `403 Forbidden` - Insufficient permissions (only brand can approve)
- `404 Not Found` - Deliverable or partnership not found
- `409 Conflict` - Cannot approve (e.g., not submitted yet)

#### Request Revision

```http
POST /partnerships/{partnershipId}/deliverables/{deliverableId}/revision
```

**Request Body:**

```json
{
  "feedback": "string" // Required feedback for revision
}
```

**Response:**

Same as Get Deliverable with updated status.

**Status Codes:**
- `200 OK` - Successfully requested revision
- `400 Bad Request` - Missing feedback
- `403 Forbidden` - Insufficient permissions (only brand can request revision)
- `404 Not Found` - Deliverable or partnership not found
- `409 Conflict` - Cannot request revision (e.g., not submitted yet)

### Payments

Payments represent the financial transactions associated with a partnership.

#### List Payments

```http
GET /partnerships/{partnershipId}/payments
```

**Response:**

```json
{
  "payments": [
    {
      "id": "string",
      "partnershipId": "string",
      "type": "initial|milestone|final",
      "amount": "number",
      "currency": "string",
      "status": "pending|in_progress|completed|failed",
      "description": "string",
      "dueDate": "string",
      "paidAt": "string",
      "transactionId": "string",
      "createdAt": "string",
      "updatedAt": "string"
    }
  ]
}
```

**Status Codes:**
- `200 OK` - Successful response
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Partnership not found

#### Get Payment

```http
GET /partnerships/{partnershipId}/payments/{paymentId}
```

**Response:**

Same as individual payment from List Payments.

**Status Codes:**
- `200 OK` - Successful response
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Payment or partnership not found

#### Initiate Payment

```http
POST /partnerships/{partnershipId}/payments
```

**Request Body:**

```json
{
  "type": "initial|milestone|final",
  "amount": "number",
  "currency": "string",
  "description": "string"
}
```

**Response:**

```json
{
  "payment": {
    // Payment data as in Get Payment
  },
  "paymentIntent": {
    "clientSecret": "string" // Used by Stripe Elements on the frontend
  }
}
```

**Status Codes:**
- `201 Created` - Payment initiated successfully
- `400 Bad Request` - Invalid parameters
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Partnership not found
- `409 Conflict` - Cannot initiate payment (e.g., contract not signed)

#### Release Escrow Payment

```http
POST /partnerships/{partnershipId}/payments/{paymentId}/release
```

**Response:**

Same as Get Payment with updated status.

**Status Codes:**
- `200 OK` - Successfully released
- `403 Forbidden` - Insufficient permissions (only brand can release)
- `404 Not Found` - Payment or partnership not found
- `409 Conflict` - Cannot release (e.g., deliverables not approved)

## Error Handling

All API endpoints return standard HTTP status codes. Error responses have the following format:

```json
{
  "error": {
    "code": "string", // Machine-readable error code
    "message": "string", // Human-readable error message
    "details": {} // Optional additional error details
  }
}
```

### Common Error Codes

- `invalid_request`: The request was malformed or contained invalid parameters
- `authentication_required`: Authentication is required for this endpoint
- `insufficient_permissions`: User does not have permission for this action
- `resource_not_found`: The requested resource was not found
- `invalid_state`: The resource is in a state where the requested action cannot be performed
- `rate_limited`: Too many requests, please try again later
- `internal_server_error`: Unexpected server error

## Partnership Lifecycle

Partnerships follow a defined lifecycle with state transitions:

1. **Proposal Stage**
   - Draft: Proposal is being created
   - Sent: Proposal has been sent to recipient
   - Accepted: Proposal has been accepted, creating a partnership
   - Countered: A counter-proposal has been created
   - Rejected: Proposal has been rejected

2. **Contract Stage**
   - Draft: Contract is being generated
   - Sent: Contract is ready for signatures
   - Partially Signed: One party has signed
   - Active: Both parties have signed

3. **Execution Stage**
   - Active: Partnership is ongoing
   - Completed: All deliverables approved and payments released
   - Terminated: Partnership ended prematurely

## Example Workflows

### Complete Partnership Creation

1. Brand creates a proposal:
   ```http
   POST /partnerships/proposals
   ```

2. Brand sends proposal to creator:
   ```http
   POST /partnerships/proposals/{proposalId}/send
   ```

3. Creator accepts proposal:
   ```http
   POST /partnerships/proposals/{proposalId}/accept
   ```

4. Generate contract for the partnership:
   ```http
   POST /partnerships/{partnershipId}/contract
   ```

5. Both parties sign the contract:
   ```http
   POST /partnerships/{partnershipId}/contract/sign
   ```

6. Brand initiates initial payment:
   ```http
   POST /partnerships/{partnershipId}/payments
   ```

7. Creator submits deliverable:
   ```http
   POST /partnerships/{partnershipId}/deliverables/{deliverableId}/submit
   ```

8. Brand approves deliverable:
   ```http
   POST /partnerships/{partnershipId}/deliverables/{deliverableId}/approve
   ```

9. Brand releases final payment:
   ```http
   POST /partnerships/{partnershipId}/payments/{paymentId}/release
   ```