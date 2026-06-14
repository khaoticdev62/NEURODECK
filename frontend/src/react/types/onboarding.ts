export type OnboardingStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed'
  | 'skipped';

export type OnboardingStep =
  | 'welcome'
  | 'environment'
  | 'models'
  | 'preferences'
  | 'plugins'
  | 'packages'
  | 'finish';

export interface SetupWarning {
  code: string;
  message: string;
  fix?: string;
}

export interface SetupError {
  code: string;
  message: string;
  fix?: string;
}

export interface OnboardingDiagnosticResult {
  pty_ok: boolean;
  pty_details: string;
  network_ok: boolean;
  network_details: string;
  keychain_ok: boolean;
  keychain_details: string;
  audio_ok: boolean;
  audio_details: string;
  ssh_ok: boolean;
  ssh_details: string;
  tts_ok: boolean;
  tts_details: string;
}

export interface OnboardingState {
  status: OnboardingStatus;
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  skippedSteps: OnboardingStep[];
  warnings: SetupWarning[];
  errors: SetupError[];
  modelConfigured: boolean;
  pluginsDetected: boolean;
  completedAt?: string;
}
