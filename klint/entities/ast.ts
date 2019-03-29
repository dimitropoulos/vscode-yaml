import { SourceLocation } from "estree";
import { Range as _Range } from "vscode";

export type Range = _Range;

// TODO
export type Node = Scalar;

interface BaseNode {
  type: string;
  sourceCode: string | null;
  range: Range;
}

interface Scalar extends BaseNode {
  type: 'Identifier',
  name: string;
}