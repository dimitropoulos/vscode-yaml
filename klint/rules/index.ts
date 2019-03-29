import { Rule } from '../entities/rule';
import exampleError from './example-error';
import exampleWarning from './example-warning';
import namespaceScopedResourcesRequireNamespaces from './namespace-scoped-resources-require-namespace';

export const rules = [
  exampleError,
  exampleWarning,
  namespaceScopedResourcesRequireNamespaces,
] as Rule[];
