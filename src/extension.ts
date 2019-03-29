'use strict';
import * as vscode from 'vscode';
import * as path from 'path';
import { analyzeSourceCode } from '../klint/entry';
import { makeDiagnostic } from '../klint/interop';
import {
  map,
} from 'ramda';

export function activate(context: vscode.ExtensionContext) {
  const collection = vscode.languages.createDiagnosticCollection('test');
  if (vscode.window.activeTextEditor) {
    updateDiagnostics(vscode.window.activeTextEditor.document, collection);
  }
  const subscription = vscode.window.onDidChangeActiveTextEditor(textEditor => {
    if (!textEditor) {
      return;
    }
    const document = textEditor.document;
    return updateDiagnostics(document, collection);
  });
  context.subscriptions.push(subscription);
}

function updateDiagnostics(document: vscode.TextDocument, collection: vscode.DiagnosticCollection): void {
  const filename = path.basename(document.uri.fsPath);
  if (!document || !filename.endsWith('yaml')) {
    collection.clear();
    console.log('didnt end with `yaml`');
    return;
  }

  const sourceCode = document.getText();
  const errors = analyzeSourceCode(sourceCode, filename);
  const diagnostics = map(makeDiagnostic, errors);
  collection.set(document.uri, diagnostics);
}

// this method is called when your extension is deactivated
export function deactivate() {
}