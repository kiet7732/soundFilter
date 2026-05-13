//  Types cho EnvironmentWorkspace
export interface BackendTrack {
  label: string;
  confidence: number;
  file: string;
}

export interface EnvironmentTrack {
  id: string;
  name: string;
  fileName: string;
  confidence: number;
  icon: string; // Icon name as string
  color: string;
  dspEnabled: boolean;
}
