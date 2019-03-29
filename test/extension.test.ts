import { analyzeSourceCode } from '../klint/entry';
import {
  forEach,
} from 'ramda';
import * as fs from 'fs';

suite("Extension Tests", () => {
  describe('Test Yaml Parsing', () => {
    it("applies rules", () => {
      const files = [
        './klint/examples/test.yaml',
        // './klint/examples/hello-world.yaml',
        // './klint/examples/js-yaml-example',
      ];

      forEach(file => {
        const sourceCode = fs.readFileSync(file, 'utf-8');
        analyzeSourceCode(sourceCode, file);
      }, files);
    });
  });
});