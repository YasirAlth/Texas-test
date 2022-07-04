import { Component, Inject, } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';
import { NGXLogger } from 'ngx-logger';

import { Session } from '../../model/session';
import { ReplayService } from '../../services/replay.service';

@Component({
  selector: 'app-open-replay-dialog',
  templateUrl: './open-replay-dialog.component.html',
  styleUrls: ['./open-replay-dialog.component.scss']
})
export class OpenReplayDialogComponent {
  sessions: Session[] = [];
  selectedSession: Session;

  constructor(private readonly logger: NGXLogger,
    private readonly replayService: ReplayService,
    public dialogRef: MatDialogRef<OpenReplayDialogComponent>) {
    this.logger.trace(`${OpenReplayDialogComponent.name}::constructor(...)`);

    // TODO probalby the wrong place for this...
    // no dynamic retry logic etc.
    this.replayService.getSessions()
      .subscribe(sessions => this.sessions = sessions);
  }

  getValue(event) {
    this.logger.trace(`${OpenReplayDialogComponent.name}::getValue()`);
    // hocky until we find a better way...
    const selectedSessionId: string = event.target.parentNode.innerText;
    for (const session of this.sessions) {
      if (session.id === selectedSessionId.trim()) {
        this.selectedSession = session;
        break;
      }
    }
  }

  onNoClick(): void {
    this.logger.trace(`${OpenReplayDialogComponent.name}::onNoClick()`);
    this.dialogRef.close();
  }

  onCancel(): void {
    this.logger.trace(`${OpenReplayDialogComponent.name}::onCancel()`);
    this.dialogRef.close();
  }

  onSubmit(): void {
    this.logger.trace(`${OpenReplayDialogComponent.name}::onSubmit()`);
    console.log('selected selection', this.selectedSession);
    this.dialogRef.close(this.selectedSession);
  }
}
