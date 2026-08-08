export type VariableMap = Record<string, string>;

const tokenPattern = /\{\{\s*([A-Za-z_][\w.-]*)\s*\}\}/g;

export function extractVariables(value: string): string[] {
  const names: string[] = [];
  const seen = new Set<string>();

  for (const match of value.matchAll(tokenPattern)) {
    const name = match[1];
    if (!seen.has(name)) {
      seen.add(name);
      names.push(name);
    }
  }

  return names;
}

export function replaceVariables(value: string, variables: VariableMap): string {
  return value.replace(tokenPattern, (token, name: string) => {
    const replacement = variables[name];
    return typeof replacement === 'string' ? replacement : token;
  });
}
