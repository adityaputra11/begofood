import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';

export interface AnalysisEvent {
  type: 'started' | 'completed' | 'failed';
  menuId: string;
  menuName: string;
  timestamp: string;
  message?: string;
}

@Injectable()
export class AnalysisEventService {
  private events = new Subject<AnalysisEvent>();

  /** Subscribe ke stream events */
  get stream() {
    return this.events.asObservable();
  }

  emit(event: AnalysisEvent) {
    this.events.next(event);
  }
}
