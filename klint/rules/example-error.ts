import { LintProblem, LintProblemSeverity, Rule, RuleCategory, RuleType } from '../entities/rule';

const ruleId = 'example-error-ruleId';

const rule: Rule = {
  meta: {
    type: RuleType.problem,
    docs: {
      description: 'test rule that always reports an error',
      category: RuleCategory.stylisticIssues,
      recommended: false,
    },
    fixable: false,
  },

  // create(context) {
  //   Scalar(node) {
  //     context.report({ node, messageId: 'unexpected' })
  //   },
  // },

  calculate() {
    const exampleError: LintProblem = {
      range: {
        start: {
          line: 1,
          character: 0,
        },
        end: {
          line: 1,
          character: 1,
        },
      },
      message: 'test: example error message',
      severity: LintProblemSeverity.error,
      ruleId,
      fixable: false,
    }
    return [
      exampleError,
    ]
  },
};

export default rule;

