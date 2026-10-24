import { saveAuditRecord, getAuditRecordByHash, listAuditRecords } from '../../lib/auditLedger';
import { postJiraComment, syncToJiraReleaseHub } from '../../lib/jira';
import { dispatchSlackNotification } from '../../lib/slack';
import { formatSlackBlockKit } from '../formatters';

describe('ShipIt AI Multi-Surface Integrations', () => {

  describe('1. Audit Ledger & Cryptographic Verification', () => {
    it('should persist and retrieve an audit record by tamper-proof hash', async () => {
      const testHash = 'test-sha256-hash-' + Date.now();
      const testRecord = {
        org_id: '00000000-0000-0000-0000-000000000000',
        pr_id: 'PR-TEST-1',
        pr_title: 'PROJ-999: Add Biometric Authentication',
        source_branch: 'feature/PROJ-999',
        author: 'developer@enterprise.io',
        risk_level: 'LOW',
        quality_score: 92,
        has_breaking_changes: false,
        tamper_proof_hash: testHash,
        full_synthesis_json: {
          complianceAuditLog: {
            justification: 'SOC2 verified passkey support',
            tamperProofHash: testHash
          }
        }
      };

      const saveResult = await saveAuditRecord(testRecord);
      expect(saveResult.success).toBe(true);
      expect(saveResult.record.tamper_proof_hash).toBe(testHash);

      const retrieved = await getAuditRecordByHash(testHash);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.pr_title).toBe('PROJ-999: Add Biometric Authentication');
      expect(retrieved?.tamper_proof_hash).toBe(testHash);

      const list = await listAuditRecords(5);
      expect(list.length).toBeGreaterThan(0);
      expect(list.some(r => r.tamper_proof_hash === testHash)).toBe(true);
    });

    it('should return null for non-existent hashes', async () => {
      const result = await getAuditRecordByHash('non-existent-fabricated-hash');
      expect(result).toBeNull();
    });
  });

  describe('2. Atlassian Jira Integration & Release Hubs', () => {
    it('should format and queue a Jira comment gracefully in simulated mode', async () => {
      const result = await postJiraComment('PROJ-1042', 'h2. Release Changelog\n* Test comment');
      expect(result.success).toBe(true);
      expect(result.issueKey).toBe('PROJ-1042');
      expect(result.message).toBeDefined();
    });

    it('should handle Jira Release Hub version pack sync gracefully in simulated mode', async () => {
      const result = await syncToJiraReleaseHub('PROJ', 'v2.4.0', 'Executive Release Summary for v2.4.0');
      expect(result.success).toBe(true);
      expect(result.versionName).toBe('v2.4.0');
      expect(result.projectKey).toBe('PROJ');
      expect(result.releaseNotesUrl).toContain('PROJ');
    });
  });

  describe('3. Slack Block-Kit Broadcast Integration', () => {
    it('should generate valid Block-Kit structure with header, fields, and context', () => {
      const mockPR: any = {
        title: 'PROJ-1042: Passkey Auth',
        author: 'alex.chen',
        sourceBranch: 'feature/passkey',
        targetBranch: 'main'
      };
      const mockScore: any = { overallScore: 90, gatePassed: true };
      const mockSynthesis: any = {
        productSummary: { customerValueNarrative: 'Users can now sign in with Touch ID.' },
        complianceAuditLog: { tamperProofHash: 'a1b2c3d4e5f6g7h8' }
      };

      const blockKit = formatSlackBlockKit(mockPR, mockScore, mockSynthesis) as any;
      expect(blockKit.blocks).toBeDefined();
      expect(blockKit.blocks.length).toBeGreaterThan(3);
      expect(blockKit.blocks[0].type).toBe('header');
      expect(blockKit.blocks[0].text.text).toContain('PROJ-1042: Passkey Auth');
    });

    it('should validate and operate in simulated mode when webhook url is mock or unset', async () => {
      const result = await dispatchSlackNotification(
        'https://hooks.slack.com/services/MOCK/URL',
        { blocks: [{ type: 'section', text: { type: 'mrkdwn', text: 'Test' } }] }
      );
      expect(result.success).toBe(true);
      expect(result.simulated).toBe(true);
    });
  });

});
