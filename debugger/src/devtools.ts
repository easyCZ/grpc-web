import ExtensionPanel = chrome.devtools.panels.ExtensionPanel;

chrome.devtools.panels.create(
    "gRPC",
    './icon.png',
    "./build/panel.html",
    (panel: ExtensionPanel) => {
        console.log('Created a gRPC panel', panel)
    }
);