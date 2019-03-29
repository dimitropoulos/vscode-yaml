import { Rule, LintProblem, LintProblemSeverity, RuleCategory, RuleType } from '../entities/rule';

const ruleId = 'example-warning-ruleId';

const exampleWarning: Rule = {
  meta: {
    type: RuleType.suggestion,
    docs: {
      description: 'test rule that always reports a warning',
      category: RuleCategory.stylisticIssues,
      recommended: false,
    },
    fixable: false,
  },

  calculate() {
    const exampleWarning: LintProblem = {
      range: {
        start: {
          line: 3,
          character: 2,
        },
        end: {
          line: 3,
          character: 3,
        },
      },
      message: 'test: example warning message',
      severity: LintProblemSeverity.warning,
      ruleId,
      fixable: false,
    }
    return [
      exampleWarning,
    ]
  }
}

export default exampleWarning;
