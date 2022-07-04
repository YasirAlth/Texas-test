import { Injectable } from '@angular/core';
import { Subject, ReplaySubject, Observable } from 'rxjs';

@Injectable()
export class ErrorService {
  private readonly errorSource: Subject<any> = new ReplaySubject<any>();
  public readonly errorChannel$: Observable<any> = this.errorSource.asObservable();

  constructor() {

  }

  public log(message: string, consoleError?: boolean): void {
    if (consoleError) {
      console.error(message);
    }
    this.errorSource.next(message);
  }

}