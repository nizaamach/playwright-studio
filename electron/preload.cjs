const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('studio', {
  selectProject: () => ipcRenderer.invoke('select-project'),
  createProject: (name, location) => ipcRenderer.invoke('create-project', name, location),
  readProject: (projectPath) => ipcRenderer.invoke('read-project', projectPath),
  saveTest: (projectPath, test) => ipcRenderer.invoke('save-test', projectPath, test),
  renameTest: (projectPath, testId, name) => ipcRenderer.invoke('rename-test', projectPath, testId, name),
  deleteTest: (projectPath, testId) => ipcRenderer.invoke('delete-test', projectPath, testId),
  exportCode: (fileName, code) => ipcRenderer.invoke('export-code', fileName, code),
  runTest: (request) => ipcRenderer.invoke('run-test', request),
  stopTest: () => ipcRenderer.invoke('stop-test'),
  openArtifact: (artifactPath) => ipcRenderer.invoke('open-artifact', artifactPath),
  openProjectFolder: (projectPath) => ipcRenderer.invoke('open-project-folder', projectPath),
  startRecorder: (url) => ipcRenderer.invoke('start-recorder', url),
  stopRecorder: () => ipcRenderer.invoke('stop-recorder'),
  countLocator: (locatorType, selector, role) => ipcRenderer.invoke('count-locator', locatorType, selector, role),
  onRecorderEvent: (callback) => {
    const listener = (_event, step) => callback(step);
    ipcRenderer.on('recorder-event', listener);
    return () => ipcRenderer.removeListener('recorder-event', listener);
  },
  onRecorderError: (callback) => {
    const listener = (_event, message) => callback(message);
    ipcRenderer.on('recorder-error', listener);
    return () => ipcRenderer.removeListener('recorder-error', listener);
  }
});
