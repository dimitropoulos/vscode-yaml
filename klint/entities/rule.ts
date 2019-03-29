import { JSONSchema4 } from "json-schema";
import { Node } from './ast';
import { Tree } from './entities';

export enum LintProblemSeverity {
  error = 'error',
  warning = 'warning',
  information = 'information',
  hint = 'hint',
}

type RuleId = string;

interface Position {
  line: number;
  character: number;
}

interface Range {
  start: Position;
  end: Position;
}

export type LintProblem = {
  range: Range;
  message: string;
  severity: LintProblemSeverity;
  ruleId: RuleId;
  fixable: boolean;
}

type ParsedYAML = any;

export enum RuleCategory {
  possibleErrors = "Possible Errors",
  bestPractices = "Best Practices",
  stylisticIssues = "Stylistic Issues",
}

export enum RuleType {
  suggestion = 'suggestion',
  layout = 'layout',
  problem = 'problem',
}

type Fixable = 'code' | 'whitespace' | false;

interface RuleMetaData {
  type: RuleType;
  docs: {
    description: string;
    category: RuleCategory;
    recommended: boolean;
    url?: string;
  };
  messages?: {
    [messageId: string]: string
  };
  fixable: Fixable;
  schema?: JSONSchema4| JSONSchema4[];
  deprecated?: boolean;
}

type NodeTypes = Node['type'];
type NodeListener = {
  [T in NodeTypes]?: (node: Node) => void
};

interface CodePathSegment {
  id: string;
  nextSegments: CodePathSegment[];
  prevSegments: CodePathSegment[];
  reachable: boolean;
}

interface CodePath {
  id: string;
  initialSegment: CodePathSegment;
  finalSegments: CodePathSegment[];
  returnedSegments: CodePathSegment[];
  thrownSegments: CodePathSegment[];
  currentSegments: CodePathSegment[];
  upper: CodePath | null;
  childCodePaths: CodePath[];
}

interface RuleListener extends NodeListener {
    onCodePathStart?(codePath: CodePath, node: Node): void;

    onCodePathEnd?(codePath: CodePath, node: Node): void;

    onCodePathSegmentStart?(segment: CodePathSegment, node: Node): void;

    onCodePathSegmentEnd?(segment: CodePathSegment, node: Node): void;

    onCodePathSegmentLoop?(fromSegment: CodePathSegment, toSegment: CodePathSegment, node: Node): void;

    [key: string]:
        | ((codePath: CodePath, node: Node) => void)
        | ((segment: CodePathSegment, node: Node) => void)
        | ((fromSegment: CodePathSegment, toSegment: CodePathSegment, node: Node) => void)
        | ((node: Node) => void)
        | undefined;
}

type ReportDescriptor = ReportDescriptorMessage
  & ReportDescriptorLocation
  & ReportDescriptorOptions;

type ReportDescriptorMessage = {
  message: string
} | {
  messageId: string
};

type ReportDescriptorLocation = {
  node: Node
} | {
  location: Range | Position
};
interface ReportDescriptorOptions {
    data?: {
      [key: string]: string; // TODO make better
    };

    // fix?(fixer: RuleFixer): null | Fix | IterableIterator<Fix>;
}

interface RuleContext {
  // id: string;
  // options: any[];
  // settings: { [name: string]: any };
  // parserPath: string;
  // parserOptions: Linter.ParserOptions;
  // parserServices: SourceCode.ParserServices;
  // getAncestors(): Node[];
  // getDeclaredVariables(node: Node): Scope.Variable[];
  // getFilename(): string;
  // getScope(): Scope.Scope;
  // getSourceCode(): SourceCode;
  // markVariableAsUsed(name: string): boolean;
  // report(descriptor: ReportDescriptor): void;
}


export type Calculator = (
  tree: Tree[],
  values: ParsedYAML,
) => LintProblem[]

export interface Rule {
  meta: RuleMetaData;
  // create(context: RuleContext): RuleListener;
  calculate: Calculator;
}