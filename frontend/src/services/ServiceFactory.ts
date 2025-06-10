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
  
  static getTranscriptService(): TranscriptService {
    return ServiceFactory.getInstance().transcriptService;
  }
  
  static getSessionService(): SessionService {
    return ServiceFactory.getInstance().sessionService;
  }
  
  static getContextService(): ContextService {
    return ServiceFactory.getInstance().contextService;
  }
  
  static getSummaryService(): SummaryService {
    return ServiceFactory.getInstance().summaryService;
  }
  
  static getChecklistService(): ChecklistService {
    return ServiceFactory.getInstance().checklistService;
  }
  
  static getRecordingService(): RecordingService {
    return ServiceFactory.getInstance().recordingService;
  }

export const services = ServiceFactory.getInstance();

// Convenience exports
export const transcriptService = services.getTranscriptService();
export const sessionService = services.getSessionService();
export const contextService = services.getContextService();
export const summaryService = services.getSummaryService();
export const checklistService = services.getChecklistService();
export const recordingService = services.getRecordingService();
