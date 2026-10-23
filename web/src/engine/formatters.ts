import { MultiPersonaSynthesis, SecurityAndRiskAssessment, CommitHealthScore, PullRequestPayload } from './types';

export function formatJiraComment(
  pr: PullRequestPayload,
  score: CommitHealthScore,
  risk: SecurityAndRiskAssessment,
  synthesis: MultiPersonaSynthesis
): string {
  const riskBadge = risk.riskLevel === 'CRITICAL' ? '🔴 CRITICAL' : risk.riskLevel === 'HIGH' ? '🟠 HIGH' : risk.riskLevel === 'MEDIUM' ? '🟡 MEDIUM' : '🟢 LOW';
  const scoreBadge = score.gatePassed ? `✅ ${score.overallScore}/100` : `⚠️ ${score.overallScore}/100 (Needs Improvement)`;

  return `h2. 🚀 ShipIt AI — Change Intelligence & Release Notes

*Quality Score:* ${scoreBadge} | *Blast Radius Risk:* ${riskBadge} | *Type:* ${synthesis.complianceAuditLog.changeType}

----

h3. 💡 Product & Business Value (For PM / Support / Sales)
* *Summary:* ${synthesis.productSummary.customerValueNarrative}
* *Key Benefits:*
${synthesis.productSummary.keyBenefits.map(b => `# ${b}`).join('\n')}
* *Target Users:* ${synthesis.productSummary.affectedUserPersonas.join(', ')}

----

h3. 🛠 Technical Architecture & Changes (For Dev / QA)
* *Architectural Note:* ${synthesis.technicalSummary.architecturalImpact}
* *Modified Components:* ${synthesis.technicalSummary.changedComponents.join(', ')}
${synthesis.technicalSummary.migrationStepsRequired ? `* {color:red}*Migration Action Required:*{color} ${synthesis.technicalSummary.migrationNotes || 'Review migration notes.'}` : ''}
${risk.hasBreakingChanges ? `* {color:orange}*Breaking Changes:*{color}\n${risk.breakingChangeDetails?.map(d => `** ${d}`).join('\n') || ''}` : ''}

----

h3. 🛡 Compliance & Audit Traceability
* *Justification:* ${synthesis.complianceAuditLog.justification}
* *Affected Systems:* ${synthesis.complianceAuditLog.affectedSystems.join(', ')}
* *Verification Hash:* \`${synthesis.complianceAuditLog.tamperProofHash}\`
`;
}

export function formatConfluenceXhtml(
  title: string,
  releaseVersion: string,
  synthesis: MultiPersonaSynthesis,
  risk: SecurityAndRiskAssessment
): string {
  return `
<h2>Release Documentation: ${releaseVersion} - ${title}</h2>
<p><strong>Executive Summary:</strong> ${synthesis.executiveBrief.oneLiner}</p>

<ac:structured-macro ac:name="info">
  <ac:rich-text-body>
    <p><strong>Business Objective:</strong> ${synthesis.executiveBrief.businessObjective}</p>
  </ac:rich-text-body>
</ac:structured-macro>

<h3>Customer-Facing Enhancements</h3>
<p>${synthesis.productSummary.customerValueNarrative}</p>
<ul>
  ${synthesis.productSummary.keyBenefits.map(b => `<li>${b}</li>`).join('')}
</ul>

<h3>Technical & Infrastructure Notes</h3>
<p>${synthesis.technicalSummary.architecturalImpact}</p>
<ul>
  ${synthesis.technicalSummary.changedComponents.map(c => `<li><code>${c}</code></li>`).join('')}
</ul>

<h3>Security & Compliance Sign-off</h3>
<table>
  <tr><th>Risk Level</th><td>${risk.riskLevel}</td></tr>
  <tr><th>Blast Radius</th><td>${risk.blastRadius}</td></tr>
  <tr><th>Audit Reference</th><td><code>${synthesis.complianceAuditLog.tamperProofHash}</code></td></tr>
</table>
`;
}

export function formatSlackBlockKit(
  pr: PullRequestPayload,
  score: CommitHealthScore,
  synthesis: MultiPersonaSynthesis
): object {
  return {
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `🚀 ShipIt AI: ${pr.title}`,
          emoji: true
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Author:*\n${pr.author}`
          },
          {
            type: 'mrkdwn',
            text: `*Quality Score:*\n${score.overallScore}/100 ${score.gatePassed ? '✅' : '⚠️'}`
          }
        ]
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*💡 Plain English Summary:*\n${synthesis.productSummary.customerValueNarrative}`
        }
      },
      {
        type: 'divider'
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `*Branch:* \`${pr.sourceBranch}\` ➔ \`${pr.targetBranch}\` | *Audit Hash:* \`${synthesis.complianceAuditLog.tamperProofHash.slice(0, 10)}\``
          }
        ]
      }
    ]
  };
}
