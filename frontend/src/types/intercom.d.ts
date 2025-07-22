interface Window {
  Intercom?: (command: string, ...args: unknown[]) => void;
  intercomSettings?: {
    app_id?: string;
    [key: string]: unknown;
  };
}