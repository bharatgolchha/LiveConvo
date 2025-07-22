import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx';

interface Participant {
  name: string;
  role?: string;
  keyContributions?: string[];
  commitments?: Array<{ task: string; dueDate?: string }>;
}

interface EffectivenessScore {
  overall: number;
  breakdown?: Record<string, number>;
  strengths?: string[];
  improvements?: (string | { area: string; better?: string; how?: string })[];
}

interface RiskItem {
  risk: string;
  impact: string;
  probability: string;
}

interface FollowUpStrategy {
  immediate_actions?: string[];
  short_term?: string[];
}

interface ReportSummary {
  tldr: string;
  effectiveness: {
    overall: number;
  };
  keyDecisions?: (string | { decision: string; rationale?: string })[];
  actionItems: (string | {
    description?: string;
    action?: string;
    task?: string;
    owner?: string;
    dueDate?: string;
    deadline?: string;
    priority?: string;
  })[];
  insights?: (string | { observation: string; recommendation?: string })[];
  participants?: Participant[];
  riskAssessment?: {
    immediate?: RiskItem[];
  };
  follow_up_strategy?: FollowUpStrategy;
  effectivenessScore?: EffectivenessScore;
}

interface Report {
  title: string;
  type: string;
  startedAt: string;
  duration: number;
  participants: {
    me: string;
    them: string;
  };
  summary: ReportSummary;
  analytics: {
    wordCount: number;
  };
}

interface ReportExportOptions {
  report: Report;
  includeTimestamp?: boolean;
}

export async function exportReportToDocx(options: ReportExportOptions): Promise<void> {
  const { report, includeTimestamp = true } = options;
  
  const children: (Paragraph | Table)[] = [];
  
  // Helper function to format duration
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  // Helper function to get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'EF4444';
      case 'medium': return 'FB923C';
      case 'low': return '22C55E';
      default: return '6B7280';
    }
  };
  
  // Title
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: report.title,
          bold: true,
          size: 32
        })
      ],
      heading: HeadingLevel.TITLE,
      spacing: { after: 200 }
    })
  );
  
  // Meeting type badge
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `${report.type.toUpperCase()} `,
          bold: true,
          size: 20,
          color: '6B7280'
        })
      ],
      spacing: { after: 300 }
    })
  );
  
  // Meeting metadata table
  const metadataRows = [
    new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({
            children: [new TextRun({ text: "Date:", bold: true })]
          })],
          width: { size: 25, type: WidthType.PERCENTAGE }
        }),
        new TableCell({
          children: [new Paragraph({
            children: [new TextRun({
              text: new Date(report.startedAt).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })
            })]
          })],
          width: { size: 75, type: WidthType.PERCENTAGE }
        })
      ]
    }),
    new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({
            children: [new TextRun({ text: "Duration:", bold: true })]
          })]
        }),
        new TableCell({
          children: [new Paragraph({
            children: [new TextRun({ text: formatDuration(report.duration) })]
          })]
        })
      ]
    }),
    new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({
            children: [new TextRun({ text: "Participants:", bold: true })]
          })]
        }),
        new TableCell({
          children: [new Paragraph({
            children: [new TextRun({ text: `${report.participants.me} & ${report.participants.them}` })]
          })]
        })
      ]
    }),
    new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({
            children: [new TextRun({ text: "Effectiveness:", bold: true })]
          })]
        }),
        new TableCell({
          children: [new Paragraph({
            children: [new TextRun({ 
              text: `${report.summary.effectiveness.overall}%`,
              bold: true,
              color: report.summary.effectiveness.overall >= 80 ? '22C55E' : 
                     report.summary.effectiveness.overall >= 60 ? 'FB923C' : 'EF4444'
            })]
          })]
        })
      ]
    })
  ];
  
  if (includeTimestamp) {
    metadataRows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({ text: "Generated:", bold: true })]
            })]
          }),
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({ text: new Date().toLocaleString() })]
            })]
          })
        ]
      })
    );
  }
  
  children.push(
    new Table({
      rows: metadataRows,
      width: { size: 100, type: WidthType.PERCENTAGE }
    }),
    new Paragraph({ children: [], spacing: { after: 400 } })
  );
  
  // Executive Summary
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "Executive Summary",
          bold: true,
          size: 24,
          color: "92400E"
        })
      ],
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 200, after: 200 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: report.summary.tldr,
          size: 22
        })
      ],
      spacing: { after: 400 },
      shading: {
        type: 'clear',
        fill: 'FEF3C7'
      },
      indent: {
        left: 720,
        right: 720
      }
    })
  );
  
  // Quick Statistics
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "Meeting Statistics",
          bold: true,
          size: 24
        })
      ],
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 }
    })
  );
  
  const statsTable = new Table({
    rows: [
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Words Spoken", bold: true })] })],
            width: { size: 25, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: report.analytics.wordCount.toLocaleString() })] })],
            width: { size: 25, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Key Decisions", bold: true })] })],
            width: { size: 25, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: `${report.summary.keyDecisions?.length || 0}` })] })],
            width: { size: 25, type: WidthType.PERCENTAGE }
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Action Items", bold: true })] })]
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: `${report.summary.actionItems.length}` })] })]
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Speaking Balance", bold: true })] })]
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: `${report.analytics.speakingTime.me}% / ${report.analytics.speakingTime.them}%` })] })]
          })
        ]
      })
    ],
    width: { size: 100, type: WidthType.PERCENTAGE }
  });
  
  children.push(statsTable, new Paragraph({ children: [], spacing: { after: 400 } }));
  
  // Key Decisions
  if (report.summary.keyDecisions && report.summary.keyDecisions.length > 0) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Key Decisions",
            bold: true,
            size: 24
          })
        ],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 }
      })
    );
    
    report.summary.keyDecisions.forEach((decision, index) => {
      const decisionText = typeof decision === 'string' ? decision : decision.decision;
      
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${index + 1}. `,
              bold: true,
              size: 22
            }),
            new TextRun({
              text: decisionText,
              size: 22
            })
          ],
          spacing: { after: 100 },
          numbering: {
            reference: "decisions",
            level: 0
          }
        })
      );
      
      if (typeof decision !== 'string' && decision.rationale) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: "Rationale: ",
                bold: true,
                size: 20,
                italics: true,
                color: "6B7280"
              }),
              new TextRun({
                text: decision.rationale,
                size: 20,
                italics: true,
                color: "6B7280"
              })
            ],
            indent: { left: 720 },
            spacing: { after: 200 }
          })
        );
      }
    });
    
    children.push(new Paragraph({ children: [], spacing: { after: 400 } }));
  }
  
  // Action Items
  if (report.summary.actionItems.length > 0) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Action Items & Next Steps",
            bold: true,
            size: 24
          })
        ],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 }
      })
    );
    
    const actionItemsRows = report.summary.actionItems.map((item) => {
      const itemText = typeof item === 'string' ? item : (item.description || item.action || item.task);
      const cells = [
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: itemText })] })],
          width: { size: 50, type: WidthType.PERCENTAGE }
        })
      ];
      
      if (typeof item !== 'string') {
        cells.push(
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: item.owner || 'Unassigned' })] })],
            width: { size: 20, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: item.dueDate || item.deadline || 'No deadline' })] })],
            width: { size: 20, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ 
              children: [new TextRun({ 
                text: (item.priority || 'medium').toUpperCase(),
                bold: true,
                color: getPriorityColor(item.priority || 'medium')
              })] 
            })],
            width: { size: 10, type: WidthType.PERCENTAGE }
          })
        );
      } else {
        cells.push(
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '-' })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '-' })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '-' })] })] })
        );
      }
      
      return new TableRow({ children: cells });
    });
    
    // Add header row
    actionItemsRows.unshift(
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Action Item", bold: true })] })],
            shading: { type: 'clear', fill: 'F3F4F6' }
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Owner", bold: true })] })],
            shading: { type: 'clear', fill: 'F3F4F6' }
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Due Date", bold: true })] })],
            shading: { type: 'clear', fill: 'F3F4F6' }
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Priority", bold: true })] })],
            shading: { type: 'clear', fill: 'F3F4F6' }
          })
        ]
      })
    );
    
    children.push(
      new Table({
        rows: actionItemsRows,
        width: { size: 100, type: WidthType.PERCENTAGE }
      }),
      new Paragraph({ children: [], spacing: { after: 400 } })
    );
  }
  
  // Strategic Insights
  if (report.summary.insights && report.summary.insights.length > 0) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Strategic Insights",
            bold: true,
            size: 24
          })
        ],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 }
      })
    );
    
    report.summary.insights.forEach((insight, index) => {
      const insightText = typeof insight === 'string' ? insight : insight.observation;
      
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Insight ${index + 1}: `,
              bold: true,
              size: 22,
              color: "3B82F6"
            }),
            new TextRun({
              text: insightText,
              size: 22
            })
          ],
          spacing: { after: 100 }
        })
      );
      
      if (typeof insight !== 'string' && insight.recommendation) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: "→ ",
                bold: true,
                size: 20,
                color: "22C55E"
              }),
              new TextRun({
                text: insight.recommendation,
                size: 20,
                italics: true,
                color: "22C55E"
              })
            ],
            indent: { left: 720 },
            spacing: { after: 200 }
          })
        );
      }
    });
    
    children.push(new Paragraph({ children: [], spacing: { after: 400 } }));
  }
  
  // Participant Contributions
  if (report.summary.participants && report.summary.participants.length > 0) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Participant Contributions",
            bold: true,
            size: 24
          })
        ],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 }
      })
    );
    
    report.summary.participants.forEach((participant) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: participant.name,
              bold: true,
              size: 22
            }),
            new TextRun({
              text: participant.role ? ` (${participant.role})` : '',
              size: 20,
              italics: true,
              color: "6B7280"
            })
          ],
          spacing: { after: 100 }
        })
      );
      
      if (participant.keyContributions && participant.keyContributions.length > 0) {
        participant.keyContributions.forEach((contribution: string) => {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `• ${contribution}`,
                  size: 20
                })
              ],
              indent: { left: 360 },
              spacing: { after: 50 }
            })
          );
        });
      }
      
      if (participant.commitments && participant.commitments.length > 0) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: "Commitments:",
                bold: true,
                size: 20,
                italics: true
              })
            ],
            indent: { left: 360 },
            spacing: { before: 100, after: 50 }
          })
        );
        
        participant.commitments.forEach((commitment) => {
          const commitmentText = typeof commitment === 'string' ? commitment : commitment.commitment;
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `- ${commitmentText}`,
                  size: 20
                })
              ],
              indent: { left: 720 },
              spacing: { after: 50 }
            })
          );
        });
      }
      
      children.push(new Paragraph({ children: [], spacing: { after: 200 } }));
    });
  }
  
  // Performance Analysis
  if (report.summary.effectivenessScore) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Performance Analysis",
            bold: true,
            size: 24
          })
        ],
        heading: HeadingLevel.HEADING_1,
        pageBreakBefore: true,
        spacing: { before: 0, after: 200 }
      })
    );
    
    // Overall score
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Overall Effectiveness: ",
            size: 22
          }),
          new TextRun({
            text: `${report.summary.effectivenessScore.overall}%`,
            bold: true,
            size: 26,
            color: report.summary.effectivenessScore.overall >= 80 ? '22C55E' : 
                   report.summary.effectivenessScore.overall >= 60 ? 'FB923C' : 'EF4444'
          })
        ],
        spacing: { after: 200 }
      })
    );
    
    // Breakdown scores
    if (report.summary.effectivenessScore.breakdown) {
      const breakdownRows = Object.entries(report.summary.effectivenessScore.breakdown).map(([key, value]: [string, number]) => {
        const label = key.replace(/([A-Z])/g, ' $1').trim();
        return new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: label, bold: true })] })],
              width: { size: 70, type: WidthType.PERCENTAGE }
            }),
            new TableCell({
              children: [new Paragraph({ 
                children: [new TextRun({ 
                  text: `${value}%`,
                  bold: true,
                  color: value >= 80 ? '22C55E' : value >= 60 ? 'FB923C' : 'EF4444'
                })] 
              })],
              width: { size: 30, type: WidthType.PERCENTAGE }
            })
          ]
        });
      });
      
      children.push(
        new Table({
          rows: breakdownRows,
          width: { size: 100, type: WidthType.PERCENTAGE }
        }),
        new Paragraph({ children: [], spacing: { after: 300 } })
      );
    }
    
    // Strengths
    if (report.summary.effectivenessScore.strengths && report.summary.effectivenessScore.strengths.length > 0) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "Key Strengths",
              bold: true,
              size: 22,
              color: "22C55E"
            })
          ],
          spacing: { after: 100 }
        })
      );
      
      report.summary.effectivenessScore.strengths.forEach((strength: string) => {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `✓ ${strength}`,
                size: 20
              })
            ],
            spacing: { after: 50 }
          })
        );
      });
      
      children.push(new Paragraph({ children: [], spacing: { after: 200 } }));
    }
    
    // Areas for improvement
    if (report.summary.effectivenessScore.improvements && report.summary.effectivenessScore.improvements.length > 0) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "Areas for Improvement",
              bold: true,
              size: 22,
              color: "FB923C"
            })
          ],
          spacing: { after: 100 }
        })
      );
      
      report.summary.effectivenessScore.improvements.forEach((improvement) => {
        if (typeof improvement === 'string') {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `→ ${improvement}`,
                  size: 20
                })
              ],
              spacing: { after: 50 }
            })
          );
        } else {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: improvement.area,
                  bold: true,
                  size: 20
                })
              ],
              spacing: { after: 50 }
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: improvement.better || improvement.how,
                  size: 18,
                  color: "6B7280"
                })
              ],
              indent: { left: 360 },
              spacing: { after: 100 }
            })
          );
        }
      });
    }
  }
  
  // Risk Assessment
  if (report.summary.riskAssessment && report.summary.riskAssessment.immediate && report.summary.riskAssessment.immediate.length > 0) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Risk Assessment",
            bold: true,
            size: 24,
            color: "EF4444"
          })
        ],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 }
      })
    );
    
    const riskRows = report.summary.riskAssessment.immediate.map((risk) => {
      return new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: risk.risk })] })],
            width: { size: 40, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ 
              children: [new TextRun({ 
                text: risk.impact.toUpperCase(),
                bold: true,
                color: risk.impact === 'high' ? 'EF4444' : risk.impact === 'medium' ? 'FB923C' : '22C55E'
              })] 
            })],
            width: { size: 15, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ 
              children: [new TextRun({ 
                text: risk.probability.toUpperCase(),
                bold: true,
                color: risk.probability === 'high' ? 'EF4444' : risk.probability === 'medium' ? 'FB923C' : '22C55E'
              })] 
            })],
            width: { size: 15, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: risk.mitigation })] })],
            width: { size: 30, type: WidthType.PERCENTAGE }
          })
        ]
      });
    });
    
    // Add header row
    riskRows.unshift(
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Risk", bold: true })] })],
            shading: { type: 'clear', fill: 'FEE2E2' }
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Impact", bold: true })] })],
            shading: { type: 'clear', fill: 'FEE2E2' }
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Probability", bold: true })] })],
            shading: { type: 'clear', fill: 'FEE2E2' }
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Mitigation", bold: true })] })],
            shading: { type: 'clear', fill: 'FEE2E2' }
          })
        ]
      })
    );
    
    children.push(
      new Table({
        rows: riskRows,
        width: { size: 100, type: WidthType.PERCENTAGE }
      }),
      new Paragraph({ children: [], spacing: { after: 400 } })
    );
  }
  
  // Follow-up Strategy
  if (report.summary.follow_up_strategy) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Follow-up Strategy",
            bold: true,
            size: 24
          })
        ],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 }
      })
    );
    
    if (report.summary.follow_up_strategy.immediate_actions && report.summary.follow_up_strategy.immediate_actions.length > 0) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "Within 24 Hours",
              bold: true,
              size: 22,
              color: "EF4444"
            })
          ],
          spacing: { after: 100 }
        })
      );
      
      report.summary.follow_up_strategy.immediate_actions.forEach((action: string) => {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `• ${action}`,
                size: 20
              })
            ],
            indent: { left: 360 },
            spacing: { after: 50 }
          })
        );
      });
      
      children.push(new Paragraph({ children: [], spacing: { after: 200 } }));
    }
    
    if (report.summary.follow_up_strategy.short_term && report.summary.follow_up_strategy.short_term.length > 0) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "This Week",
              bold: true,
              size: 22,
              color: "FB923C"
            })
          ],
          spacing: { after: 100 }
        })
      );
      
      report.summary.follow_up_strategy.short_term.forEach((action: string) => {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `• ${action}`,
                size: 20
              })
            ],
            indent: { left: 360 },
            spacing: { after: 50 }
          })
        );
      });
      
      children.push(new Paragraph({ children: [], spacing: { after: 200 } }));
    }
    
    if (report.summary.follow_up_strategy.long_term && report.summary.follow_up_strategy.long_term.length > 0) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "This Month",
              bold: true,
              size: 22,
              color: "22C55E"
            })
          ],
          spacing: { after: 100 }
        })
      );
      
      report.summary.follow_up_strategy.long_term.forEach((action: string) => {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `• ${action}`,
                size: 20
              })
            ],
            indent: { left: 360 },
            spacing: { after: 50 }
          })
        );
      });
    }
  }
  
  // Footer
  children.push(
    new Paragraph({ children: [], spacing: { after: 800 } }),
    new Paragraph({
      children: [
        new TextRun({
          text: "Generated with LivePrompt.ai",
          size: 16,
          color: "9CA3AF",
          italics: true
        })
      ],
      alignment: AlignmentType.CENTER
    })
  );
  
  // Create document
  const doc = new Document({
    sections: [{
      properties: {},
      children
    }],
    numbering: {
      config: [
        {
          reference: "decisions",
          levels: [
            {
              level: 0,
              format: "decimal",
              text: "%1.",
              alignment: AlignmentType.LEFT
            }
          ]
        }
      ]
    },
    creator: "LivePrompt.ai",
    title: `${report.title} - Meeting Report`,
    description: "Comprehensive meeting report generated by LivePrompt.ai"
  });
  
  // Generate and download
  const buffer = await Packer.toBuffer(doc);
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
  });
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${report.title.replace(/[^a-z0-9]/gi, '_')}_report.docx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}