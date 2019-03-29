import { LintProblem, LintProblemSeverity } from '../entities/rule';
import * as eslint from 'eslint';
import {
  map,
  filter,
  length,
} from 'ramda';

export const createESLintLintResult = (filePath: string, sourceCode: string) => (problems: LintProblem[]): eslint.CLIEngine.LintResult => {
  const messages = map(convertProblemForESLintFormatterMessage, problems);

  const errors = filter(problem => problem.severity === 'error', problems);
  const fixableErrors = filter(problem => problem.fixable, errors);

  const warnings = filter(problem => problem.severity === 'warning', problems);
  const fixableWarnings = filter(problem => problem.fixable, warnings);

  return {
    filePath,
    source: sourceCode,
    messages,
    errorCount: length(errors),
    warningCount: length(warnings),
    fixableErrorCount: length(fixableErrors),
    fixableWarningCount: length(fixableWarnings),
  }
}

export const convertProblemForESLintFormatterMessage = (problem: LintProblem): eslint.Linter.LintMessage => {
  return {
    column: problem.range.start.character,
    line: problem.range.start.line,
    endColumn: problem.range.end.character,
    endLine: problem.range.start.line,
    ruleId: problem.ruleId,
    message: problem.message,
    nodeType: '??? node Type ???', // TODO
    severity: convertSeverityToESLint(problem.severity),
    source: '??? source ???', // TODO
  }
}

const convertSeverityToESLint = (severity: LintProblemSeverity): eslint.Linter.Severity => {
  switch (severity) {
    case LintProblemSeverity.error:
    default:
      return 2;

    case LintProblemSeverity.warning:
      return 1;

    case LintProblemSeverity.information:
    case LintProblemSeverity.hint:
      return 0;
  }
}