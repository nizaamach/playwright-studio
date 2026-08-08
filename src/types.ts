import type { VariableMap } from './variables';
import type { StepGroup } from './step-organizer';
import type { RunRequest, RunResult } from './runner';

export type StepType = 'navigate' | 'click' | 'hover' | 'focus' | 'clear' | 'press' | 'fill' | 'select' | 'check' | 'upload' | 'assert' | 'wait' | 'screenshot';
export type LocatorType = 'css' | 'xpath' | 'role' | 'text' | 'label' | 'testId' | 'placeholder';
export type LocatorDiagnostic =
  | { status: 'available'; count: number }
  | { status: 'unavailable'; count: null; message: string };

export type Step = {
  id: string;
  type: StepType;
  selector?: string;
  locatorType?: LocatorType;
  role?: string;
  url?: string;
  value?: string;
  options?: string;
  assertion?: 'visible' | 'text' | 'value' | 'checked' | 'url' | 'urlContains' | 'enabled' | 'disabled' | 'attribute' | 'count' | 'title';
  timeout?: number;
  group?: StepGroup;
};

export type TestCase = { id: string; name: string; steps: Step[]; generatedCode: string; variables?: VariableMap };
export type ManagedTest = TestCase & { source?: 'studio' | 'existing'; readOnly?: boolean; relativePath?: string; tags?: string[]; folder?: string; updatedAt?: string };
export type Project = { name: string; testDir: string; baseURL?: string; projects?: string[]; createdAt?: string };
export type ProjectState = { project: Project; tests: ManagedTest[]; projectPath: string };

declare global {
  interface Window {
    studio?: {
      selectProject(): Promise<string | null>;
      openDefaultProject(): Promise<string | null>;
      createProject(name: string, location: string): Promise<string>;
      readProject(path: string): Promise<ProjectState>;
      saveTest(path: string, test: TestCase): Promise<boolean>;
      renameTest(path: string, testId: string, name: string): Promise<ManagedTest>;
      deleteTest(path: string, testId: string): Promise<boolean>;
      exportCode(fileName: string, code: string): Promise<boolean>;
      runTest(request: RunRequest): Promise<RunResult>;
      stopTest(): Promise<{ ok: boolean }>;
      openArtifact(path: string): Promise<boolean>;
      openProjectFolder(path: string): Promise<boolean>;
      startRecorder(url: string): Promise<{ ok: boolean }>;
      stopRecorder(): Promise<{ ok: boolean }>;
      countLocator(locatorType: LocatorType, selector: string, role?: string): Promise<LocatorDiagnostic>;
      onRecorderEvent(callback: (step: Step) => void): () => void;
      onRecorderError(callback: (message: string) => void): () => void;
    };
  }
}
