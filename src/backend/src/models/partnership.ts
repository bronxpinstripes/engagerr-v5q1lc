/**
 * Partnership model
 * 
 * Handles partnerships between creators and brands, including CRUD operations, validation,
 * and relationship management. Partnerships are the foundation for collaboration between
 * creators and brands on the Engagerr platform.
 */

import { prisma } from '../config/database';
import { 
  PartnershipStatus, 
  CreatePartnershipInput, 
  UpdatePartnershipInput, 
  PartnershipFilters 
} from '../types/partnership';
import { validatePartnershipData } from '../utils/validation';
import { DatabaseError, ValidationError } from '../utils/errors';

/**
 * Creates a new partnership between a creator and brand
 * @param partnershipData Partnership data to create
 * @returns The created partnership
 */
export async function createPartnership(partnershipData: CreatePartnershipInput) {
  try {
    // Validate partnership data
    const validationResult = await validatePartnershipData(partnershipData);
    if (!validationResult.success) {
      throw new ValidationError('Invalid partnership data', validationResult.errors);
    }

    // Calculate platform fee (8% of budget as defined in PLATFORM_FEES constant)
    const platformFee = Math.round((partnershipData.budget * 0.08) * 100) / 100;

    // Create the partnership record
    const partnership = await prisma.partnership.create({
      data: {
        creatorId: partnershipData.creatorId,
        brandId: partnershipData.brandId,
        campaignId: partnershipData.campaignId || null,
        title: partnershipData.title,
        description: partnershipData.description,
        status: PartnershipStatus.DRAFT,
        budget: partnershipData.budget,
        currency: partnershipData.currency,
        platformFee: platformFee,
        startDate: partnershipData.startDate,
        endDate: partnershipData.endDate,
        isPublic: partnershipData.isPublic || false,
        metadata: partnershipData.metadata || {}
      }
    });

    return partnership;
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new DatabaseError(`Failed to create partnership: ${error.message}`, { cause: error });
  }
}

/**
 * Retrieves a partnership by its ID with optional related data
 * @param id Partnership ID
 * @param includeCreator Whether to include creator data
 * @param includeBrand Whether to include brand data
 * @param includeContract Whether to include contract data
 * @param includePayments Whether to include payment data
 * @returns The partnership or null if not found
 */
export async function getPartnershipById(
  id: string,
  includeCreator: boolean = false,
  includeBrand: boolean = false,
  includeContract: boolean = false,
  includePayments: boolean = false
) {
  try {
    const include: any = {};

    if (includeCreator) {
      include.creator = {
        include: {
          user: true
        }
      };
    }

    if (includeBrand) {
      include.brand = {
        include: {
          user: true
        }
      };
    }

    if (includeContract) {
      include.contract = true;
    }

    if (includePayments) {
      include.payments = true;
    }

    const partnership = await prisma.partnership.findUnique({
      where: { id },
      include: Object.keys(include).length > 0 ? include : undefined
    });

    return partnership;
  } catch (error) {
    throw new DatabaseError(`Failed to retrieve partnership: ${error.message}`, { cause: error });
  }
}

/**
 * Retrieves partnerships based on filtering criteria
 * @param filters Filters to apply to the query
 * @param page Page number for pagination
 * @param limit Number of items per page
 * @returns Partnerships matching the criteria and total count
 */
export async function getPartnerships(
  filters: PartnershipFilters = {},
  page: number = 1,
  limit: number = 20
) {
  try {
    const where: any = {};

    // Apply filters
    if (filters.creatorId) {
      where.creatorId = filters.creatorId;
    }
    
    if (filters.brandId) {
      where.brandId = filters.brandId;
    }
    
    if (filters.campaignId) {
      where.campaignId = filters.campaignId;
    }
    
    if (filters.status) {
      where.status = filters.status;
    }
    
    if (filters.startDateRange) {
      where.startDate = {
        gte: filters.startDateRange.start,
        lte: filters.startDateRange.end
      };
    }
    
    if (filters.budgetRange) {
      where.budget = {
        gte: filters.budgetRange.min,
        lte: filters.budgetRange.max
      };
    }
    
    if (filters.isPublic !== undefined) {
      where.isPublic = filters.isPublic;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;
    const take = limit;

    // Execute query with count
    const [partnerships, total] = await Promise.all([
      prisma.partnership.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take,
        include: {
          creator: {
            select: {
              user: {
                select: {
                  fullName: true
                }
              }
            }
          },
          brand: {
            select: {
              companyName: true,
              logoImage: true
            }
          }
        }
      }),
      prisma.partnership.count({ where })
    ]);

    return {
      partnerships,
      total
    };
  } catch (error) {
    throw new DatabaseError(`Failed to retrieve partnerships: ${error.message}`, { cause: error });
  }
}

/**
 * Retrieves partnerships for a specific creator
 * @param creatorId Creator ID
 * @param status Optional status filter
 * @param page Page number for pagination
 * @param limit Number of items per page
 * @returns Partnerships for the creator and total count
 */
export async function getPartnershipsByCreator(
  creatorId: string,
  status?: PartnershipStatus,
  page: number = 1,
  limit: number = 20
) {
  try {
    const where: any = { creatorId };
    
    if (status) {
      where.status = status;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;
    const take = limit;

    // Execute query with count
    const [partnerships, total] = await Promise.all([
      prisma.partnership.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take,
        include: {
          brand: {
            select: {
              companyName: true,
              logoImage: true,
              industries: true
            }
          },
          contract: {
            select: {
              id: true,
              status: true
            }
          },
          deliverables: {
            select: {
              id: true,
              title: true,
              status: true,
              dueDate: true
            }
          },
          payments: {
            select: {
              id: true,
              amount: true,
              status: true,
              paidAt: true
            }
          }
        }
      }),
      prisma.partnership.count({ where })
    ]);

    return {
      partnerships,
      total
    };
  } catch (error) {
    throw new DatabaseError(`Failed to retrieve creator partnerships: ${error.message}`, { cause: error });
  }
}

/**
 * Retrieves partnerships for a specific brand
 * @param brandId Brand ID
 * @param status Optional status filter
 * @param page Page number for pagination
 * @param limit Number of items per page
 * @returns Partnerships for the brand and total count
 */
export async function getPartnershipsByBrand(
  brandId: string,
  status?: PartnershipStatus,
  page: number = 1,
  limit: number = 20
) {
  try {
    const where: any = { brandId };
    
    if (status) {
      where.status = status;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;
    const take = limit;

    // Execute query with count
    const [partnerships, total] = await Promise.all([
      prisma.partnership.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take,
        include: {
          creator: {
            select: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                }
              },
              profileImage: true,
              categories: true
            }
          },
          contract: {
            select: {
              id: true,
              status: true
            }
          },
          deliverables: {
            select: {
              id: true,
              title: true,
              status: true,
              dueDate: true
            }
          },
          payments: {
            select: {
              id: true,
              amount: true,
              status: true,
              paidAt: true
            }
          }
        }
      }),
      prisma.partnership.count({ where })
    ]);

    return {
      partnerships,
      total
    };
  } catch (error) {
    throw new DatabaseError(`Failed to retrieve brand partnerships: ${error.message}`, { cause: error });
  }
}

/**
 * Updates a partnership's details
 * @param id Partnership ID
 * @param updateData Data to update
 * @returns The updated partnership
 */
export async function updatePartnership(
  id: string,
  updateData: UpdatePartnershipInput
) {
  try {
    // Validate update data
    const validationResult = await validatePartnershipData(updateData, true);
    if (!validationResult.success) {
      throw new ValidationError('Invalid partnership update data', validationResult.errors);
    }

    // Check if partnership exists
    const existingPartnership = await prisma.partnership.findUnique({
      where: { id }
    });

    if (!existingPartnership) {
      throw new ValidationError('Partnership not found', { id: 'Partnership not found' });
    }

    // Recalculate platform fee if budget is updated
    let platformFee = existingPartnership.platformFee;
    if (updateData.budget && updateData.budget !== existingPartnership.budget) {
      platformFee = Math.round((updateData.budget * 0.08) * 100) / 100;
    }

    // Update partnership
    const updatedPartnership = await prisma.partnership.update({
      where: { id },
      data: {
        title: updateData.title,
        description: updateData.description,
        budget: updateData.budget,
        currency: updateData.currency,
        platformFee: platformFee,
        startDate: updateData.startDate,
        endDate: updateData.endDate,
        isPublic: updateData.isPublic,
        metadata: updateData.metadata ? {
          ...existingPartnership.metadata,
          ...updateData.metadata
        } : existingPartnership.metadata
      }
    });

    return updatedPartnership;
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new DatabaseError(`Failed to update partnership: ${error.message}`, { cause: error });
  }
}

/**
 * Updates a partnership's status
 * @param id Partnership ID
 * @param newStatus New status value
 * @returns The updated partnership
 */
export async function updatePartnershipStatus(
  id: string,
  newStatus: PartnershipStatus
) {
  try {
    // Check if partnership exists
    const existingPartnership = await prisma.partnership.findUnique({
      where: { id }
    });

    if (!existingPartnership) {
      throw new ValidationError('Partnership not found', { id: 'Partnership not found' });
    }

    // Validate status transition
    if (!isValidStatusTransition(existingPartnership.status, newStatus)) {
      throw new ValidationError('Invalid status transition', { 
        status: `Cannot transition from ${existingPartnership.status} to ${newStatus}` 
      });
    }

    // Update partnership status
    const updatedPartnership = await prisma.partnership.update({
      where: { id },
      data: {
        status: newStatus,
        // Update timestamps based on status changes
        ...(newStatus === PartnershipStatus.ACTIVE && { startedAt: new Date() }),
        ...(newStatus === PartnershipStatus.COMPLETED && { completedAt: new Date() })
      }
    });

    return updatedPartnership;
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new DatabaseError(`Failed to update partnership status: ${error.message}`, { cause: error });
  }
}

/**
 * Deletes a partnership record
 * @param id Partnership ID
 * @returns True if partnership was deleted, false if not found
 */
export async function deletePartnership(id: string) {
  try {
    // Check if partnership exists
    const existingPartnership = await prisma.partnership.findUnique({
      where: { id }
    });

    if (!existingPartnership) {
      return false;
    }

    // Delete partnership - note: this should be handled carefully for active partnerships
    // In a real implementation, we might want to add more checks or handle related records
    await prisma.partnership.delete({
      where: { id }
    });

    return true;
  } catch (error) {
    throw new DatabaseError(`Failed to delete partnership: ${error.message}`, { cause: error });
  }
}

/**
 * Checks if a status transition is valid based on business rules
 * @param currentStatus Current partnership status
 * @param newStatus Requested new status
 * @returns True if the transition is allowed, false otherwise
 */
function isValidStatusTransition(currentStatus: PartnershipStatus, newStatus: PartnershipStatus): boolean {
  // Define allowed transitions for each status
  const allowedTransitions: Record<PartnershipStatus, PartnershipStatus[]> = {
    [PartnershipStatus.DRAFT]: [
      PartnershipStatus.PROPOSAL_PENDING,
      PartnershipStatus.CANCELLED
    ],
    [PartnershipStatus.PROPOSAL_PENDING]: [
      PartnershipStatus.NEGOTIATION,
      PartnershipStatus.CONTRACT_PENDING,
      PartnershipStatus.CANCELLED
    ],
    [PartnershipStatus.NEGOTIATION]: [
      PartnershipStatus.CONTRACT_PENDING,
      PartnershipStatus.CANCELLED
    ],
    [PartnershipStatus.CONTRACT_PENDING]: [
      PartnershipStatus.ACTIVE,
      PartnershipStatus.NEGOTIATION,
      PartnershipStatus.CANCELLED
    ],
    [PartnershipStatus.ACTIVE]: [
      PartnershipStatus.COMPLETED,
      PartnershipStatus.DISPUTED,
      PartnershipStatus.CANCELLED
    ],
    [PartnershipStatus.COMPLETED]: [
      PartnershipStatus.DISPUTED
    ],
    [PartnershipStatus.CANCELLED]: [],
    [PartnershipStatus.DISPUTED]: [
      PartnershipStatus.ACTIVE,
      PartnershipStatus.COMPLETED,
      PartnershipStatus.CANCELLED
    ]
  };

  // Same status is always valid
  if (currentStatus === newStatus) {
    return true;
  }

  // Check if transition is allowed
  return allowedTransitions[currentStatus].includes(newStatus);
}