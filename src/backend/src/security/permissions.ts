/**
 * Permission Management System
 * 
 * Implements role-based access control (RBAC) and resource-based authorization
 * for the Engagerr platform. This module defines permission checking mechanisms
 * and utilities for determining user access to different resources.
 */

import { UserType, UserRole, TeamRole } from '../types/user';
import { AUTH_CONSTANTS } from '../config/constants';
import { AuthorizationError } from '../utils/errors';
import { addRLSToQuery } from './rls';
import { logger } from '../utils/logger';

/**
 * Defines the permission matrix for all resources and actions based on user roles
 */
class PermissionMatrix {
  private matrix: Record<string, Record<string, UserRole[]>> = {};

  constructor() {
    // Initialize the permission matrix with all resource types and role-based permissions

    // Creator resources
    this.matrix['creator'] = {
      view: [
        UserRole.SYSTEM_ADMIN, 
        UserRole.CREATOR_OWNER, 
        UserRole.CREATOR_MANAGER, 
        UserRole.CREATOR_ANALYST
      ],
      edit: [
        UserRole.SYSTEM_ADMIN, 
        UserRole.CREATOR_OWNER, 
        UserRole.CREATOR_MANAGER
      ],
      delete: [
        UserRole.SYSTEM_ADMIN, 
        UserRole.CREATOR_OWNER
      ]
    };
    
    // Brand resources
    this.matrix['brand'] = {
      view: [
        UserRole.SYSTEM_ADMIN, 
        UserRole.BRAND_OWNER, 
        UserRole.BRAND_MANAGER, 
        UserRole.BRAND_VIEWER
      ],
      edit: [
        UserRole.SYSTEM_ADMIN, 
        UserRole.BRAND_OWNER, 
        UserRole.BRAND_MANAGER
      ],
      delete: [
        UserRole.SYSTEM_ADMIN, 
        UserRole.BRAND_OWNER
      ]
    };
    
    // Content resources
    this.matrix['content'] = {
      view: [
        UserRole.SYSTEM_ADMIN, 
        UserRole.CREATOR_OWNER, 
        UserRole.CREATOR_MANAGER, 
        UserRole.CREATOR_ANALYST,
        UserRole.BRAND_OWNER,
        UserRole.BRAND_MANAGER,
        UserRole.BRAND_VIEWER
      ],
      create: [
        UserRole.SYSTEM_ADMIN, 
        UserRole.CREATOR_OWNER, 
        UserRole.CREATOR_MANAGER
      ],
      edit: [
        UserRole.SYSTEM_ADMIN, 
        UserRole.CREATOR_OWNER, 
        UserRole.CREATOR_MANAGER
      ],
      delete: [
        UserRole.SYSTEM_ADMIN, 
        UserRole.CREATOR_OWNER, 
        UserRole.CREATOR_MANAGER
      ],
      map: [
        UserRole.SYSTEM_ADMIN, 
        UserRole.CREATOR_OWNER, 
        UserRole.CREATOR_MANAGER
      ]
    };
    
    // Platform connection resources
    this.matrix['platform'] = {
      view: [
        UserRole.SYSTEM_ADMIN, 
        UserRole.CREATOR_OWNER, 
        UserRole.CREATOR_MANAGER, 
        UserRole.CREATOR_ANALYST
      ],
      connect: [
        UserRole.SYSTEM_ADMIN, 
        UserRole.CREATOR_OWNER, 
        UserRole.CREATOR_MANAGER
      ],
      disconnect: [
        UserRole.SYSTEM_ADMIN, 
        UserRole.CREATOR_OWNER, 
        UserRole.CREATOR_MANAGER
      ]
    };
    
    // Analytics resources
    this.matrix['analytics'] = {
      view: [
        UserRole.SYSTEM_ADMIN, 
        UserRole.CREATOR_OWNER, 
        UserRole.CREATOR_MANAGER, 
        UserRole.CREATOR_ANALYST,
        UserRole.BRAND_OWNER,
        UserRole.BRAND_MANAGER,
        UserRole.BRAND_VIEWER
      ],
      export: [
        UserRole.SYSTEM_ADMIN, 
        UserRole.CREATOR_OWNER, 
        UserRole.CREATOR_MANAGER,
        UserRole.BRAND_OWNER,
        UserRole.BRAND_MANAGER
      ]
    };
    
    // Partnership resources
    this.matrix['partnership'] = {
      view: [
        UserRole.SYSTEM_ADMIN, 
        UserRole.CREATOR_OWNER, 
        UserRole.CREATOR_MANAGER,
        UserRole.BRAND_OWNER,
        UserRole.BRAND_MANAGER,
        UserRole.BRAND_VIEWER
      ],
      create: [
        UserRole.SYSTEM_ADMIN, 
        UserRole.CREATOR_OWNER, 
        UserRole.CREATOR_MANAGER,
        UserRole.BRAND_OWNER,
        UserRole.BRAND_MANAGER
      ],
      edit: [
        UserRole.SYSTEM_ADMIN, 
        UserRole.CREATOR_OWNER, 
        UserRole.CREATOR_MANAGER,
        UserRole.BRAND_OWNER,
        UserRole.BRAND_MANAGER
      ],
      cancel: [
        UserRole.SYSTEM_ADMIN, 
        UserRole.CREATOR_OWNER,
        UserRole.BRAND_OWNER
      ]
    };
    
    // Payment resources
    this.matrix['payment'] = {
      view: [
        UserRole.SYSTEM_ADMIN, 
        UserRole.CREATOR_OWNER, 
        UserRole.CREATOR_MANAGER,
        UserRole.BRAND_OWNER,
        UserRole.BRAND_MANAGER
      ],
      initiate: [
        UserRole.SYSTEM_ADMIN,
        UserRole.BRAND_OWNER,
        UserRole.BRAND_MANAGER
      ],
      release: [
        UserRole.SYSTEM_ADMIN,
        UserRole.BRAND_OWNER,
        UserRole.BRAND_MANAGER
      ],
      refund: [
        UserRole.SYSTEM_ADMIN,
        UserRole.BRAND_OWNER
      ]
    };
    
    // Team management
    this.matrix['team'] = {
      view: [
        UserRole.SYSTEM_ADMIN, 
        UserRole.CREATOR_OWNER, 
        UserRole.CREATOR_MANAGER,
        UserRole.BRAND_OWNER,
        UserRole.BRAND_MANAGER
      ],
      invite: [
        UserRole.SYSTEM_ADMIN, 
        UserRole.CREATOR_OWNER,
        UserRole.BRAND_OWNER
      ],
      remove: [
        UserRole.SYSTEM_ADMIN, 
        UserRole.CREATOR_OWNER,
        UserRole.BRAND_OWNER
      ],
      updateRole: [
        UserRole.SYSTEM_ADMIN, 
        UserRole.CREATOR_OWNER,
        UserRole.BRAND_OWNER
      ]
    };
    
    // System-level permissions (admin only)
    this.matrix['system'] = {
      manageUsers: [UserRole.SYSTEM_ADMIN],
      manageSettings: [UserRole.SYSTEM_ADMIN],
      viewLogs: [UserRole.SYSTEM_ADMIN],
      managePermissions: [UserRole.SYSTEM_ADMIN]
    };
  }

  /**
   * Checks if a specific action is allowed for a role on a resource type
   * @param resourceType The type of resource being accessed
   * @param action The action being performed
   * @param role The user's role
   * @returns True if the action is allowed, false otherwise
   */
  public isActionAllowed(resourceType: string, action: string, role: UserRole): boolean {
    // System admin role has access to everything
    if (role === UserRole.SYSTEM_ADMIN) {
      return true;
    }
    
    // Check if the resource type exists in the matrix
    if (!this.matrix[resourceType]) {
      return false;
    }
    
    // Check if the action exists for the resource type
    if (!this.matrix[resourceType][action]) {
      return false;
    }
    
    // Check if the role is included in the allowed roles for the action
    return this.matrix[resourceType][action].includes(role);
  }

  /**
   * Gets all actions allowed for a role on a resource type
   * @param resourceType The type of resource
   * @param role The user's role
   * @returns Array of allowed action strings
   */
  public getAllowedActions(resourceType: string, role: UserRole): string[] {
    // System admin role has access to everything
    if (role === UserRole.SYSTEM_ADMIN) {
      if (this.matrix[resourceType]) {
        return Object.keys(this.matrix[resourceType]);
      }
      return [];
    }
    
    // Check if the resource type exists in the matrix
    if (!this.matrix[resourceType]) {
      return [];
    }
    
    // Find all actions where the role is allowed
    const allowedActions: string[] = [];
    
    for (const [action, allowedRoles] of Object.entries(this.matrix[resourceType])) {
      if (allowedRoles.includes(role)) {
        allowedActions.push(action);
      }
    }
    
    return allowedActions;
  }

  /**
   * Gets all resource types defined in the matrix
   * @returns Array of resource type strings
   */
  public getResourceTypes(): string[] {
    return Object.keys(this.matrix);
  }
}

// Create a singleton instance of the permission matrix
const permissionMatrix = new PermissionMatrix();

/**
 * Checks if a user has a specific permission based on their role and the resource type
 * @param user User object with role information
 * @param action The action being performed
 * @param resourceType The type of resource being accessed
 * @param resourceId Optional ID of the specific resource
 * @returns Promise resolving to true if user has permission, false otherwise
 */
export async function hasPermission(
  user: any,
  action: string,
  resourceType: string,
  resourceId?: string
): Promise<boolean> {
  // Extract user role
  const role = user.role as UserRole;
  
  // Basic role-based permission check
  const isAllowed = permissionMatrix.isActionAllowed(resourceType, action, role);
  
  // If no resource ID provided, just do the basic role check
  if (!isAllowed || !resourceId) {
    logger.debug({
      userId: user.id,
      role,
      action,
      resourceType,
      hasPermission: isAllowed
    }, 'Permission check (role-based)');
    
    return isAllowed;
  }
  
  // For specific resources, also check ownership or team access
  try {
    // Check if user is the resource owner
    const isOwner = await isResourceOwner(user, resourceType, resourceId);
    
    if (isOwner) {
      logger.debug({
        userId: user.id,
        role,
        action,
        resourceType,
        resourceId,
        hasPermission: true,
        reason: 'resource_owner'
      }, 'Permission check (owner)');
      
      return true;
    }
    
    // Check if user has team access to the resource
    const hasTeamPermission = await hasTeamAccess(user, resourceType, resourceId);
    
    logger.debug({
      userId: user.id,
      role,
      action,
      resourceType,
      resourceId,
      hasPermission: hasTeamPermission,
      reason: 'team_access'
    }, 'Permission check (team access)');
    
    return hasTeamPermission;
  } catch (error) {
    logger.warn({
      userId: user.id,
      role,
      action,
      resourceType,
      resourceId,
      error: error instanceof Error ? error.message : String(error)
    }, 'Error during permission check');
    
    return false;
  }
}

/**
 * Enforces a permission check, throwing an error if permission is denied
 * @param user User object with role information
 * @param action The action being performed
 * @param resourceType The type of resource being accessed
 * @param resourceId Optional ID of the specific resource
 * @throws AuthorizationError if permission check fails
 */
export async function checkPermission(
  user: any,
  action: string,
  resourceType: string,
  resourceId?: string
): Promise<void> {
  const permitted = await hasPermission(user, action, resourceType, resourceId);
  
  if (!permitted) {
    const errorMessage = `User ${user.id} does not have permission to ${action} ${resourceType}${resourceId ? ` (${resourceId})` : ''}`;
    
    logger.warn({
      userId: user.id,
      role: user.role,
      action,
      resourceType,
      resourceId,
      status: 'denied'
    }, 'Permission denied');
    
    throw new AuthorizationError(errorMessage, {
      userId: user.id,
      role: user.role,
      action,
      resourceType,
      resourceId
    });
  }
}

/**
 * Determines if a user is the owner of a specific resource
 * @param user User object with ID and type
 * @param resourceType The type of resource
 * @param resourceId ID of the specific resource
 * @returns Promise resolving to true if user is the resource owner, false otherwise
 */
export async function isResourceOwner(
  user: any,
  resourceType: string,
  resourceId: string
): Promise<boolean> {
  const userId = user.id;
  const userType = user.userType as UserType;
  
  // Determine which ID field to check based on user type
  let idField: string;
  
  if (userType === UserType.CREATOR) {
    idField = 'creatorId';
  } else if (userType === UserType.BRAND) {
    idField = 'brandId';
  } else if (userType === UserType.ADMIN) {
    // Admins are considered owners of all resources for this check
    return true;
  } else {
    logger.warn({
      userId,
      userType,
      resourceType,
      resourceId
    }, 'Unknown user type for resource ownership check');
    return false;
  }
  
  try {
    // Build database query for the specified resource type and ID
    const query = {
      from: resourceType,
      select: '*',
      where: {
        id: resourceId,
        [idField]: userId
      }
    };
    
    // Execute query with appropriate RLS filters
    const queryBuilder = addRLSToQuery(query, { id: userId, userType });
    const result = await queryBuilder;
    
    // Check if the resource's owner ID matches the user's ID
    const isOwner = result && result.length > 0;
    
    logger.debug({
      userId,
      userType,
      resourceType,
      resourceId,
      isOwner
    }, 'Resource ownership check');
    
    return isOwner;
  } catch (error) {
    logger.warn({
      userId,
      userType,
      resourceType,
      resourceId,
      error: error instanceof Error ? error.message : String(error)
    }, 'Error checking resource ownership');
    
    return false;
  }
}

/**
 * Checks if a user has team-based access to a resource
 * @param user User object with ID
 * @param resourceType Type of resource
 * @param resourceId ID of the specific resource
 * @param allowedRoles Optional array of team roles that have access
 * @returns Promise resolving to true if user has team access, false otherwise
 */
export async function hasTeamAccess(
  user: any,
  resourceType: string,
  resourceId: string,
  allowedRoles: TeamRole[] = []
): Promise<boolean> {
  const userId = user.id;
  
  try {
    // Build query to check team memberships related to the resource
    const query = {
      from: 'team_members',
      select: '*',
      where: {
        userId: userId,
        entityType: resourceType,
        entityId: resourceId
      }
    };
    
    // Include check for allowed team roles if provided
    if (allowedRoles.length > 0) {
      query.where['role'] = { in: allowedRoles };
    }
    
    // Execute query to see if user is a member of any team with access
    const queryBuilder = addRLSToQuery(query, { id: userId, userType: user.userType });
    const result = await queryBuilder;
    
    // User has team access if any team memberships were found
    const hasAccess = result && result.length > 0;
    
    logger.debug({
      userId,
      resourceType,
      resourceId,
      allowedRoles,
      hasTeamAccess: hasAccess
    }, 'Team access check');
    
    return hasAccess;
  } catch (error) {
    logger.warn({
      userId,
      resourceType,
      resourceId,
      allowedRoles,
      error: error instanceof Error ? error.message : String(error)
    }, 'Error checking team access');
    
    return false;
  }
}

/**
 * Gets all permissions a user has for a specific resource
 * @param user User object with role information
 * @param resourceType Type of resource
 * @param resourceId ID of the specific resource
 * @returns Promise resolving to array of actions the user can perform
 */
export async function getResourcePermissions(
  user: any,
  resourceType: string,
  resourceId: string
): Promise<string[]> {
  // Get the permission matrix for the resource type
  const role = user.role as UserRole;
  
  // Get all possible actions for the resource type
  const allActions = permissionMatrix.getAllowedActions(resourceType, role);
  
  if (allActions.length === 0) {
    return [];
  }
  
  // Check each action using hasPermission
  const permittedActions: string[] = [];
  
  for (const action of allActions) {
    const hasActionPermission = await hasPermission(user, action, resourceType, resourceId);
    
    if (hasActionPermission) {
      permittedActions.push(action);
    }
  }
  
  return permittedActions;
}

/**
 * Generates a map of resource types that a user can access based on their role
 * @param user User object with role information
 * @returns Map of resource types to allowed actions
 */
export function getUserResourceTypesMap(
  user: any
): Record<string, string[]> {
  const role = user.role as UserRole;
  const resourceTypesMap: Record<string, string[]> = {};
  
  // Get all resource types defined in the permission matrix
  const resourceTypes = permissionMatrix.getResourceTypes();
  
  // For each resource type in the permission matrix
  for (const resourceType of resourceTypes) {
    // Get allowed actions for the user's role
    const allowedActions = permissionMatrix.getAllowedActions(resourceType, role);
    
    // Add resource type and allowed actions to the map if any exist
    if (allowedActions.length > 0) {
      resourceTypesMap[resourceType] = allowedActions;
    }
  }
  
  return resourceTypesMap;
}

// Export the permission matrix for use in other modules
export { permissionMatrix };