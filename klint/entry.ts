import * as ast from './ast';
import * as yamlValues from './values';
import { rules } from './rules';
import {
  chain,
} from 'ramda';
// import formatter from './formatters/codeframe';
import formatter from './formatters/stylish';
import { createESLintLintResult } from './formatters/utils';

export const analyzeSourceCode = (sourceCode: string, file: string) => {
  const tree = ast.parse(sourceCode);
  const yaml = yamlValues.parse(sourceCode);
  const errors = chain(rule => rule.calculate(tree, yaml), rules)
  const eslintResult = createESLintLintResult(file, sourceCode)(errors);
  const formatted = formatter([eslintResult]);
  console.log(formatted);
  return errors;
}
