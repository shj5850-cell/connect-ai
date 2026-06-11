const Module = require('module');
const originalRequire = Module.prototype.require;

class MockEventEmitter {
    constructor() {
        this.event = () => {};
    }
    fire() {}
}

class MockDisposable {
    static from() {}
    dispose() {}
}

class MockTreeItem {
    constructor(label, collapsibleState) {
        this.label = label;
        this.collapsibleState = collapsibleState;
    }
}

class MockThemeIcon {
    constructor(id) {
        this.id = id;
    }
}

Module.prototype.require = function (id) {
    if (id === 'vscode') {
        return {
            window: {
                activeTextEditor: undefined,
                showInformationMessage: () => {},
                showErrorMessage: () => {},
                createWebviewPanel: () => ({
                    webview: {
                        onDidReceiveMessage: () => {},
                        postMessage: () => {}
                    },
                    onDidDispose: () => {}
                }),
                registerTreeDataProvider: () => {}
            },
            workspace: {
                getConfiguration: () => ({
                    get: (key) => {
                        if (key === 'ollamaUrl') return 'http://127.0.0.1:11434';
                        if (key === 'defaultModel') return 'myungchul-coder:latest';
                        if (key === 'companyDir') return 'c:\\Users\\user\\Desktop\\명철\\개발\\_company';
                        return '';
                    }
                }),
                workspaceFolders: []
            },
            Uri: {
                file: (p) => ({ fsPath: p })
            },
            EventEmitter: MockEventEmitter,
            Disposable: MockDisposable,
            TreeItem: MockTreeItem,
            ThemeIcon: MockThemeIcon,
            TreeItemCollapsibleState: {
                None: 0,
                Collapsed: 1,
                Expanded: 2
            },
            commands: {
                registerCommand: () => {}
            }
        };
    }
    return originalRequire.apply(this, arguments);
};

try {
    const ext = require('../out/extension.js');
    console.log("Successfully required extension!");
    console.log("Exported functions:", Object.keys(ext));
} catch (e) {
    console.error("Require failed:", e);
}
