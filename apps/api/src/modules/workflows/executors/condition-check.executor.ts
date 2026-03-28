import { IActionExecutor, ActionExecutionContext, StepExecutionResult, ConditionRule, ConditionGroup } from '../types';

export class ConditionCheckExecutor implements IActionExecutor {
  /**
   * Execute condition check
   */
  async execute(config: any, context: ActionExecutionContext): Promise<StepExecutionResult> {
    try {
      const { leadId, tenantId } = context;

      // Get lead data
      const { prisma } = await import('../../../shared/database/prisma');
      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
      });

      if (!lead) {
        return {
          success: false,
          error: 'Lead not found',
        };
      }

      // Evaluate conditions
      const result = this.evaluateConditions(lead, config.conditions || {});

      return {
        success: true,
        data: {
          conditionMet: result,
          lead: {
            id: lead.id,
            qualityScore: lead.qualityScore,
            status: lead.status,
            platform: lead.platform,
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Evaluate complex conditions against lead data
   */
  private evaluateConditions(lead: any, conditions: Record<string, any>): boolean {
    // Handle simple conditions (backward compatibility)
    if (this.isSimpleCondition(conditions)) {
      return this.evaluateSimpleCondition(lead, conditions);
    }

    // Handle complex conditions with AND/OR logic
    if (conditions.operator && conditions.rules) {
      return this.evaluateConditionGroup(lead, conditions as ConditionGroup);
    }

    // Default to true if no conditions
    return true;
  }

  /**
   * Check if this is a simple condition (backward compatibility)
   */
  private isSimpleCondition(conditions: Record<string, any>): boolean {
    const simpleKeys = ['minQualityScore', 'maxQualityScore', 'status', 'platform', 'source'];
    return Object.keys(conditions).some(key => simpleKeys.includes(key));
  }

  /**
   * Evaluate simple conditions (backward compatibility)
   */
  private evaluateSimpleCondition(lead: any, conditions: Record<string, any>): boolean {
    if (conditions.minQualityScore !== undefined && lead.qualityScore < conditions.minQualityScore) {
      return false;
    }

    if (conditions.maxQualityScore !== undefined && lead.qualityScore > conditions.maxQualityScore) {
      return false;
    }

    if (conditions.status && lead.status !== conditions.status) {
      return false;
    }

    if (conditions.platform && lead.platform !== conditions.platform) {
      return false;
    }

    if (conditions.source && lead.source !== conditions.source) {
      return false;
    }

    return true;
  }

  /**
   * Evaluate a condition group with AND/OR logic
   */
  private evaluateConditionGroup(lead: any, group: ConditionGroup): boolean {
    const { operator, rules } = group;

    if (operator === 'AND') {
      return rules.every(rule => this.evaluateRuleOrGroup(lead, rule));
    } else if (operator === 'OR') {
      return rules.some(rule => this.evaluateRuleOrGroup(lead, rule));
    }

    return false;
  }

  /**
   * Evaluate a single rule or nested group
   */
  private evaluateRuleOrGroup(lead: any, ruleOrGroup: ConditionRule | ConditionGroup): boolean {
    if ('operator' in ruleOrGroup && 'rules' in ruleOrGroup) {
      // This is a nested group
      return this.evaluateConditionGroup(lead, ruleOrGroup);
    } else {
      // This is a rule
      return this.evaluateRule(lead, ruleOrGroup as ConditionRule);
    }
  }

  /**
   * Evaluate a single condition rule
   */
  private evaluateRule(lead: any, rule: ConditionRule): boolean {
    const { field, operator, value } = rule;
    const fieldValue = this.getFieldValue(lead, field);

    switch (operator) {
      case '==':
        return fieldValue === value;
      case '!=':
        return fieldValue !== value;
      case '>':
        return typeof fieldValue === 'number' && typeof value === 'number' && fieldValue > value;
      case '<':
        return typeof fieldValue === 'number' && typeof value === 'number' && fieldValue < value;
      case '>=':
        return typeof fieldValue === 'number' && typeof value === 'number' && fieldValue >= value;
      case '<=':
        return typeof fieldValue === 'number' && typeof value === 'number' && fieldValue <= value;
      case 'contains':
        return typeof fieldValue === 'string' && typeof value === 'string' &&
               fieldValue.toLowerCase().includes(value.toLowerCase());
      case 'starts_with':
        return typeof fieldValue === 'string' && typeof value === 'string' &&
               fieldValue.toLowerCase().startsWith(value.toLowerCase());
      default:
        return false;
    }
  }

  /**
   * Get field value from lead object, supporting nested fields
   */
  private getFieldValue(lead: any, field: string): any {
    if (field.includes('.')) {
      // Handle nested fields like 'customFields.companySize'
      const parts = field.split('.');
      let current = lead;
      for (const part of parts) {
        if (current && typeof current === 'object') {
          current = current[part];
        } else {
          return undefined;
        }
      }
      return current;
    }

    // Handle top-level fields
    switch (field) {
      case 'qualityScore':
        return lead.qualityScore;
      case 'status':
        return lead.status;
      case 'source':
        return lead.source;
      case 'platform':
        return lead.platform;
      case 'city':
        return lead.city;
      case 'state':
        return lead.state;
      case 'country':
        return lead.country;
      case 'company':
        return lead.company;
      case 'title':
        return lead.title;
      case 'createdAt':
        return lead.createdAt;
      case 'updatedAt':
        return lead.updatedAt;
      default:
        // Check custom fields
        if (lead.customFields && typeof lead.customFields === 'object') {
          return lead.customFields[field];
        }
        return undefined;
    }
  }
}