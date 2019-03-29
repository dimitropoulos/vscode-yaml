import * as yaml from 'js-yaml';

export const parse = (sourceCode: string) => yaml.safeLoadAll(sourceCode);

