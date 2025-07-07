interface Window {
  Intercom?: (command: string, ...args: any[]) => void;
  intercomSettings?: {
    app_id?: string;
    [key: string]: any;
  };
}