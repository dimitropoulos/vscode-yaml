import * as vscode from 'vscode';
import { LintProblem, LintProblemSeverity } from './entities/rule';

export const makeDiagnostic = ({ severity, message, range }: LintProblem): vscode.Diagnostic => {
  return {
    message,
    severity: convertSeverity(severity),
    source: 'klint',
    range: new vscode.Range(
      new vscode.Position(range.start.line, range.start.character),
      new vscode.Position(range.end.line, range.end.character),
    ),
  };
}

const convertSeverity = (severity: LintProblemSeverity): vscode.DiagnosticSeverity => {
  switch (severity) {
    case LintProblemSeverity.error:
      return vscode.DiagnosticSeverity.Error;

    case LintProblemSeverity.warning:
      return vscode.DiagnosticSeverity.Warning;

    case LintProblemSeverity.information:
      return vscode.DiagnosticSeverity.Information;

    case LintProblemSeverity.hint:
      return vscode.DiagnosticSeverity.Hint;

    default:
      return vscode.DiagnosticSeverity.Error;
  }
}
