export type EnvironmentProfile = { name: string; baseURL?: string; values: Record<string, string> };

export function resolveEnvironment(profile: EnvironmentProfile, overrides: Record<string, string> = {}): EnvironmentProfile {
  return { name: profile.name, baseURL: profile.baseURL, values: { ...profile.values, ...overrides } };
}

export const defaultEnvironments: EnvironmentProfile[] = [
  { name: 'Local', baseURL: 'http://127.0.0.1:3000', values: {} },
  { name: 'Project', values: {} }
];
