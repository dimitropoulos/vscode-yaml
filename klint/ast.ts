'use strict'

import {
  drop,
  head,
  length,
  map,
  mergeAll,
  partition,
  pipe,
  slice,
  split,
  pick,
  splitAt,
  startsWith,
  zip,
} from 'ramda';
import {
  YeastInfoLineItems,
  YeastLinePair,
  Token,
  Tree,
  Leaf,
  infoDescriptionsByCode,
  tokenConfigsByCode,
  tokenGroupConfigsById,
} from './entities/entities';

import * as yaml from 'js-yaml';
import { spawnSync, SpawnSyncReturns } from 'child_process'
import * as fs from 'fs';
import { Position } from 'vscode-languageserver';
import * as directoryTree from 'directory-tree';

const processLinePair = ([value, comment]: YeastLinePair) => {
  const [tokenCode, token] = splitAt(1, value)
  const info = pipe<string, string, string[], (Pick<Token, YeastInfoLineItems>)[], Pick<Token, YeastInfoLineItems>>(
    drop(2),
    split(', '),
    map(info => ({
      [infoDescriptionsByCode[head(info)]]: parseInt(drop(3, info), 10),
    } as Pick<Token, YeastInfoLineItems>)),
    mergeAll,
  )(comment)
  return {
    token,
    tokenCode,
    description: tokenConfigsByCode[tokenCode].description,
    ...info,
  }
};

const yaml2Yeast = pipe<string, SpawnSyncReturns<any>, string>(
  sourceCode => spawnSync('yaml2yeast', [], {
    input: sourceCode,
  }),
  process => process.stdout.toString(),
);

const parseYeast = pipe<string, string[], [string[], string[]], YeastLinePair[], Token[]>(
  split('\n'),
  partition(startsWith('#')),
  ([values, comments]) => zip(comments, values) as YeastLinePair[],
  map(processLinePair),
);

const extractPosition: (input: Pick<Position, 'line' | 'character'>) => Position = pick(['line', 'character']);

const walk = (tokens: Token[]): Tree[] => {
  const totalTokens = length(tokens);
  for (let index = 0; index < totalTokens; index += 1) {
    const token = tokens[index];
    const { tokenCode } = token;
    const tokenConfig = tokenConfigsByCode[tokenCode];

    if (!tokenConfig.groupId) {
      const more = index === totalTokens - 1 ? [] : walk(
        slice(index + 1, totalTokens, tokens),
      );
      return [
        {
          label: tokenConfig.label || token.description,
          type: 'token',
          token: token.token,
          position: extractPosition(token),
        },
        ...more,
      ];
    }

    const tokenGroup = tokenGroupConfigsById[tokenConfig.groupId];
    if (tokenGroup.startingCode !== tokenCode) {
      console.error("UNRECOGNIZED TOKEN", token, tokenGroup);
      continue;
    }

    let stack = 1;
    for (let search = index + 1; search < totalTokens; search += 1) {
      const nextToken = tokens[search];

      if (nextToken.tokenCode === tokenGroup.startingCode) {
        stack += 1;
      }
      if (nextToken.tokenCode === tokenGroup.endingCode) {
        stack -= 1;
      }

      if (stack === 0) {
        const emptyLeaf: Leaf = {
          label: 'Empty',
          type: 'token',
          token: '',
          position: extractPosition(token),
        }
        let children = search === index + 1 ? [emptyLeaf] : (
          walk(slice(index + 1, search, tokens))
        );
        const remainder = totalTokens - (search + 1) > 0 ? (
          walk(slice(search + 1, totalTokens, tokens))
        ) : [];

        return [
          {
            label: tokenGroup.label,
            type: 'branch',
            range: {
              start: extractPosition(token),
              end: extractPosition(nextToken),
            },
            children,
          },
          ...remainder,
        ];
      }
    }
  }

  console.error("found opening token group with no corresponding closing token");
  return [];
};

type Skeleton = {
  [label: string]: string | Skeleton[]
}
type GetSkeleton = (node: Tree) => Skeleton

const getSkeleton: GetSkeleton = (node: Tree) => (node.type === 'branch' ? {
  [node.label]: map(getSkeleton, node.children)
} : {
    [node.label]: node.token
  }
);

const debugging = false;
function writeFile<T>(filepath: string, sourceCode: string) {
  return (data: T) => {
    if (debugging) {
      fs.writeFileSync(filepath, sourceCode);
    }
    return data;
  }
}

function printDebugJSON<T>(filepath: string) {
  return (data: T) => {
    const file = JSON.stringify(data, null, '  ');
    return writeFile<T>(`${filepath}.json`, file)(data);
  };
}

function printDebugYAML<T>(filepath: string) {
  return (data: T) => {
    const file = yaml.safeDump(data, {
      indent: 2,
    });
    return writeFile<T>(`${filepath}.yaml`, file)(data);
  };
}

function printDebugBoth<T>(filepath: string) {
  return (data: T) => {
    printDebugJSON<T>(filepath)(data);
    printDebugYAML<T>(filepath)(data);
    return data;
  };
}

export const parse = pipe(
  yaml2Yeast,
  yeast => writeFile<string>('./klint/debug/yeast', yeast)(yeast),
  parseYeast,
  printDebugBoth('./klint/debug/tokens'),
  walk,
  printDebugBoth('./klint/debug/tree'),
  tree => {
    pipe(
      map(getSkeleton),
      printDebugBoth('./klint/debug/labels-only'),
    )(tree);
    return tree;
  },
);

