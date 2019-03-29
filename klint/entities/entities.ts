import {
  Range,
} from 'vscode-languageclient';
import { Position } from 'vscode-languageclient';
// import * as ESLint from 'eslint'
import { JSONSchema4 } from 'json-schema';
import { Node } from './ast';

// Value lines have the form `${tokenCode}${token}`
type YeastTokenLine = string;

// Info lines have the form `# B: ${byteOffset} C: ${charOffset} L: ${line} c: ${character}`
type YeastInfoLine = string;

export type YeastInfoLineItems = 'byteOffset' | 'charOffset' | 'line' | 'character';
export type YeastLinePair = [YeastTokenLine, YeastInfoLine];

type InfoDescriptionsByCode = {
  [infoCode: string]: YeastInfoLineItems;
};

export const infoDescriptionsByCode: InfoDescriptionsByCode = {
  'L': 'line',
  'B': 'byteOffset',
  'C': 'charOffset',
  'c': 'character',
};

export interface Token {
  token: string;
  tokenCode: TokenCode;
  description: string;
  byteOffset: number;
  charOffset: number;
  line: number;
  character: number;
}

export type Tree = Branch | Leaf

interface Branch {
  label: string;
  type: 'branch',
  children: Tree[];
  range: Range;
}

export interface Leaf {
  label: string;
  type: 'token',
  token: string;
  position: Position,
}

type TokenCode = string;

interface TokenGroupConfig {
  label: string;
  startingCode: TokenCode;
  endingCode: TokenCode;
}

type TokenGroupConfigsById = {
  [key in TokenGroup]: TokenGroupConfig
};

enum TokenGroup {
  aliasReference = 'aliasReference',
  anchor = 'anchor',
  comment = 'comment',
  completeNode = 'completeNode',
  directive = 'directive',
  document = 'document',
  escapeSequence = 'escapeSequence',
  keyValuePair = 'keyValuePair',
  mapping = 'mapping',
  nodeProperties = 'nodeProperties',
  scalar = 'scalar',
  sequenceContent = 'sequenceContent',
  tag = 'tag',
  tagHandle = 'tagHandle',
};

export const tokenGroupConfigsById: TokenGroupConfigsById = {
  [TokenGroup.document]: {
    label: 'Document',
    startingCode: 'O',
    endingCode: 'o',
  },
  [TokenGroup.completeNode]: {
    label: 'Node',
    startingCode: 'N',
    endingCode: 'n',
  },
  [TokenGroup.mapping]: {
    label: 'Mapping',
    startingCode: 'M',
    endingCode: 'm',
  },
  [TokenGroup.keyValuePair]: {
    label: 'Key:value Pair',
    startingCode: 'X',
    endingCode: 'x',
  },
  [TokenGroup.scalar]: {
    label: 'Scalar',
    startingCode: 'S',
    endingCode: 's',
  },
  [TokenGroup.escapeSequence]: {
    label: 'Escape Sequence',
    startingCode: 'E',
    endingCode: 'e',
  },
  [TokenGroup.comment]: {
    label: 'Comment',
    startingCode: 'C',
    endingCode: 'c',
  },
  [TokenGroup.directive]: {
    label: 'Directive',
    startingCode: 'D',
    endingCode: 'd',
  },
  [TokenGroup.tag]: {
    label: 'Tag',
    startingCode: 'G',
    endingCode: 'g',
  },
  [TokenGroup.tagHandle]: {
    label: 'Tag handle',
    startingCode: 'H',
    endingCode: 'h',
  },
  [TokenGroup.anchor]: {
    label: 'Anchor',
    startingCode: 'A',
    endingCode: 'a',
  },
  [TokenGroup.nodeProperties]: {
    label: 'Node properties',
    startingCode: 'P',
    endingCode: 'p',
  },
  [TokenGroup.aliasReference]: {
    label: 'Alias reference',
    startingCode: 'R',
    endingCode: 'r',
  },
  [TokenGroup.sequenceContent]: {
    label: 'Sequence content',
    startingCode: 'Q',
    endingCode: 'q',
  },
};

interface TokenConfig {
  description: string;
  groupId?: TokenGroup;
  label?: string;
}

type TokenConfigsByCode = {
  [key in TokenCode]: TokenConfig
};

export const tokenConfigsByCode: TokenConfigsByCode = {
  'U': {
    description: 'Byte Order Mark',
    label: 'Byte Order Mark',
  },
  'T': {
    description: 'Contains preserved content text characters',
    label: 'Content text',
  },
  't': {
    description: 'Contains non-content (meta) text characters',
  },
  'b': {
    description: 'Contains separation line break',
    label: 'Non-content line break'
  },
  'L': {
    description: 'Contains line break normalized to content line feed',
  },
  'l': {
    description: 'Contains line break folded to content space',
  },
  'I': {
    description: 'Contains character indicating structure',
    label: 'Indicator character',
  },
  'w': {
    description: 'Contains separation white space',
    label: 'Non-content white space'
  },
  'i': {
    description: 'Contains indentation spaces',
    label: 'Indentation white space'
  },

  'K': {
    description: 'Directives end marker',
  },
  'k': {
    description: 'Document end marker',
  },

  'E': {
    description: 'Begins escape sequence',
    groupId: TokenGroup.escapeSequence,
  },
  'e': {
    description: 'Ends escape sequence',
    groupId: TokenGroup.escapeSequence,
  },

  'C': {
    description: 'Begins comment',
    groupId: TokenGroup.comment,
  },
  'c': {
    description: 'Ends comment',
    groupId: TokenGroup.comment,
  },

  'D': {
    description: 'Begins directive',
    groupId: TokenGroup.directive,
  },
  'd': {
    description: 'Ends directive',
    groupId: TokenGroup.directive,
  },

  'G': {
    description: 'Begins tag',
    groupId: TokenGroup.tag,
  },
  'g': {
    description: 'Ends tag',
    groupId: TokenGroup.tag,
  },

  'H': {
    description: 'Begins tag handle',
    groupId: TokenGroup.tagHandle,
  },
  'h': {
    description: 'Ends tag handle',
    groupId: TokenGroup.tagHandle,
  },

  'A': {
    description: 'Begins anchor',
    groupId: TokenGroup.anchor,
  },
  'a': {
    description: 'Ends anchor',
    groupId: TokenGroup.anchor,
  },

  'P': {
    description: 'Begins node properties',
    groupId: TokenGroup.nodeProperties,
  },
  'p': {
    description: 'Ends node properties',
    groupId: TokenGroup.nodeProperties,
  },

  'R': {
    description: 'Begins alias (reference)',
    groupId: TokenGroup.aliasReference,
  },
  'r': {
    description: 'Ends alias (reference)',
    groupId: TokenGroup.aliasReference,
  },

  'S': {
    description: 'Begins scalar content',
    groupId: TokenGroup.scalar,
  },
  's': {
    description: 'Ends scalar content',
    groupId: TokenGroup.scalar,
  },

  'Q': {
    description: 'Begins sequence content',
    groupId: TokenGroup.sequenceContent,
  },
  'q': {
    description: 'Ends sequence content',
    groupId: TokenGroup.sequenceContent,
  },

  'M': {
    description: 'Begins mapping content',
    groupId: TokenGroup.mapping,
  },
  'm': {
    description: 'Ends mapping content',
    groupId: TokenGroup.mapping,
  },

  'N': {
    description: 'Begins complete node',
    groupId: TokenGroup.completeNode,
  },
  'n': {
    description: 'Ends complete node',
    groupId: TokenGroup.completeNode,
  },

  'X': {
    description: 'Begins mapping key:value pair',
    groupId: TokenGroup.keyValuePair,
  },
  'x': {
    description: 'Ends mapping key:value pair',
    groupId: TokenGroup.keyValuePair,
  },

  'O': {
    description: 'Begins document',
    groupId: TokenGroup.document,
  },
  'o': {
    description: 'Ends document',
    groupId: TokenGroup.document,
  },

  '!': {
    description: 'Parsing error at this point.',
  },
  '-': {
    description: 'Unparsed text following error point.',
  },
  '$': {
    description: 'Value of detected parameters',
  },
};
