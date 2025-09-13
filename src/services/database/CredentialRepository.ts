/**
 * Database repository for compliance credentials
 * Handles all database operations for credential storage and retrieval
 *
 * @since 1.0.0
 */

import { SupabaseClient } from '@supabase/supabase-js';
import type {
  ComplianceCredential,
  CredentialSearchParams,
  CredentialSearchResponse,
  CredentialTimelineEntry,
} from '@/types/compliance';
import { DB_TABLES } from '@/config/database';
import { logger } from '@/lib/logger';

/**
 * Database schema for credentials table
 */
interface CredentialRow {
  id: string;
  product_id: string;
  issuer: string;
  issued_at: string;
  expires_at: string | null;
  status: string;
  credential_type: string;
  metadata: any;
  signature: string;
  hcs_message_id: string;
  transaction_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Repository class for credential database operations
 */
export class CredentialRepository {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Store a new credential in the database
   */
  async create(credential: ComplianceCredential): Promise<void> {
    const credentialRow: Omit<CredentialRow, 'created_at' | 'updated_at'> = {
      id: credential.id,
      product_id: credential.productId,
      issuer: credential.issuer,
      issued_at: credential.issuedAt.toISOString(),
      expires_at: credential.expiresAt?.toISOString() || null,
      status: credential.status,
      credential_type: credential.credentialType,
      metadata: credential.metadata,
      signature: credential.signature,
      hcs_message_id: credential.hcsMessageId,
      transaction_id: credential.transactionId || null,
    };

    const { error } = await this.supabase
      .from(DB_TABLES.CREDENTIALS)
      .insert(credentialRow);

    if (error) {
      logger.error('Failed to create credential in database', error, {
        credentialId: credential.id,
        productId: credential.productId,
      });
      throw new Error(`Database insert failed: ${error.message}`);
    }

    logger.info('Credential stored in database', {
      credentialId: credential.id,
      productId: credential.productId,
    });
  }

  /**
   * Retrieve a credential by ID
   */
  async findById(id: string): Promise<ComplianceCredential | null> {
    const { data, error } = await this.supabase
      .from(DB_TABLES.CREDENTIALS)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      logger.error('Failed to retrieve credential from database', error, {
        credentialId: id,
      });
      throw new Error(`Database query failed: ${error.message}`);
    }

    return this.mapRowToCredential(data);
  }

  /**
   * Search credentials with filters and pagination
   */
  async search(
    params: CredentialSearchParams
  ): Promise<CredentialSearchResponse> {
    let query = this.supabase
      .from(DB_TABLES.CREDENTIALS)
      .select('*', { count: 'exact' });

    // Apply filters
    if (params.productId) {
      query = query.eq('product_id', params.productId);
    }
    if (params.credentialType) {
      query = query.eq('credential_type', params.credentialType);
    }
    if (params.status) {
      query = query.eq('status', params.status);
    }
    if (params.issuer) {
      query = query.eq('issuer', params.issuer);
    }
    if (params.issuedAfter) {
      query = query.gte('issued_at', params.issuedAfter.toISOString());
    }
    if (params.issuedBefore) {
      query = query.lte('issued_at', params.issuedBefore.toISOString());
    }

    // Apply sorting
    const sortBy = params.sortBy || 'issued_at';
    const sortOrder = params.sortOrder || 'desc';
    query = query.order(this.mapSortField(sortBy), {
      ascending: sortOrder === 'asc',
    });

    // Apply pagination
    const limit = params.limit || 20;
    const offset = params.offset || 0;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      logger.error('Failed to search credentials in database', error, {
        params,
      });
      throw new Error(`Database search failed: ${error.message}`);
    }

    const credentials = data?.map(row => this.mapRowToCredential(row)) || [];

    return {
      credentials,
      totalCount: count || 0,
      pagination: {
        limit,
        offset,
        hasMore: (count || 0) > offset + credentials.length,
      },
    };
  }

  /**
   * Find credentials by product ID
   */
  async findByProductId(productId: string): Promise<ComplianceCredential[]> {
    const { data, error } = await this.supabase
      .from(DB_TABLES.CREDENTIALS)
      .select('*')
      .eq('product_id', productId)
      .order('issued_at', { ascending: false });

    if (error) {
      logger.error('Failed to retrieve credentials by product ID', error, {
        productId,
      });
      throw new Error(`Database query failed: ${error.message}`);
    }

    return data?.map(row => this.mapRowToCredential(row)) || [];
  }

  /**
   * Update credential status
   */
  async updateStatus(id: string, status: string): Promise<void> {
    const { error } = await this.supabase
      .from(DB_TABLES.CREDENTIALS)
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      logger.error('Failed to update credential status', error, {
        credentialId: id,
        newStatus: status,
      });
      throw new Error(`Database update failed: ${error.message}`);
    }

    logger.info('Credential status updated', {
      credentialId: id,
      newStatus: status,
    });
  }

  /**
   * Count credentials for a product (for limit validation)
   */
  async countByProductId(productId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from(DB_TABLES.CREDENTIALS)
      .select('*', { count: 'exact', head: true })
      .eq('product_id', productId);

    if (error) {
      logger.error('Failed to count credentials by product ID', error, {
        productId,
      });
      throw new Error(`Database count failed: ${error.message}`);
    }

    return count || 0;
  }

  /**
   * Delete a credential (soft delete by updating status)
   */
  async delete(id: string): Promise<void> {
    await this.updateStatus(id, 'revoked');
  }

  /**
   * Add timeline entry for credential event
   */
  async addTimelineEntry(entry: CredentialTimelineEntry): Promise<void> {
    const { error } = await this.supabase
      .from(DB_TABLES.CREDENTIAL_TIMELINE)
      .insert({
        id: entry.id,
        credential_id: entry.credentialId,
        event_type: entry.eventType,
        timestamp: entry.timestamp.toISOString(),
        actor: entry.actor,
        description: entry.description,
        data: entry.data,
      });

    if (error) {
      logger.error('Failed to add credential timeline entry', error, {
        credentialId: entry.credentialId,
        eventType: entry.eventType,
      });
      throw new Error(`Timeline insert failed: ${error.message}`);
    }
  }

  /**
   * Get timeline entries for a credential
   */
  async getTimeline(credentialId: string): Promise<CredentialTimelineEntry[]> {
    const { data, error } = await this.supabase
      .from(DB_TABLES.CREDENTIAL_TIMELINE)
      .select('*')
      .eq('credential_id', credentialId)
      .order('timestamp', { ascending: false });

    if (error) {
      logger.error('Failed to retrieve credential timeline', error, {
        credentialId,
      });
      throw new Error(`Database query failed: ${error.message}`);
    }

    return (
      data?.map(row => ({
        id: row.id,
        credentialId: row.credential_id,
        eventType: row.event_type,
        timestamp: new Date(row.timestamp),
        actor: row.actor,
        description: row.description,
        data: row.data,
      })) || []
    );
  }

  /**
   * Map database row to credential object
   */
  private mapRowToCredential(row: CredentialRow): ComplianceCredential {
    return {
      id: row.id,
      productId: row.product_id,
      issuer: row.issuer,
      issuedAt: new Date(row.issued_at),
      expiresAt: row.expires_at ? new Date(row.expires_at) : null,
      status: row.status as any,
      credentialType: row.credential_type as any,
      metadata: row.metadata,
      signature: row.signature,
      hcsMessageId: row.hcs_message_id,
      transactionId: row.transaction_id || undefined,
    };
  }

  /**
   * Map API sort field to database column
   */
  private mapSortField(sortBy: string): string {
    const mapping: Record<string, string> = {
      issuedAt: 'issued_at',
      expiresAt: 'expires_at',
      status: 'status',
    };
    return mapping[sortBy] || 'issued_at';
  }
}
