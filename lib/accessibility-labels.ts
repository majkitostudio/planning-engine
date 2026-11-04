export function removalActionLabel(label: string, context: string): string {
  return `${label}, ${context}`;
}

export function rosterHistoryControlLabel(
  label: string,
  employeeName: string,
  date: string,
): string {
  return `${label}, ${employeeName}, ${date}`;
}

export function rosterHistoryEmployeeContext(
  selectedEmployeeName: string | undefined,
  sourceName: string,
): string {
  return selectedEmployeeName || sourceName;
}

export function shouldFocusStepHeading(previousStep: number, currentStep: number): boolean {
  return previousStep !== currentStep;
}
