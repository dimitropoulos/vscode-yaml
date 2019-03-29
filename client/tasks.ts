import {
  WorkspaceFolder,
  Task,
  ShellExecution,
  ShellExecutionOptions,
  TaskDefinition,
  workspace,
  Disposable,
} from 'vscode';
import {
  compact
} from 'ramda-adjunct';

import { findKlint } from './utils';

interface KlintTaskDefinition extends TaskDefinition {
}

class FolderTaskProvider {
  constructor(private _workspaceFolder: WorkspaceFolder) { }


  public get workspaceFolder(): WorkspaceFolder {
    return this._workspaceFolder;
  }

  public isEnabled(): boolean {
    return workspace
      .getConfiguration('klint', this._workspaceFolder.uri)
      .get('provideLintTask');
  }

  public start(): void {
  }

  public dispose(): void {
  }

  public async getTask(): Promise<Task> {
    let rootPath = this._workspaceFolder.uri.scheme === 'file' ? this._workspaceFolder.uri.fsPath : undefined;

    if (!rootPath) {
      return undefined;
    }

    try {
      const command = await findKlint(rootPath);
      const kind: KlintTaskDefinition = {
        type: 'klint',
      }
      const options: ShellExecutionOptions = {
        cwd: this.workspaceFolder.uri.fsPath
      }
      return new Task(
        kind,
        this.workspaceFolder,
        'lint whole folder',
        'klint',
        new ShellExecution(`${command} .`, options),
        '$klint-stylish',
      );
    } catch (error) {
      return undefined;
    }

  }
}

export class TaskProvider {
  private taskProvider: Disposable | undefined;
  private providers: Map<string, FolderTaskProvider> = new Map();

  constructor() { }

  public start(): void {
  }

  public dispose(): void {
  }

  public updateWorkspaceFolders(added: WorkspaceFolder[], removed: WorkspaceFolder[]): void {
  }

  public updateConfiguration(): void {
  }

  public updateProvider(): void {
  }

  public getTasks(): Promise<Task[]> {
    if (this.providers.size === 0) {
      return Promise.resolve([]);
    } else {
      let promises: Promise<Task>[] = [];
      for (let provider of this.providers.values()) {
        promises.push(provider.getTask());
      }
      return Promise.all(promises).then(compact)
    }
  }
}