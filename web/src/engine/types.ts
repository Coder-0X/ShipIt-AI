export interface GitCommit {
  hash: string;
  message: string;
  author: string;
  timestamp: string;
  filesChanged: string[];
  diffSummary?: string;
}

export interface PullRequestPayload {
  id: string;
  title: string;
  description: string;
  sourceBranch: string;
  targetBranch: string;
  author: string;
  jiraIssueKey?: string;
  commits: GitCommit[];
  rawDiff?: string;
}

export interface SecurityAndRiskAssessment {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  blastRadius: 'UI_ONLY' | 'APPLICATION_LOGIC' | 'DATABASE_SCHEMA' | 'SECURITY_AUTH' | 'INFRASTRUCTURE';
  hasBreakingChanges: boolean;
  breakingChangeDetails?: string[];
  securitySensitiveFiles: string[];
  detectedVulnerabilities: string[];
}

export interface CommitHealthScore {
  overallScore: number; // 0 - 100
  isConventional: boolean;
  hasIssueKey: boolean;
  clarityRating: 'POOR' | 'FAIR' | 'EXCELLENT';
  feedback: string[];
  gatePassed: boolean; // e.g. score >= 70
}

export interface MultiPersonaSynthesis {
  // For Product Managers, Customer Success, and Sales
  productSummary: {
    headline: string;
    customerValueNarrative: string;
    keyBenefits: string[];
    affectedUserPersonas: string[];
  };
  
  // For Lead Engineers, DevOps, and Architects
  technicalSummary: {
    architecturalImpact: string;
    changedComponents: string[];
    migrationStepsRequired: boolean;
    migrationNotes?: string;
    deprecations: string[];
  };

  // For Directors, VPs, and C-Suite
  executiveBrief: {
    oneLiner: string;
    businessObjective: string;
  };

  // For SOC2, ISO27001, HIPAA Compliance Audit
  complianceAuditLog: {
    changeType: 'FEATURE' | 'BUGFIX' | 'SECURITY_PATCH' | 'MAINTENANCE';
    justification: string;
    affectedSystems: string[];
    riskMitigation: string;
    tamperProofHash: string;
  };
}

export interface DeepAnalysisResult {
  pullRequest: PullRequestPayload;
  riskAssessment: SecurityAndRiskAssessment;
  qualityScore: CommitHealthScore;
  synthesis: MultiPersonaSynthesis;
  multiChannelFormats: {
    jiraCommentMarkdown: string;
    jiraAdfFormat?: object;
    confluenceStorageXhtml: string;
    slackBlockKitJson: object;
    emailHtml: string;
  };
  processingTimestamp: string;
  engineVersion: string;
}
