import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material';
import { NGXLogger } from 'ngx-logger';

import { OpenReplayDialogComponent } from '../open-replay-dialog/open-replay-dialog.component';
import { NewReplayDialogComponent } from '../new-replay-dialog/new-replay-dialog.component';

import { ReplayService } from '../../services/replay.service';
import { Trial } from '../../model/trial';


@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss']
})
export class MenuComponent implements OnInit {
  trials: Trial[] = [];

  constructor(private readonly logger: NGXLogger,
    private readonly replayService: ReplayService,
    public dialog: MatDialog) { }

  ngOnInit() {
    this.replayService.getTrials()
      .subscribe(
        trials => {
          this.logger.info('Receieved trials', trials);
          this.trials = trials; // Update trials selector
        },
        err => this.logger.error(`ERROR: Unable to get trials: ${err}`)
      );
  }

  newReplayDialog() {
    const dialogRef = this.dialog.open(NewReplayDialogComponent, {
      width: '600px',
      data: {
        trials: this.trials
      }
    });
    dialogRef.afterClosed().subscribe(result => {
      this.logger.info('The dialog was closed');
      this.replayService.session = result;
    });
  }

  openReplayDialog() {
    const dialogRef = this.dialog.open(OpenReplayDialogComponent, {
      width: '600px'
    });
    dialogRef.afterClosed().subscribe(result => {
      this.logger.info('The dialog was closed');
      this.replayService.session = result;
    });
  }
}
