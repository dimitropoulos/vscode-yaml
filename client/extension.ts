import * as path from 'path';
import * as fs from 'fs';
import {
  CodeAction,
  CodeActionContext,
  Command,
  Diagnostic,
  Disposable,
  ExtensionContext,
  MessageItem,
  ProviderResult,
  QuickPickItem,
  StatusBarAlignment,
  TextDocument,
  Uri,
  WorkspaceFolder as VWorkspaceFolder,
  commands as Commands,
  languages as Languages,
  window as Window,
  workspace as Workspace,
} from 'vscode';
import {
  CloseAction,
  DidCloseTextDocumentNotification,
  DidOpenTextDocumentNotification,
  DocumentFilter,
  ErrorAction,
  ErrorHandler,
  ExecuteCommandParams,
  ExecuteCommandRequest,
  LanguageClient,
  LanguageClientOptions,
  NotificationType,
  RequestType,
  RevealOutputChannelOn,
  ServerOptions,
  State as ClientState,
  TextDocumentIdentifier,
  TransportKind,
  VersionedTextDocumentIdentifier,
  WorkspaceFolder,
} from 'vscode-languageclient';
import {
  forEach,
  filter,
  isEmpty,
  length,
  propEq,
  join,
  any,
  reduce,
} from 'ramda';
import { TaskProvider } from './tasks';

const repoUrl = 'github.com/dimitropoulos/klint';

namespace Is {
  const toString = Object.prototype.toString;

  export function boolean(value: any): value is boolean {
    return value === true || value === false;
  }

  export function string(value: any): value is string {
    return toString.call(value) === '[object String]';
  }
}

interface ValidateItem {
  language: string;
  autoFix?: boolean;
}

namespace ValidateItem {
  export function is(item: any): item is ValidateItem {
    let candidate = item as ValidateItem;
    return candidate
      && Is.string(candidate.language)
      && (
        Is.boolean(candidate.autoFix)
        || candidate.autoFix === void 0
      );
  }
}

interface DirectoryItem {
	directory: string;
	changeProcessCWD?: boolean;
}

type RunValues = 'onType' | 'onSave';

namespace DirectoryItem {
	export function is(item: any): item is DirectoryItem {
		let candidate = item as DirectoryItem;
		return candidate && Is.string(candidate.directory) && (Is.boolean(candidate.changeProcessCWD) || candidate.changeProcessCWD === void 0);
	}
}

interface CodeActionSettings {
	disableRuleComment: {
		enable: boolean;
		location: 'separateLine' | 'sameLine';
	};
	showDocumentation: {
		enable: boolean;
	};
}

interface TextDocumentSettings {
	validate: boolean;
	packageManager: 'npm' | 'yarn' | 'pnpm';
	autoFix: boolean;
	autoFixOnSave: boolean;
	options: any | undefined;
	run: RunValues;
	nodePath: string | undefined;
	workspaceFolder: WorkspaceFolder | undefined;
	workingDirectory: DirectoryItem | undefined;
	library: undefined;
	codeAction: CodeActionSettings;
}

enum Status {
  ok = 1,
  warn = 2,
  error = 3
}

interface StatusParams {
  state: Status;
}

namespace StatusNotification {
  export const type = new NotificationType<StatusParams, void>('klint/status');
}

interface NoConfigParams {
  message: string;
  document: TextDocumentIdentifier;
}

interface NoConfigResult {
}

namespace NoConfigRequest {
  export const type = new RequestType<NoConfigParams, NoConfigResult, void, void>('klint/noConfig');
}

interface NoKlintLibraryParams {
  source: TextDocumentIdentifier;
}

interface NoKlintLibraryResult {
}

namespace NoKlintLibraryRequest {
  export const type = new RequestType<NoKlintLibraryParams, NoKlintLibraryResult, void, void>('klint/noLibrary');
}

interface OpenKlintDocParams {
  url: string;
}

interface OpenKlintDocResult {
}

namespace OpenKlintDocRequest {
  export const type = new RequestType<OpenKlintDocParams, OpenKlintDocResult, void, void>('klint/openDoc');
}

const exitCalled = new NotificationType<[number, string], void>('klint/exitCalled');

const defaultLanguages = [
  'yaml',
]

const shouldBeValidated = (textDocument: TextDocument) => {
  const config = Workspace.getConfiguration('klint', textDocument.uri);
  if (!config.get('enable', true)) {
    console.log(`text document ${textDocument.uri.toString()} should not be validated by klint because klint is not enabled in the workspace`)
    return false;
  }

  let validateItems = config.get<(ValidateItem | string)[]>('validate', defaultLanguages);
  forEach(item => {
    if (Is.string(item) && item === textDocument.languageId) {
      return true;
    } else if (ValidateItem.is(item) && item.language === textDocument.languageId) {
      return true;
    }
  }, validateItems);
  return false;
}

let dummyCommands: Disposable[] = [];
let taskProvider: TaskProvider;

export const activate = (context: ExtensionContext) => {
  let activated: boolean;
  let openListener: Disposable;
  let configurationListener: Disposable;

  const didOpenTextDocument = (textDocument: TextDocument) => {
    if (!activated && shouldBeValidated(textDocument)) {
      openListener.dispose();
      configurationListener.dispose();
      activated = true;
      realActivate(context);
    }
  }

  const configurationChanged = () => {
    if (!activated) {
      forEach(didOpenTextDocument, Workspace.textDocuments)
    }
  }

  openListener = Workspace.onDidOpenTextDocument(didOpenTextDocument);
  configurationListener = Workspace.onDidChangeConfiguration(configurationChanged);

  const notValidating = () => (
    Window.showInformationMessage('Klint is not running.')
  );

  dummyCommands = [
    Commands.registerCommand('klint.executeAutofix', notValidating),
    Commands.registerCommand('klint.showOutputChannel', notValidating)
  ];

  context.subscriptions.push(
    // Commands.registerCommand('klint.enable', enable),
    // Commands.registerCommand('klint.disable', disable),
    // Commands.registerCommand('klint.createConfig', createDefaultConfiguration),
  )

  taskProvider = new TaskProvider();
  taskProvider.start();
  configurationChanged();
}

export const realActivate = (context: ExtensionContext): void => {
  let statusBarItem = Window.createStatusBarItem(StatusBarAlignment.Right, 0);
  let klintStatus: Status = Status.ok;
  let serverRunning = false;

  statusBarItem.text = 'Klint';
  statusBarItem.command = 'klint.showOutputChannel';

  const showStatusBarItem = (show: boolean) => {
    if (show) {
      statusBarItem.show();
    } else {
      statusBarItem.hide();
    }
  }

  const updateStatusBarVisibility = () => {
    const alwaysShowStatus = Workspace.getConfiguration('klint').get('alwaysShowStatus', false);
    const show = (serverRunning && klintStatus !== Status.ok) || alwaysShowStatus
    showStatusBarItem(show)
  }

  const updateStatus = (status: Status) => {
    klintStatus = status;
    switch (status) {
      case Status.error:
        statusBarItem.text = '$(issue-opened) Klint';
        break;

      case Status.warn:
        statusBarItem.text = '$(alert) Klint';
        break;

      default:
      case Status.ok:
        statusBarItem.text = 'Klint';
    }
    updateStatusBarVisibility();
  }

  let serverModule = context.asAbsolutePath(path.join('server', 'out', 'klintServer.js'));
  let runtime = Workspace.getConfiguration('klint').get('runtime', null);

  let defaultErrorHandler: ErrorHandler;
  let serverCalledProcessExit = false;

  let packageJsonFilter: DocumentFilter = {
    scheme: 'file',
    pattern: '**/package.json',
  };

  let configFileFilter: DocumentFilter = {
    scheme: 'file',
    pattern: '**/.klintrc.yaml',
  };

  let syncedDocuments: Map<string, TextDocument> = new Map<string, TextDocument>();

  Workspace.onDidChangeConfiguration(() => {
    for (const textDocument of syncedDocuments.values()) {
      if (!shouldBeValidated(textDocument)) {
        syncedDocuments.delete(textDocument.uri.toString());
        client.sendNotification(
          DidCloseTextDocumentNotification.type,
          client.code2ProtocolConverter.asCloseTextDocumentParams(textDocument),
        );
      }
    }

    for (const textDocument of Workspace.textDocuments) {
      if (!syncedDocuments.has(textDocument.uri.toString()) && shouldBeValidated(textDocument)) {
        client.sendNotification(
          DidOpenTextDocumentNotification.type,
          client.code2ProtocolConverter.asOpenTextDocumentParams(textDocument),
        )
        syncedDocuments.set(textDocument.uri.toString(), textDocument)
      }
    }
  });

  const serverOptions: ServerOptions = {
    run: {
      module: serverModule,
      transport: TransportKind.ipc,
      runtime,
      options: {
        cwd: process.cwd(),
      },
    },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      runtime,
      options: {
        execArgv: [
          "--nolazy",
          '--inspect=6010',
        ],
        cwd: process.cwd(),
      },
    },
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [
      {
        scheme: 'file',
      },
      {
        scheme: 'untitled',
      },
    ],
    diagnosticCollectionName: 'klint',
    revealOutputChannelOn: RevealOutputChannelOn.Never,
    synchronize: {
      fileEvents: [
        Workspace.createFileSystemWatcher('**/.klintrc.yaml'),
        Workspace.createFileSystemWatcher('**/.klintignore'),
        Workspace.createFileSystemWatcher('**/package.json'),
      ],
    },
    initializationFailedHandler(error) {
      client.error('Server initialization failed.', error);
      client.outputChannel.show(true);
      return false;
    },
    errorHandler: {
      error: defaultErrorHandler.error,
      closed() {
        if (serverCalledProcessExit) {
          return CloseAction.DoNotRestart;
        }
        return defaultErrorHandler.closed();
      }
    },
    middleware: {
      didOpen(document, next) {
        if (Languages.match(packageJsonFilter, document) || Languages.match(configFileFilter, document) || shouldBeValidated(document)) {
          next(document);
          syncedDocuments.set(document.uri.toString(), document);
        }
      },
      didChange(event, next) {
        if (syncedDocuments.has(event.document.uri.toString())) {
          next(event);
        }
      },
      willSave(event, next) {
        if (syncedDocuments.has(event.document.uri.toString())) {
          next(event);
        }
      },
      willSaveWaitUntil(event, next) {
        if (syncedDocuments.has(event.document.uri.toString())) {
          return next(event);
        } else {
          return Promise.resolve([]);
        }
      },
      didSave(document, next) {
        if (syncedDocuments.has(document.uri.toString())) {
          next(document);
        }
      },
      didClose(document, next) {
        const uri = document.uri.toString();
        if (syncedDocuments.has(uri)) {
          syncedDocuments.delete(uri);
          next(document);
        }
      },
      provideCodeActions(document, range, context, token, next) {
        if (
          !syncedDocuments.has(document.uri.toString())
          || !context.diagnostics
          || context.diagnostics.length === 0
        ) {
          return [];
        }

        const klintDiagnostics = filter(
          diagnostic => diagnostic.source === 'klint',
          context.diagnostics,
        );

        if (isEmpty(klintDiagnostics)) {
          return [];
        }

        const newDiagnostics: CodeActionContext = {
          diagnostics: klintDiagnostics,
        }
        const newContext: CodeActionContext = {
          ...context,
          ...newDiagnostics,
        };

        return next(document, range, newContext, token);
      },
      workspace: {
        configuration: (params, _token, _next) => {
          if (!params.items) {
            return null;
          }

          return reduce((accumulator, item) => {
            if (item.section || !item.scopeUri) {
              accumulator = [
                ...accumulator,
                null,
              ];
              return accumulator;
            }

            const resource = client.protocol2CodeConverter.asUri(item.scopeUri);
            const config = Workspace.getConfiguration('klint', resource);
            const settings: TextDocumentSettings = {
              validate: false,
              packageManager: config.get('packageManager', 'yarn'),
              autoFix: false,
              autoFixOnSave: false,
              options: config.get('options', {}),
              run: config.get('run', 'onType'),
              nodePath: config.get('nodePath', undefined),
              workingDirectory: undefined,
              workspaceFolder: undefined,
              library: undefined,
              codeAction: {
                disableRuleComment: config.get('codeAction.disableRuleComment', {
                  enable: true,
                  location: 'separateLine' as 'separateLine',
                }),
                showDocumentation: config.get('codeAction.showDocumentation', {
                  enable: true,
                }),
              },
            };

            const document: TextDocument = syncedDocuments.get(item.scopeUri);
            if (!document) {
              accumulator = [
                ...accumulator,
                settings,
              ]
              return accumulator;
            }

            if (config.get('enabled', true)) {
              const validateItems = config.get<(ValidateItem | string)[]>('validate', ['yaml']);
              any(item => {
                if (Is.string(item) && item === document.languageId) {
                  settings.validate = true;
                  if (item === 'yaml') {
                    settings.autoFix = true;
                  }
                  return true;
                } else if (ValidateItem.is(item) && item.language === document.languageId) {
                  settings.validate = true;
                  settings.autoFix = item.autoFix;
                  return true;
                }
              }, validateItems);

              if (settings.validate) {
                settings.autoFixOnSave = settings.autoFix && config.get('autoFixOnSave', false);
              }

              const workspaceFolder = Workspace.getWorkspaceFolder(resource);
              if (workspaceFolder) {
                settings.workspaceFolder = {
                  name: workspaceFolder.name,
                  uri: client.code2ProtocolConverter.asUri(workspaceFolder.uri),
                };
              }

              const workingDirectories = config.get<(string | DirectoryItem)[]>('workingDirectories', undefined);

              if (!Array.isArray(workingDirectories)) {
                return [
                  ...accumulator,
                  settings,
                ];
              }

              let workingDirectory = undefined;
              const workspaceFolderPath = workspaceFolder && workspaceFolder.uri.scheme === 'file' ? workspaceFolder.uri.fsPath : undefined;

              forEach(entry => {
                let directory: string;
                let changeProcessCWD = false;
                if (Is.string(entry)) {
                  directory = entry;
                } else if (DirectoryItem.is(entry)) {
                  directory = entry.directory;
                  changeProcessCWD = Boolean(entry.changeProcessCWD);
                }

                if (!directory) {
                  return;
                }

                if (path.isAbsolute(directory)) {
                  directory = directory;
                } else if (workspaceFolderPath && directory) {
                  directory = path.join(workspaceFolderPath, directory);
                } else {
                  directory = undefined;
                }

                const filePath = document.uri.scheme === 'file' ? document.uri.fsPath : undefined;
                if (!(filePath && directory && filePath.startsWith(directory))) {
                  return;
                }
                if (workingDirectory) {
                  if (workingDirectory.directory.length < directory.length) {
                    workingDirectory.directory = directory;
                    workingDirectory.changeProcessCWD = changeProcessCWD;
                  }
                } else {
                  workingDirectory = {
                    directory,
                    changeProcessCWD,
                  }
                }
              }, workingDirectories);
              settings.workingDirectory = workingDirectory;
            }
          }, [] as (TextDocumentSettings | null)[], params.items);
        },
      },
    }
  };

  let client: LanguageClient;
  try {
    client = new LanguageClient('klint', serverOptions, clientOptions)
  } catch (err) {
    Window.showErrorMessage(`The Klint extension couldn't be started. See the Klint output channel for details.`)
    return;
  }
  client.registerProposedFeatures();
  defaultErrorHandler = client.createDefaultErrorHandler();
  client.onDidChangeState(event => {
    if (event.newState === ClientState.Running) {
      const running = 'Klint server is running.';
      client.info(running);
      statusBarItem.tooltip = running;
      serverRunning = true;
    } else {
      const stopped = 'Klint server stopped.';
      client.info(stopped);
      statusBarItem.tooltip = stopped;
      serverRunning = false;
    }
    updateStatusBarVisibility();
  });

  client.onReady().then(() => {
    client.onNotification(StatusNotification.type, params => {
      updateStatus(params.state);
    });

    client.onNotification(exitCalled, params => {
      serverCalledProcessExit = true;
      client.error(`Server process exited with code ${params[0]}. This usually indicates a misconfigured Klint setup.`, params[1]);
      Window.showErrorMessage(`Klint server shut itself down.  See the Klint output channel for details.`);
    });


    client.onRequest(NoConfigRequest.type, params => {
      let document = Uri.parse(params.document.uri);
      let workspaceFolder = Workspace.getWorkspaceFolder(document);
      let fileLocation = document.fsPath;
      if (workspaceFolder) {
        client.warn(join('\n', [
          '',
          `No Klint configuration (e.g. \`.klintrc\`) found for file ${fileLocation}`,
          `File will not be validated.`,
          `Consider running \`klint --init\` in the workspace folder ${workspaceFolder.name}`,
          `Alternatively you can disable Klint by executing the \`Disable Klint\` command.`,
        ]));
      } else {
        client.warn(join('\n', [
          '',
          `No Klint configuration (e.g. \`.klintrc\`) found for file ${fileLocation}`,
          `File will not be validated.`,
          `Alternatively you can disable Klint by executing the \`Disable Klint\` command.`,
        ]));
      }
      klintStatus = Status.warn;
      updateStatusBarVisibility();
      return {};
    })

    client.onRequest(NoKlintLibraryRequest.type, params => {
      // TODO: might need a bit more here.
      client.info(join('\n', [
        '',
        `Failed to load Klint.  Please make sure it's installed`,
      ]));
      return {};
    });

    client.onRequest(OpenKlintDocRequest.type, params => {
      Commands.executeCommand('vscode.open', Uri.parse(params.url));
      return {};
    });
  });

  if (dummyCommands) {
    forEach(command => command.dispose(), dummyCommands);
    dummyCommands = [];
  }

  updateStatusBarVisibility();

  context.subscriptions.push(
    client.start(),
    Commands.registerCommand('klint.executeAutofix', () => {
      let textEditor = Window.activeTextEditor;
      if (!textEditor) {
        return;
      }

      let textDocument: VersionedTextDocumentIdentifier = {
        uri: textEditor.document.uri.toString(),
        version: textEditor.document.version,
      };
      let params: ExecuteCommandParams = {
        command: 'klint.applyAutoFix',
        arguments: [textDocument],
      };
      client.sendRequest(ExecuteCommandRequest.type, params).then(undefined, () => {
        Window.showErrorMessage(`Failed to apply Klint fixes to document (${textDocument.uri.toString()}).  Please Consider opening an issue at ${repoUrl} with steps to reproduce.`)
      });
    }),
    Commands.registerCommand('klint.showOutputChannel', () => {
      client.outputChannel.show();
    }),
    statusBarItem,
  )
}

export const deactivate = () => {
  forEach(command => { command.dispose(); }, dummyCommands);

  if (taskProvider) {
    taskProvider.dispose();
  }
}