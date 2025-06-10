import { TranscriptService } from './TranscriptService';
import { SessionService } from './SessionService';
import { ContextService } from './ContextService';
import { SummaryService } from './SummaryService';
import { ChecklistService } from './ChecklistService';
import { RecordingService } from './RecordingService';

export class ServiceFactory {
  private static instance: ServiceFactory;
  
  private transcriptService: TranscriptService;
  private sessionService: SessionService;
  private contextService: ContextService;
  private summaryService: SummaryService;
  private checklistService: ChecklistService;
  private recordingService: RecordingService;
  
  private constructor() {
    this.transcriptService = new TranscriptService();
    this.sessionService = new SessionService();
    this.contextService = new ContextService();
    this.summaryService = new SummaryService();
    this.checklistService = new ChecklistService();
    this.recordingService = new RecordingService();
  }
  
  static getInstance(): ServiceFactory {
    if (!ServiceFactory.instance) {
      ServiceFactory.instance = new ServiceFactory();
    }
    return ServiceFactory.instance;
  }
  
  getTranscriptService(): TranscriptService {
    return this.transcriptService;
  }
  
  getSessionService(): SessionService {
    return this.sessionService;
  }
  
  getContextService(): ContextService {
    return this.contextService;
  }
  
  getSummaryService(): SummaryService {
    return this.summaryService;
  }
  
  getChecklistService(): ChecklistService {
    return this.checklistService;
  }
  
  getRecordingService(): RecordingService {
    return this.recordingService;
  }
}

// Convenience exports
export const transcriptService =
  ServiceFactory.getInstance().getTranscriptService();
export const sessionService =
  ServiceFactory.getInstance().getSessionService();
export const contextService =
  ServiceFactory.getInstance().getContextService();
export const summaryService =
  ServiceFactory.getInstance().getSummaryService();
export const checklistService =
  ServiceFactory.getInstance().getChecklistService();
export const recordingService =
  ServiceFactory.getInstance().getRecordingService();
