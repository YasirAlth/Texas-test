import { Component, Inject, } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';
import { NGXLogger } from 'ngx-logger';

import { Trial } from '../../model/trial';
import { ReplayService } from 'src/app/services/replay.service';

const EMPTY_STRING = '';

export interface DialogData {
  trials: Trial[];
}

@Component({
  selector: 'app-new-replay-dialog',
  templateUrl: './new-replay-dialog.component.html',
  styleUrls: ['./new-replay-dialog.component.scss']
})
export class NewReplayDialogComponent {
  selectedTrial: Trial = undefined;

  constructor(private readonly logger: NGXLogger,
    private readonly replayService: ReplayService,
    public dialogRef: MatDialogRef<NewReplayDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData) {
    this.logger.trace(`${NewReplayDialogComponent.name}::constructor(...)`);
  }

  onNoClick(): void {
    this.logger.trace(`${NewReplayDialogComponent.name}::onNoClick()`);
    this.dialogRef.close();
  }

  onCancel(): void {
    this.logger.trace(`${NewReplayDialogComponent.name}::onCancel()`);
    this.dialogRef.close();
  }

  onSubmit(): void {
    this.logger.trace(`${NewReplayDialogComponent.name}::onSubmit()`);
    this.replayService.create(this.selectedTrial).subscribe(
      result => this.dialogRef.close(result));
  }

  getTrialStartTime() {
    this.logger.trace(`${NewReplayDialogComponent.name}::getTrialStartTime()`);
    return this.selectedTrial ? new Date(this.selectedTrial.start) : EMPTY_STRING;
  }

  getTrialEndTime() {
    this.logger.trace(`${NewReplayDialogComponent.name}::getTrialEndTime()`);
    return this.selectedTrial ? new Date(this.selectedTrial.end) : EMPTY_STRING;
  }
}
