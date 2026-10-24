import fs from 'fs';
import path from 'path';
import { supabaseAdmin } from './supabaseAdmin';

export interface AuditRecord {
  id?: string;
  org_id: string;
  pr_id: string;
  pr_title: string;
  source_branch: string;
  author: string;
  risk_level: string;
  quality_score: number;
  has_breaking_changes: boolean;
  tamper_proof_hash: string;
  full_synthesis_json: any;
  created_at?: string;
}

const LOCAL_DATA_DIR = path.join(process.cwd(), '.data');
const LOCAL_AUDIT_FILE = path.join(LOCAL_DATA_DIR, 'audit_ledger.json');

function ensureLocalLedgerExists(): void {
  try {
    if (!fs.existsSync(LOCAL_DATA_DIR)) {
      fs.mkdirSync(LOCAL_DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(LOCAL_AUDIT_FILE)) {
      fs.writeFileSync(LOCAL_AUDIT_FILE, JSON.stringify([], null, 2), 'utf8');
    }
  } catch (err) {
    console.error('[AuditLedger] Failed to initialize local ledger file:', err);
  }
}

function readLocalLedger(): AuditRecord[] {
  ensureLocalLedgerExists();
  try {
    if (fs.existsSync(LOCAL_AUDIT_FILE)) {
      const data = fs.readFileSync(LOCAL_AUDIT_FILE, 'utf8');
      return JSON.parse(data || '[]');
    }
  } catch (err) {
    console.error('[AuditLedger] Failed reading local ledger:', err);
  }
  return [];
}

function writeLocalLedger(records: AuditRecord[]): void {
  ensureLocalLedgerExists();
  try {
    fs.writeFileSync(LOCAL_AUDIT_FILE, JSON.stringify(records, null, 2), 'utf8');
  } catch (err) {
    console.error('[AuditLedger] Failed writing to local ledger:', err);
  }
}

function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return Boolean(
    url &&
    key &&
    !url.includes('mock.supabase.co') &&
    key !== 'mock-service-key'
  );
}

/**
 * Persists an audit record to Supabase if configured, with resilient local persistent ledger backup.
 */
export async function saveAuditRecord(record: AuditRecord): Promise<{ success: boolean; storage: 'supabase' | 'local_fallback'; record: AuditRecord }> {
  const preparedRecord: AuditRecord = {
    ...record,
    id: record.id || `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    created_at: record.created_at || new Date().toISOString()
  };

  // 1. Always write to local ledger for zero-loss audit durability
  try {
    const existing = readLocalLedger();
    const index = existing.findIndex(r => r.tamper_proof_hash === preparedRecord.tamper_proof_hash);
    if (index >= 0) {
      existing[index] = preparedRecord;
    } else {
      existing.unshift(preparedRecord);
    }
    writeLocalLedger(existing);
  } catch (localErr) {
    console.warn('[AuditLedger] Local ledger write warning:', localErr);
  }

  // 2. Write to Supabase if live credentials exist
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabaseAdmin
        .from('pull_request_audits')
        .insert({
          org_id: preparedRecord.org_id,
          pr_id: preparedRecord.pr_id,
          pr_title: preparedRecord.pr_title,
          source_branch: preparedRecord.source_branch,
          author: preparedRecord.author,
          risk_level: preparedRecord.risk_level,
          quality_score: preparedRecord.quality_score,
          has_breaking_changes: preparedRecord.has_breaking_changes,
          tamper_proof_hash: preparedRecord.tamper_proof_hash,
          full_synthesis_json: preparedRecord.full_synthesis_json
        })
        .select()
        .single();

      if (error) {
        console.warn('[AuditLedger] Supabase insertion error, retained in local ledger:', error.message);
        return { success: true, storage: 'local_fallback', record: preparedRecord };
      }

      return { success: true, storage: 'supabase', record: data || preparedRecord };
    } catch (sbErr: any) {
      console.warn('[AuditLedger] Supabase network/auth error, retained in local ledger:', sbErr.message);
      return { success: true, storage: 'local_fallback', record: preparedRecord };
    }
  }

  return { success: true, storage: 'local_fallback', record: preparedRecord };
}

/**
 * Retrieves an audit record by its cryptographic tamper-proof SHA-256 hash.
 */
export async function getAuditRecordByHash(hash: string): Promise<AuditRecord | null> {
  if (!hash) return null;

  // 1. Try Supabase if configured
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabaseAdmin
        .from('pull_request_audits')
        .select('*')
        .eq('tamper_proof_hash', hash)
        .single();

      if (!error && data) {
        return data as AuditRecord;
      }
    } catch (sbErr) {
      console.warn('[AuditLedger] Supabase lookup failed, trying local ledger:', sbErr);
    }
  }

  // 2. Check local persistent ledger
  const localRecords = readLocalLedger();
  const match = localRecords.find(r => r.tamper_proof_hash.toLowerCase() === hash.toLowerCase());
  return match || null;
}

/**
 * Lists the most recent audit records from Supabase or the local ledger.
 */
export async function listAuditRecords(limit: number = 20): Promise<AuditRecord[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabaseAdmin
        .from('pull_request_audits')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (!error && data && data.length > 0) {
        return data as AuditRecord[];
      }
    } catch (sbErr) {
      console.warn('[AuditLedger] Failed to fetch audits from Supabase, loading local:', sbErr);
    }
  }

  const localRecords = readLocalLedger();
  return localRecords.slice(0, limit);
}
