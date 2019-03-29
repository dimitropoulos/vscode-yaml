import { Rule, RuleCategory, RuleType } from '../entities/rule';

const ruleId = 'namespace-scoped-resources-require-namespace';

const namespaceScopedResourcesRequireNamespaces: Rule = {
  meta: {
    type: RuleType.problem,
    docs: {
      description: 'ensure that all resources that are namespace scoped have an explicit namespace listed',
      category: RuleCategory.possibleErrors,
      recommended: true,
    },
    fixable: 'code',
  },

  calculate(tree, values) {
    return [];
  }
}

export default namespaceScopedResourcesRequireNamespaces;
