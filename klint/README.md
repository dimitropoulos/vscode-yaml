# Klint Klintwood

names:
  Careener - (from `Careen`) turn (a ship) on its side for cleaning, caulking, or repair
  boatswain - a ship's officer in charge of equipment and the crew


Klint makes your Kubernetes manifests better.  It's like a YAML linter that is intimately aware of Kubernetes semantics.

## Why is this better than ${fill in the blank} other yaml linter?

The more time you spend working with YAML, the more you'll realize how [intense it is](https://github.com/haskell-hvr/HsYAML/blob/e70cf0c171c9a586b62b3f75d72f1591e4e6aaa1/src/Data/YAML/Event/Writer.hs#L33).  Any language specification with formatting dependent on whitespace can be difficult to parse.  With a normal parser you have a lexical scanner and then some kind of parser (like with a shift-reduce parser, for example) that works with the lexical tokens.  With YAML, though, you pretty much have to work directly on the input because parsing YAML requires effictively unbounded read ahead to figure out what the parser needs to do next since that decision can vary wildly based on whitespace.  Despite this intense challenge it is possible to write a YAML lexer that will output a stream of tokens.

YAML is not a strict superset of JSON (since JSON allows duplicate keys and YAML does not), but you can break out into a JSON map or array (inside YAML) then suddenly... you're back to normal lexical scanning and parsing temporarily.

# Other Examples

## Linters

| Name                                                                                | Parser  | Production-Ready? | LSP Support | AST-Based Rules | Number of Rules  |
| ---                                                                                 | ---     | ---               | ---         | ---             | ---              |
| [garethr/kubeval](https://github.com/garethr/kubeval)                               | go-yaml | Yes               | No          | No              | 0 (schema based) |
| [viglesiasce/kube-lint](https://github.com/viglesiasce/kube-lint)                   | go-yaml | No                | No          | No              | 6 (configurable) |
| [uswitch/klint](https://github.com/uswitch/klint)                                   | go-yaml | No                | No          | No              | 5                |

## Addons/Extensions

| Name                                                                                | Parser                   | Notes
| ---                                                                                 | ---                      | ---
| [mschuchard/linter-kubectl](https://github.com/mschuchard/linter-kubectl)           |                          | Atom Plugin
| [urcomputeringpal/kubevalidator](https://github.com/urcomputeringpal/kubevalidator) | kubeval                  | GitHub App
| [redhat-developer/vscode-yaml](https://github.com/redhat-developer/vscode-yaml)     | yaml-language-server     | Visual Studio Code Extension
| [Azure/vscode-kubernetes-tools](https://github.com/Azure/vscode-kubernetes-tools)   | js-yaml, yaml-ast-parser | Visual Studio Code Extension