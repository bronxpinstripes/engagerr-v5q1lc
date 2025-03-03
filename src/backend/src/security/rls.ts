/**
 * Row Level Security (RLS) Policy Manager
 * 
 * Manages Row Level Security policies for Supabase PostgreSQL database,
 * ensuring proper data access controls for different user types and roles.
 */

import { PostgrestFilterBuilder } from '@supabase/postgrest-js'; // ^1.0.0
import { client as supabase } from '../config/supabase';
import { UserType, UserRole } from '../types/user';
import { logger } from '../utils/logger';

/**
 * Applies RLS policies for creator-owned resources to ensure creators can only access their own data
 * @param tableName The database table to apply the policy to
 * @param columnName The column containing the creator ID for ownership check
 */
export async function applyCreatorRLS(tableName: string, columnName: string): Promise<void> {
  try {
    // Construct policy name for consistency
    const policyName = `creator_access_${tableName}`;
    
    // Create RLS policy using SQL (executed via admin function in Supabase)
    const { error } = await supabase.rpc('apply_rls_policy', {
      table_name: tableName,
      policy_name: policyName,
      policy_definition: `auth.uid() IN (SELECT user_id FROM creators WHERE id = ${columnName})`,
      enable_rls: true
    });
    
    if (error) {
      throw error;
    }
    
    logger.info({
      table: tableName,
      column: columnName,
      policy: policyName
    }, 'Applied creator RLS policy successfully');
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error),
      table: tableName,
      column: columnName
    }, 'Failed to apply creator RLS policy');
    
    throw error;
  }
}

/**
 * Applies RLS policies for brand-owned resources to ensure brands can only access their own data
 * @param tableName The database table to apply the policy to
 * @param columnName The column containing the brand ID for ownership check
 */
export async function applyBrandRLS(tableName: string, columnName: string): Promise<void> {
  try {
    // Construct policy name for consistency
    const policyName = `brand_access_${tableName}`;
    
    // Create RLS policy using SQL (executed via admin function in Supabase)
    const { error } = await supabase.rpc('apply_rls_policy', {
      table_name: tableName,
      policy_name: policyName,
      policy_definition: `auth.uid() IN (SELECT user_id FROM brands WHERE id = ${columnName})`,
      enable_rls: true
    });
    
    if (error) {
      throw error;
    }
    
    logger.info({
      table: tableName,
      column: columnName,
      policy: policyName
    }, 'Applied brand RLS policy successfully');
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error),
      table: tableName,
      column: columnName
    }, 'Failed to apply brand RLS policy');
    
    throw error;
  }
}

/**
 * Applies RLS policies for partnerships to ensure both creators and brands can access shared resources
 * @param tableName The database table to apply the policy to
 * @param creatorColumn The column containing the creator ID
 * @param brandColumn The column containing the brand ID
 */
export async function applyPartnershipRLS(
  tableName: string, 
  creatorColumn: string, 
  brandColumn: string
): Promise<void> {
  try {
    // Construct policy names for creator and brand access
    const creatorPolicyName = `creator_partnership_${tableName}`;
    const brandPolicyName = `brand_partnership_${tableName}`;
    
    // Create creator access policy
    const { error: creatorError } = await supabase.rpc('apply_rls_policy', {
      table_name: tableName,
      policy_name: creatorPolicyName,
      policy_definition: `auth.uid() IN (SELECT user_id FROM creators WHERE id = ${creatorColumn})`,
      enable_rls: true
    });
    
    if (creatorError) {
      throw creatorError;
    }
    
    // Create brand access policy
    const { error: brandError } = await supabase.rpc('apply_rls_policy', {
      table_name: tableName,
      policy_name: brandPolicyName,
      policy_definition: `auth.uid() IN (SELECT user_id FROM brands WHERE id = ${brandColumn})`,
      enable_rls: true
    });
    
    if (brandError) {
      throw brandError;
    }
    
    logger.info({
      table: tableName,
      creatorColumn,
      brandColumn,
      policies: [creatorPolicyName, brandPolicyName]
    }, 'Applied partnership RLS policies successfully');
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error),
      table: tableName,
      creatorColumn,
      brandColumn
    }, 'Failed to apply partnership RLS policies');
    
    throw error;
  }
}

/**
 * Applies RLS policies for team-based access, allowing team members to access resources based on their roles
 * @param tableName The database table to apply the policy to
 * @param ownerColumn The column containing the owner ID
 * @param teamColumn The column containing the team ID
 */
export async function applyTeamRLS(
  tableName: string, 
  ownerColumn: string, 
  teamColumn: string
): Promise<void> {
  try {
    // Construct policy name for team access
    const policyName = `team_access_${tableName}`;
    
    // Create policy that includes role-based restrictions
    const { error } = await supabase.rpc('apply_rls_policy', {
      table_name: tableName,
      policy_name: policyName,
      policy_definition: `
        -- Owner can access their own resources
        auth.uid() IN (
          SELECT user_id FROM creators WHERE id = ${ownerColumn}
          UNION
          SELECT user_id FROM brands WHERE id = ${ownerColumn}
        )
        OR
        -- Team members can access based on their role
        auth.uid() IN (
          SELECT tm.user_id 
          FROM team_members tm
          WHERE tm.entity_id = ${teamColumn}
          AND (
            tm.role = '${UserRole.OWNER}' OR
            tm.role = '${UserRole.ADMIN}' OR
            (tm.role = '${UserRole.MEMBER}' AND current_setting('app.operation', true) != 'DELETE') OR
            (tm.role = '${UserRole.VIEWER}' AND current_setting('app.operation', true) = 'SELECT')
          )
        )
      `,
      enable_rls: true
    });
    
    if (error) {
      throw error;
    }
    
    logger.info({
      table: tableName,
      ownerColumn,
      teamColumn,
      policy: policyName
    }, 'Applied team RLS policy successfully');
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error),
      table: tableName,
      ownerColumn,
      teamColumn
    }, 'Failed to apply team RLS policy');
    
    throw error;
  }
}

/**
 * Applies RLS policies that grant system administrators full access to specific tables
 * @param tableName The database table to apply the policy to
 */
export async function applyAdminRLS(tableName: string): Promise<void> {
  try {
    // Construct policy name for admin access
    const policyName = `admin_access_${tableName}`;
    
    // Create policy for admin access
    const { error } = await supabase.rpc('apply_rls_policy', {
      table_name: tableName,
      policy_name: policyName,
      policy_definition: `
        auth.uid() IN (
          SELECT user_id FROM user_roles WHERE role = '${UserRole.SYSTEM_ADMIN}'
        )
      `,
      enable_rls: true
    });
    
    if (error) {
      throw error;
    }
    
    logger.info({
      table: tableName,
      policy: policyName
    }, 'Applied admin RLS policy successfully');
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error),
      table: tableName
    }, 'Failed to apply admin RLS policy');
    
    throw error;
  }
}

/**
 * Applies RLS policies for publicly accessible data with optional conditions
 * @param tableName The database table to apply the policy to
 * @param conditions Optional SQL conditions for restricting public access
 */
export async function applyPublicRLS(
  tableName: string, 
  conditions: Record<string, any> = {}
): Promise<void> {
  try {
    // Construct policy name for public access
    const policyName = `public_access_${tableName}`;
    
    // Build condition clause from provided conditions
    let conditionClause = '';
    if (Object.keys(conditions).length > 0) {
      conditionClause = 'AND ' + Object.entries(conditions)
        .map(([column, value]) => {
          if (typeof value === 'string') {
            return `${column} = '${value}'`;
          }
          return `${column} = ${value}`;
        })
        .join(' AND ');
    }
    
    // Create policy for public read access
    const { error } = await supabase.rpc('apply_rls_policy', {
      table_name: tableName,
      policy_name: policyName,
      policy_definition: `true ${conditionClause}`,
      operation: 'SELECT', // Read-only for public access
      enable_rls: true
    });
    
    if (error) {
      throw error;
    }
    
    logger.info({
      table: tableName,
      conditions,
      policy: policyName
    }, 'Applied public RLS policy successfully');
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error),
      table: tableName,
      conditions
    }, 'Failed to apply public RLS policy');
    
    throw error;
  }
}

/**
 * Initializes all required RLS policies for the application's database tables
 */
export async function initializeRLSPolicies(): Promise<void> {
  try {
    logger.info('Initializing Row Level Security policies');
    
    // Creator-specific tables
    await applyCreatorRLS('content', 'creator_id');
    await applyCreatorRLS('platforms', 'creator_id');
    await applyCreatorRLS('content_metrics', 'creator_id');
    await applyCreatorRLS('audience_metrics', 'creator_id');
    await applyCreatorRLS('media_kits', 'creator_id');
    
    // Brand-specific tables
    await applyBrandRLS('campaigns', 'brand_id');
    await applyBrandRLS('brand_analytics', 'brand_id');
    await applyBrandRLS('saved_creators', 'brand_id');
    
    // Partnership tables (shared between creators and brands)
    await applyPartnershipRLS('partnerships', 'creator_id', 'brand_id');
    await applyPartnershipRLS('contracts', 'creator_id', 'brand_id');
    await applyPartnershipRLS('payments', 'creator_id', 'brand_id');
    await applyPartnershipRLS('deliverables', 'creator_id', 'brand_id');
    
    // Team-based access tables
    await applyTeamRLS('content', 'creator_id', 'team_id');
    await applyTeamRLS('campaigns', 'brand_id', 'team_id');
    await applyTeamRLS('partnerships', 'owner_id', 'team_id');
    
    // Administrative tables
    await applyAdminRLS('users');
    await applyAdminRLS('subscriptions');
    await applyAdminRLS('system_settings');
    
    // Public-facing tables
    await applyPublicRLS('creator_profiles', { is_public: true });
    await applyPublicRLS('brand_profiles', { is_public: true });
    await applyPublicRLS('media_kits', { is_public: true });
    
    logger.info('Successfully initialized all RLS policies');
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error)
    }, 'Failed to initialize RLS policies');
    
    throw error;
  }
}

/**
 * Enhances a database query with RLS-compatible filters based on the current user context
 * for programmatic access control in application code
 * 
 * @param query The Supabase query builder
 * @param userContext The current user context containing ID and type
 * @returns Modified query with RLS filters applied
 */
export function addRLSToQuery<T>(
  query: PostgrestFilterBuilder<any, any, T>,
  userContext: { id: string; userType: UserType }
): PostgrestFilterBuilder<any, any, T> {
  const { id, userType } = userContext;
  
  // Determine appropriate column for filtering based on user type
  let columnName: string;
  
  if (userType === UserType.CREATOR) {
    columnName = 'creator_id';
  } else if (userType === UserType.BRAND) {
    columnName = 'brand_id';
  } else if (userType === UserType.ADMIN) {
    // Admins don't need additional filtering - they should have full access
    return query;
  } else {
    throw new Error(`Unsupported user type: ${userType}`);
  }
  
  // Add filtering condition to query
  return query.eq(columnName, id);
}