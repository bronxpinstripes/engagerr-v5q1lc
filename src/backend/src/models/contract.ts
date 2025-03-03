/**
 * Contract Model
 * 
 * Implements the contract data model and business logic for managing legal agreements 
 * between creators and brands in the Engagerr platform. This model handles all contract-related
 * operations including creation, retrieval, signing, and status management.
 */

import { prisma } from '../config/database';
import { ContractStatus, CreateContractInput, UpdateContractInput } from '../types/partnership';
import { validateSchema, schemas } from '../utils/validation';
import { DatabaseError, ValidationError, NotFoundError, ConflictError } from '../utils/errors';

/**
 * Creates a new contract for a partnership between creator and brand
 * @param contractData Data for creating a new contract
 * @returns The created contract record
 */
export async function createContract(contractData: CreateContractInput): Promise<Contract> {
  try {
    // Validate the contract data using the contract schema
    const validatedData = await validateSchema(contractData, schemas.partnershipSchema({ isUpdate: true }));
    
    // Check if a contract already exists for the partnership
    const existingContract = await prisma.contract.findFirst({
      where: {
        partnershipId: validatedData.partnershipId,
      },
    });
    
    // If a contract already exists, throw a conflict error
    if (existingContract) {
      throw new ConflictError('A contract already exists for this partnership', {
        partnershipId: validatedData.partnershipId,
      });
    }
    
    // Create the new contract with default DRAFT status
    const contract = await prisma.contract.create({
      data: {
        ...validatedData,
        status: ContractStatus.DRAFT,
        version: 1,
        creatorSigned: false,
        brandSigned: false,
      },
    });
    
    return contract;
  } catch (error) {
    // Handle specific errors or rethrow
    if (error instanceof ValidationError || error instanceof ConflictError) {
      throw error;
    }
    
    throw new DatabaseError(
      'Failed to create contract',
      { originalError: error instanceof Error ? error.message : String(error) }
    );
  }
}

/**
 * Retrieves a contract by its ID
 * @param id Contract ID
 * @returns The contract or null if not found
 */
export async function getContractById(id: string): Promise<Contract | null> {
  try {
    const contract = await prisma.contract.findUnique({
      where: { id },
      include: {
        partnership: {
          include: {
            creator: true,
            brand: true,
          },
        },
      },
    });
    
    return contract;
  } catch (error) {
    throw new DatabaseError(
      'Failed to retrieve contract',
      { contractId: id, originalError: error instanceof Error ? error.message : String(error) }
    );
  }
}

/**
 * Retrieves a contract by its associated partnership ID
 * @param partnershipId Partnership ID
 * @returns The contract or null if not found
 */
export async function getContractByPartnershipId(partnershipId: string): Promise<Contract | null> {
  try {
    const contract = await prisma.contract.findFirst({
      where: { partnershipId },
      include: {
        partnership: {
          include: {
            creator: true,
            brand: true,
          },
        },
      },
    });
    
    return contract;
  } catch (error) {
    throw new DatabaseError(
      'Failed to retrieve contract by partnership ID',
      { partnershipId, originalError: error instanceof Error ? error.message : String(error) }
    );
  }
}

/**
 * Updates a contract's details
 * @param id Contract ID
 * @param updateData Data to update in the contract
 * @returns The updated contract
 */
export async function updateContract(id: string, updateData: UpdateContractInput): Promise<Contract> {
  try {
    // Validate the contract update data
    const validatedData = await validateSchema(updateData, schemas.partnershipSchema({ isUpdate: true }));
    
    // Check if contract exists
    const existingContract = await prisma.contract.findUnique({
      where: { id },
    });
    
    if (!existingContract) {
      throw new NotFoundError('Contract not found', 'Contract', id);
    }
    
    // Check if contract is in a state that allows updates
    const allowedStatuses = [
      ContractStatus.DRAFT,
      ContractStatus.PENDING_SIGNATURES
    ];
    
    if (!allowedStatuses.includes(existingContract.status as ContractStatus)) {
      throw new ConflictError(
        `Cannot update contract in ${existingContract.status} status`,
        { currentStatus: existingContract.status }
      );
    }
    
    // Update the contract record
    const updatedContract = await prisma.contract.update({
      where: { id },
      data: {
        ...validatedData,
        version: existingContract.version + 1,
        updatedAt: new Date(),
      },
    });
    
    return updatedContract;
  } catch (error) {
    // Handle specific errors or rethrow
    if (
      error instanceof ValidationError || 
      error instanceof NotFoundError || 
      error instanceof ConflictError
    ) {
      throw error;
    }
    
    throw new DatabaseError(
      'Failed to update contract',
      { contractId: id, originalError: error instanceof Error ? error.message : String(error) }
    );
  }
}

/**
 * Updates a contract's status
 * @param id Contract ID
 * @param newStatus New status for the contract
 * @returns The updated contract
 */
export async function updateContractStatus(id: string, newStatus: ContractStatus): Promise<Contract> {
  try {
    // Check if contract exists
    const existingContract = await prisma.contract.findUnique({
      where: { id },
    });
    
    if (!existingContract) {
      throw new NotFoundError('Contract not found', 'Contract', id);
    }
    
    // Validate that the status transition is allowed
    const currentStatus = existingContract.status as ContractStatus;
    if (!isValidStatusTransition(currentStatus, newStatus)) {
      throw new ConflictError(
        `Invalid status transition from ${currentStatus} to ${newStatus}`,
        { currentStatus, newStatus }
      );
    }
    
    // Update the contract status
    const updatedContract = await prisma.contract.update({
      where: { id },
      data: {
        status: newStatus,
        updatedAt: new Date(),
      },
    });
    
    return updatedContract;
  } catch (error) {
    // Handle specific errors or rethrow
    if (
      error instanceof NotFoundError || 
      error instanceof ConflictError
    ) {
      throw error;
    }
    
    throw new DatabaseError(
      'Failed to update contract status',
      { contractId: id, newStatus, originalError: error instanceof Error ? error.message : String(error) }
    );
  }
}

/**
 * Records a signature on the contract by either creator or brand
 * @param id Contract ID
 * @param signerType Type of signer ('creator' or 'brand')
 * @param signerId ID of the signing entity
 * @returns The updated contract with signature status
 */
export async function signContract(id: string, signerType: string, signerId: string): Promise<Contract> {
  try {
    // Check if contract exists
    const contract = await prisma.contract.findUnique({
      where: { id },
      include: {
        partnership: {
          include: {
            creator: true,
            brand: true,
          },
        },
      },
    });
    
    if (!contract) {
      throw new NotFoundError('Contract not found', 'Contract', id);
    }
    
    // Validate the contract is in a signable state
    const validSigningStatuses = [
      ContractStatus.PENDING_SIGNATURES,
      ContractStatus.PARTIALLY_SIGNED
    ];
    
    if (!validSigningStatuses.includes(contract.status as ContractStatus)) {
      throw new ConflictError(
        `Contract in ${contract.status} status cannot be signed`,
        { currentStatus: contract.status }
      );
    }
    
    // Verify the signer has permission to sign this contract
    if (signerType === 'creator' && contract.partnership.creatorId !== signerId) {
      throw new ConflictError('Only the assigned creator can sign this contract', {
        contractId: id,
        attemptedSignerId: signerId,
        actualCreatorId: contract.partnership.creatorId,
      });
    }
    
    if (signerType === 'brand' && contract.partnership.brandId !== signerId) {
      throw new ConflictError('Only the assigned brand can sign this contract', {
        contractId: id,
        attemptedSignerId: signerId,
        actualBrandId: contract.partnership.brandId,
      });
    }
    
    // Prepare update data based on signer type
    const updateData: any = {
      updatedAt: new Date(),
    };
    
    if (signerType === 'creator') {
      updateData.creatorSigned = true;
      updateData.creatorSignedAt = new Date();
    } else if (signerType === 'brand') {
      updateData.brandSigned = true;
      updateData.brandSignedAt = new Date();
    } else {
      throw new ValidationError('Invalid signer type', { signerType });
    }
    
    // Update status to PARTIALLY_SIGNED if this is the first signature
    if (
      !contract.creatorSigned && 
      !contract.brandSigned && 
      contract.status === ContractStatus.PENDING_SIGNATURES
    ) {
      updateData.status = ContractStatus.PARTIALLY_SIGNED;
    }
    
    // If both parties have now signed, update to SIGNED and set effective date
    const bothSigned = (
      (signerType === 'creator' && contract.brandSigned) || 
      (signerType === 'brand' && contract.creatorSigned)
    );
    
    if (bothSigned) {
      updateData.status = ContractStatus.SIGNED;
      updateData.effectiveDate = new Date();
    }
    
    // Update the contract with signature information
    const updatedContract = await prisma.contract.update({
      where: { id },
      data: updateData,
      include: {
        partnership: {
          include: {
            creator: true,
            brand: true,
          },
        },
      },
    });
    
    return updatedContract;
  } catch (error) {
    // Handle specific errors or rethrow
    if (
      error instanceof ValidationError || 
      error instanceof NotFoundError || 
      error instanceof ConflictError
    ) {
      throw error;
    }
    
    throw new DatabaseError(
      'Failed to sign contract',
      { 
        contractId: id, 
        signerType, 
        signerId, 
        originalError: error instanceof Error ? error.message : String(error) 
      }
    );
  }
}

/**
 * Generates a PDF document for the contract and stores the URL
 * @param id Contract ID
 * @returns URL to the generated document
 */
export async function generateContractDocument(id: string): Promise<string> {
  try {
    // Retrieve the contract with all related data
    const contract = await prisma.contract.findUnique({
      where: { id },
      include: {
        partnership: {
          include: {
            creator: {
              include: {
                user: true,
              },
            },
            brand: {
              include: {
                user: true,
              },
            },
            deliverables: true,
            milestones: true,
          },
        },
      },
    });
    
    if (!contract) {
      throw new NotFoundError('Contract not found', 'Contract', id);
    }
    
    // Generate a PDF document using the contract terms and partnership details
    // Here we would typically use a PDF generation library or service
    // For implementation, we would format the contract data into a document template
    // and convert it to PDF
    
    // For now, generate a placeholder URL for the document
    const documentUrl = `https://engagerr.app/contracts/${id}/document.pdf`;
    
    // Update the contract record with the document URL
    await prisma.contract.update({
      where: { id },
      data: {
        documentUrl,
        updatedAt: new Date(),
      },
    });
    
    return documentUrl;
  } catch (error) {
    // Handle specific errors or rethrow
    if (error instanceof NotFoundError) {
      throw error;
    }
    
    throw new DatabaseError(
      'Failed to generate contract document',
      { contractId: id, originalError: error instanceof Error ? error.message : String(error) }
    );
  }
}

/**
 * Checks if a contract status transition is valid based on business rules
 * @param currentStatus Current contract status
 * @param newStatus Proposed new status
 * @returns True if the transition is allowed, false otherwise
 */
export function isValidStatusTransition(currentStatus: ContractStatus, newStatus: ContractStatus): boolean {
  // Define allowed transitions for each status
  const allowedTransitions: Record<ContractStatus, ContractStatus[]> = {
    [ContractStatus.DRAFT]: [
      ContractStatus.PENDING_SIGNATURES,
      ContractStatus.TERMINATED
    ],
    [ContractStatus.PENDING_SIGNATURES]: [
      ContractStatus.PARTIALLY_SIGNED,
      ContractStatus.TERMINATED,
      ContractStatus.EXPIRED
    ],
    [ContractStatus.PARTIALLY_SIGNED]: [
      ContractStatus.SIGNED,
      ContractStatus.TERMINATED,
      ContractStatus.EXPIRED
    ],
    [ContractStatus.SIGNED]: [
      ContractStatus.ACTIVE,
      ContractStatus.TERMINATED
    ],
    [ContractStatus.ACTIVE]: [
      ContractStatus.COMPLETED,
      ContractStatus.TERMINATED
    ],
    [ContractStatus.COMPLETED]: [],
    [ContractStatus.TERMINATED]: [],
    [ContractStatus.EXPIRED]: []
  };
  
  // Check if the new status is in the allowed transitions for the current status
  return allowedTransitions[currentStatus]?.includes(newStatus) || false;
}

/**
 * Verifies that contract terms meet all legal and platform requirements
 * @param terms Contract terms to verify
 * @returns Validation result with any issues found
 */
export async function verifyContractTerms(terms: object): Promise<{valid: boolean, issues: string[]}> {
  const issues: string[] = [];
  
  // Check for required legal terms
  const requiredTerms = [
    'paymentTerms',
    'deliverables',
    'timeline',
    'usageRights',
    'termination'
  ];
  
  for (const term of requiredTerms) {
    if (!terms[term]) {
      issues.push(`Missing required term: ${term}`);
    }
  }
  
  // Validate that terms don't violate platform policies
  if (terms['exclusivity'] && typeof terms['exclusivity'] === 'object') {
    const exclusivity = terms['exclusivity'];
    
    // Check for excessive exclusivity periods
    if (exclusivity.durationDays && exclusivity.durationDays > 365) {
      issues.push('Exclusivity period exceeds maximum allowed (365 days)');
    }
    
    // Check for overly broad exclusivity scope
    if (exclusivity.scope === 'all') {
      issues.push('Unlimited exclusivity scope is not allowed');
    }
  }
  
  // Check for minimum payment amounts
  if (terms['paymentTerms'] && typeof terms['paymentTerms'] === 'object') {
    const paymentTerms = terms['paymentTerms'];
    
    if (paymentTerms.total < 100) {
      issues.push('Total payment amount must be at least $100');
    }
    
    // Validate milestone payments add up to total
    if (
      paymentTerms.milestones && 
      Array.isArray(paymentTerms.milestones) && 
      paymentTerms.milestones.length > 0
    ) {
      const milestoneTotal = paymentTerms.milestones.reduce(
        (sum, milestone) => sum + (milestone.amount || 0), 
        0
      );
      
      if (Math.abs(milestoneTotal - paymentTerms.total) > 0.01) {
        issues.push('Milestone payment amounts do not match total contract value');
      }
    }
  }
  
  // Check for potential legal issues or missing clauses
  const recommendedTerms = [
    'confidentiality',
    'intellectualProperty',
    'disputeResolution',
    'liability',
    'revisions'
  ];
  
  for (const term of recommendedTerms) {
    if (!terms[term]) {
      issues.push(`Recommended term missing: ${term}`);
    }
  }
  
  return {
    valid: issues.length === 0,
    issues
  };
}