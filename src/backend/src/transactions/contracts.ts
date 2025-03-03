/**
 * Implements contract management functionality for partnerships between creators and brands,
 * including contract generation, signing, status updates, and document handling within the Engagerr platform.
 */

import { prisma } from '../config/database'; // ^5.0.0 - Database client for contract operations
import { logger } from '../utils/logger'; // Logging service for contract operations
import { ContractStatus, CreateContractInput, UpdateContractInput } from '../types/partnership'; // Enum representing possible contract statuses, Type for contract creation payload, Type for contract update payload
import { validateSchema, schemas } from '../utils/validation'; // Validates contract data before database operations, Validation schemas for contract data
import { ApiError, ErrorCodes } from '../utils/errors'; // Custom error handling for contract operations, Error code constants for contract operations
import { getPartnershipById } from '../models/partnership'; // Retrieve partnership data for contract association
import { supabase } from '../config/supabase'; // Storage service for contract documents
import { PDFDocument } from 'pdf-lib'; // ^1.17.1 - PDF generation for contract documents
import { v4 as uuidv4 } from 'uuid'; // ^9.0.0 - Generate unique IDs for contract records

/**
 * Generates a new contract for a partnership between creator and brand
 * @param contractData - contract data
 * @returns The created contract record
 */
export const generateContract = async (contractData: CreateContractInput): Promise<any> => {
  logger.info({ contractData }, 'Attempting to generate new contract');

  // Validate the contract data using validation schema
  try {
    await validateSchema(contractData, schemas.contractSchema.omit(['id', 'status']));
  } catch (error: any) {
    logger.error({ error: error.message, details: error.details }, 'Contract data validation failed');
    throw new ApiError('Invalid contract data', 400, ErrorCodes.VALIDATION_ERROR, error.details);
  }

  // Check if a contract already exists for the partnership
  const existingContract = await prisma.contract.findFirst({
    where: {
      partnershipId: contractData.partnershipId,
    },
  });

  if (existingContract) {
    logger.error({ partnershipId: contractData.partnershipId }, 'Contract already exists for this partnership');
    throw new ApiError('Contract already exists for this partnership', 409, ErrorCodes.CONFLICT);
  }

  // Create a new contract record in the database with DRAFT status
  try {
    const contract = await prisma.contract.create({
      data: {
        partnershipId: contractData.partnershipId,
        title: contractData.title,
        terms: contractData.terms,
        status: ContractStatus.DRAFT,
        version: 1,
        effectiveDate: contractData.effectiveDate,
        expirationDate: contractData.expirationDate,
        metadata: contractData.metadata || {},
      },
    });

    logger.info({ contractId: contract.id }, 'New contract generated successfully');
    return contract;
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to create contract in database');
    throw new ApiError('Failed to create contract', 500, ErrorCodes.INTERNAL_SERVER_ERROR, { cause: error });
  }
};

/**
 * Retrieves a contract by its ID
 * @param id - id
 * @returns The contract or null if not found
 */
export const getContract = async (id: string): Promise<any | null> => {
  try {
    // Query the database for the contract with the given ID
    const contract = await prisma.contract.findUnique({
      where: { id },
    });

    if (!contract) {
      logger.warn({ contractId: id }, 'Contract not found');
      return null;
    }

    logger.info({ contractId: id }, 'Contract retrieved successfully');
    return contract;
  } catch (error: any) {
    logger.error({ error: error.message, contractId: id }, 'Failed to retrieve contract from database');
    throw new ApiError('Failed to retrieve contract', 500, ErrorCodes.INTERNAL_SERVER_ERROR, { cause: error });
  }
};

/**
 * Retrieves a contract by its associated partnership ID
 * @param partnershipId - partnershipId
 * @returns The contract or null if not found
 */
export const getContractByPartnershipId = async (partnershipId: string): Promise<any | null> => {
  try {
    // Query the database for contracts with the specified partnership ID
    const contract = await prisma.contract.findFirst({
      where: { partnershipId },
    });

    if (!contract) {
      logger.warn({ partnershipId }, 'Contract not found for partnership');
      return null;
    }

    logger.info({ partnershipId }, 'Contract retrieved successfully for partnership');
    return contract;
  } catch (error: any) {
    logger.error({ error: error.message, partnershipId }, 'Failed to retrieve contract from database by partnership ID');
    throw new ApiError('Failed to retrieve contract by partnership ID', 500, ErrorCodes.INTERNAL_SERVER_ERROR, { cause: error });
  }
};

/**
 * Updates a contract's details
 * @param id - id
 * @param updateData - updateData
 * @returns The updated contract
 */
export const updateContract = async (id: string, updateData: UpdateContractInput): Promise<any> => {
  logger.info({ contractId: id, updateData }, 'Attempting to update contract');

  // Validate the contract update data
  try {
    await validateSchema(updateData, schemas.contractSchema.partial().omit(['id', 'status', 'partnershipId']));
  } catch (error: any) {
    logger.error({ error: error.message, details: error.details }, 'Contract update data validation failed');
    throw new ApiError('Invalid contract update data', 400, ErrorCodes.VALIDATION_ERROR, error.details);
  }

  // Check if contract exists
  const existingContract = await prisma.contract.findUnique({
    where: { id },
  });

  if (!existingContract) {
    logger.error({ contractId: id }, 'Contract not found');
    throw new ApiError('Contract not found', 404, ErrorCodes.RESOURCE_NOT_FOUND);
  }

  // Check if contract is in a state that allows updates (DRAFT or PENDING_SIGNATURES)
  if (existingContract.status !== ContractStatus.DRAFT && existingContract.status !== ContractStatus.PENDING_SIGNATURES) {
    logger.error({ contractId: id, status: existingContract.status }, 'Contract cannot be updated in its current state');
    throw new ApiError('Contract cannot be updated in its current state', 400, ErrorCodes.VALIDATION_ERROR, { status: existingContract.status });
  }

  // Increment contract version if terms are being updated
  const newVersion = updateData.terms && updateData.terms !== existingContract.terms ? existingContract.version + 1 : existingContract.version;

  // Update the contract record in the database
  try {
    const updatedContract = await prisma.contract.update({
      where: { id },
      data: {
        title: updateData.title ?? existingContract.title,
        terms: updateData.terms ?? existingContract.terms,
        version: newVersion,
        effectiveDate: updateData.effectiveDate ?? existingContract.effectiveDate,
        expirationDate: updateData.expirationDate ?? existingContract.expirationDate,
        metadata: updateData.metadata ? { ...existingContract.metadata, ...updateData.metadata } : existingContract.metadata,
      },
    });

    logger.info({ contractId: id }, 'Contract updated successfully');
    return updatedContract;
  } catch (error: any) {
    logger.error({ error: error.message, contractId: id }, 'Failed to update contract in database');
    throw new ApiError('Failed to update contract', 500, ErrorCodes.INTERNAL_SERVER_ERROR, { cause: error });
  }
};

/**
 * Updates a contract's status
 * @param id - id
 * @param newStatus - newStatus
 * @returns The updated contract
 */
export const updateContractStatus = async (id: string, newStatus: ContractStatus): Promise<any> => {
  logger.info({ contractId: id, newStatus }, 'Attempting to update contract status');

  // Check if contract exists
  const existingContract = await prisma.contract.findUnique({
    where: { id },
  });

  if (!existingContract) {
    logger.error({ contractId: id }, 'Contract not found');
    throw new ApiError('Contract not found', 404, ErrorCodes.RESOURCE_NOT_FOUND);
  }

  // Get current contract status
  const currentStatus = existingContract.status;

  // Validate the status transition is allowed using isValidStatusTransition
  if (!isValidStatusTransition(currentStatus, newStatus)) {
    logger.error({ contractId: id, currentStatus, newStatus }, 'Invalid contract status transition');
    throw new ApiError('Invalid contract status transition', 400, ErrorCodes.VALIDATION_ERROR, {
      currentStatus,
      newStatus,
    });
  }

  // Update the contract status in the database
  try {
    const updatedContract = await prisma.contract.update({
      where: { id },
      data: {
        status: newStatus,
        effectiveDate: newStatus === ContractStatus.ACTIVE ? new Date() : existingContract.effectiveDate, // If status is ACTIVE, set effectiveDate to current date
      },
    });

    logger.info({ contractId: id, newStatus }, 'Contract status updated successfully');
    return updatedContract;
  } catch (error: any) {
    logger.error({ error: error.message, contractId: id, newStatus }, 'Failed to update contract status in database');
    throw new ApiError('Failed to update contract status', 500, ErrorCodes.INTERNAL_SERVER_ERROR, { cause: error });
  }
};

/**
 * Records a signature on the contract by either creator or brand
 * @param id - id
 * @param signerType - signerType
 * @param signerId - signerId
 * @returns The updated contract with signature status
 */
export const signContract = async (id: string, signerType: string, signerId: string): Promise<any> => {
  logger.info({ contractId: id, signerType, signerId }, 'Attempting to sign contract');

  // Check if contract exists
  const existingContract = await prisma.contract.findUnique({
    where: { id },
  });

  if (!existingContract) {
    logger.error({ contractId: id }, 'Contract not found');
    throw new ApiError('Contract not found', 404, ErrorCodes.RESOURCE_NOT_FOUND);
  }

  // Verify contract has PENDING_SIGNATURES or PARTIALLY_SIGNED status
  if (existingContract.status !== ContractStatus.PENDING_SIGNATURES && existingContract.status !== ContractStatus.PARTIALLY_SIGNED) {
    logger.error({ contractId: id, status: existingContract.status }, 'Contract is not in a state to be signed');
    throw new ApiError('Contract is not in a state to be signed', 400, ErrorCodes.VALIDATION_ERROR, { status: existingContract.status });
  }

  // Get partnership associated with contract
  const partnership = await getPartnershipById(existingContract.partnershipId);

  if (!partnership) {
    logger.error({ partnershipId: existingContract.partnershipId }, 'Partnership not found for contract');
    throw new ApiError('Partnership not found for contract', 404, ErrorCodes.RESOURCE_NOT_FOUND);
  }

  // Verify the signer has permission to sign this contract (is creator or brand)
  const isCreator = signerType === 'creator' && partnership.creatorId === signerId;
  const isBrand = signerType === 'brand' && partnership.brandId === signerId;

  if (!isCreator && !isBrand) {
    logger.error({ signerType, signerId, partnership }, 'Signer does not have permission to sign this contract');
    throw new ApiError('Signer does not have permission to sign this contract', 403, ErrorCodes.AUTHORIZATION_ERROR);
  }

  // Update appropriate signature field based on signerType (creatorSigned or brandSigned)
  let updatedData: any = {};
  if (isCreator) {
    updatedData = {
      creatorSigned: true,
      creatorSignedAt: new Date(),
    };
  } else if (isBrand) {
    updatedData = {
      brandSigned: true,
      brandSignedAt: new Date(),
    };
  }

  // If both parties have now signed, update status to SIGNED
  if (existingContract.creatorSigned || isCreator) {
    if (existingContract.brandSigned || isBrand) {
      updatedData.status = ContractStatus.SIGNED;
    } else {
      updatedData.status = ContractStatus.PARTIALLY_SIGNED;
    }
  } else {
    updatedData.status = ContractStatus.PARTIALLY_SIGNED;
  }

  try {
    const updatedContract = await prisma.contract.update({
      where: { id },
      data: updatedData,
    });

    logger.info({ contractId: id, signerType, signerId }, 'Contract signed successfully');
    return updatedContract;
  } catch (error: any) {
    logger.error({ error: error.message, contractId: id, signerType, signerId }, 'Failed to update contract signature in database');
    throw new ApiError('Failed to update contract signature', 500, ErrorCodes.INTERNAL_SERVER_ERROR, { cause: error });
  }
};

/**
 * Generates a PDF document for the contract and stores the URL
 * @param id - id
 * @returns URL to the generated document
 */
export const generateContractDocument = async (id: string): Promise<string> => {
  logger.info({ contractId: id }, 'Attempting to generate contract document');

  // Retrieve the contract with all related data
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
    logger.error({ contractId: id }, 'Contract not found');
    throw new ApiError('Contract not found', 404, ErrorCodes.RESOURCE_NOT_FOUND);
  }

  try {
    // Create a new PDFDocument
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();

    // Build contract content including terms, parties, deliverables, payment terms
    page.drawText(`Contract ID: ${contract.id}`);
    page.drawText(`Partnership ID: ${contract.partnershipId}`);
    page.drawText(`Title: ${contract.title}`);
    page.drawText(`Terms: ${JSON.stringify(contract.terms)}`); // Consider a more readable format
    // Add signature blocks (with actual signatures if present)
    page.drawText(`Creator Signed: ${contract.creatorSigned ? 'Yes' : 'No'}`);
    page.drawText(`Brand Signed: ${contract.brandSigned ? 'Yes' : 'No'}`);

    // Save generated PDF to buffer
    const pdfBytes = await pdfDoc.save();

    // Upload document to Supabase storage with unique filename
    const filename = `contracts/${uuidv4()}.pdf`;
    const { data, error } = await supabase.storage
      .from('contract-documents') // Ensure this bucket exists
      .upload(filename, pdfBytes, {
        contentType: 'application/pdf',
      });

    if (error) {
      logger.error({ error: error.message, contractId: id }, 'Failed to upload contract document to Supabase');
      throw new ApiError('Failed to upload contract document', 500, ErrorCodes.INTERNAL_SERVER_ERROR, { cause: error });
    }

    // Get public URL for document
    const publicURL = supabase.storage
      .from('contract-documents')
      .getPublicUrl(filename).data.publicUrl;

    // Update contract record with document URL
    await prisma.contract.update({
      where: { id },
      data: { documentUrl: publicURL },
    });

    logger.info({ contractId: id, documentUrl: publicURL }, 'Contract document generated and stored successfully');
    return publicURL;
  } catch (error: any) {
    logger.error({ error: error.message, contractId: id }, 'Failed to generate contract document');
    throw new ApiError('Failed to generate contract document', 500, ErrorCodes.INTERNAL_SERVER_ERROR, { cause: error });
  }
};

/**
 * Retrieves available contract templates for different partnership types
 * @param category - category
 * @returns Array of contract templates matching the category
 */
export const getContractTemplates = async (category: string): Promise<any[]> => {
  try {
    // Query database for contract templates matching the requested category
    // If no category provided, return all available templates
    // Return array of templates with their IDs, names, descriptions, and clauses
    return []; // Placeholder - Implement database query when templates are stored
  } catch (error: any) {
    logger.error({ error: error.message, category }, 'Failed to retrieve contract templates');
    throw new ApiError('Failed to retrieve contract templates', 500, ErrorCodes.INTERNAL_SERVER_ERROR, { cause: error });
  }
};

/**
 * Applies a contract template to generate contract terms
 * @param templateId - templateId
 * @param partnershipData - partnershipData
 * @returns Generated contract terms based on template
 */
export const applyTemplateToContract = async (templateId: string, partnershipData: any): Promise<any> => {
  try {
    // Retrieve the specified contract template
    // Throw ApiError if template doesn't exist
    // Replace template variables with partnership data
    // Customize clauses based on partnership requirements
    // Generate complete contract terms object
    // Return the generated terms
    return {}; // Placeholder - Implement template application logic
  } catch (error: any) {
    logger.error({ error: error.message, templateId, partnershipData }, 'Failed to apply contract template');
    throw new ApiError('Failed to apply contract template', 500, ErrorCodes.INTERNAL_SERVER_ERROR, { cause: error });
  }
};

/**
 * Cancels a contract that hasn't been completed
 * @param id - id
 * @param reason - reason
 * @returns The updated contract with TERMINATED status
 */
export const cancelContract = async (id: string, reason: string): Promise<any> => {
  logger.info({ contractId: id, reason }, 'Attempting to cancel contract');

  // Check if contract exists
  const existingContract = await prisma.contract.findUnique({
    where: { id },
  });

  if (!existingContract) {
    logger.error({ contractId: id }, 'Contract not found');
    throw new ApiError('Contract not found', 404, ErrorCodes.RESOURCE_NOT_FOUND);
  }

  // Verify contract is in a state that can be cancelled (not COMPLETED or already TERMINATED)
  if (existingContract.status === ContractStatus.COMPLETED || existingContract.status === ContractStatus.TERMINATED) {
    logger.error({ contractId: id, status: existingContract.status }, 'Contract cannot be cancelled in its current state');
    throw new ApiError('Contract cannot be cancelled in its current state', 400, ErrorCodes.VALIDATION_ERROR, { status: existingContract.status });
  }

  // Update contract status to TERMINATED
  try {
    const updatedContract = await prisma.contract.update({
      where: { id },
      data: {
        status: ContractStatus.TERMINATED,
        metadata: {
          ...existingContract.metadata,
          cancellationReason: reason,
        },
      },
    });

    logger.info({ contractId: id, reason }, 'Contract cancelled successfully');
    return updatedContract;
  } catch (error: any) {
    logger.error({ error: error.message, contractId: id, reason }, 'Failed to cancel contract in database');
    throw new ApiError('Failed to cancel contract', 500, ErrorCodes.INTERNAL_SERVER_ERROR, { cause: error });
  }
};

/**
 * Checks if a contract status transition is valid based on business rules
 * @param currentStatus - currentStatus
 * @param newStatus - newStatus
 * @returns True if the transition is allowed, false otherwise
 */
export const isValidStatusTransition = (currentStatus: ContractStatus, newStatus: ContractStatus): boolean => {
  // Define allowed transitions for each status
  const allowedTransitions: Record<ContractStatus, ContractStatus[]> = {
    [ContractStatus.DRAFT]: [
      ContractStatus.PENDING_SIGNATURES,
      ContractStatus.TERMINATED
    ],
    [ContractStatus.PENDING_SIGNATURES]: [
      ContractStatus.PARTIALLY_SIGNED,
      ContractStatus.TERMINATED
    ],
    [ContractStatus.PARTIALLY_SIGNED]: [
      ContractStatus.SIGNED,
      ContractStatus.TERMINATED
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

  // Same status is always valid
  if (currentStatus === newStatus) {
    return true;
  }

  // Check if transition is allowed
  return allowedTransitions[currentStatus]?.includes(newStatus) || false;
};

/**
 * Verifies that contract terms meet all legal and platform requirements
 * @param terms - terms
 * @returns Validation result with any issues found
 */
export const verifyContractTerms = async (terms: any): Promise<{ valid: boolean; issues: string[] }> => {
  try {
    // Check for required legal terms (payment terms, deliverables, timeline, etc.)
    // Validate that terms don't violate platform policies
    // Check for potential legal issues or missing clauses
    // Return validation result with list of any issues found
    return { valid: true, issues: [] }; // Placeholder - Implement terms verification logic
  } catch (error: any) {
    logger.error({ error: error.message, terms }, 'Failed to verify contract terms');
    return { valid: false, issues: [error.message] };
  }
};