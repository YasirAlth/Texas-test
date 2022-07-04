import {Component, OnDestroy, OnInit} from '@angular/core';
import {LasagneService} from '../../services/lasagne';
import {Subscription} from 'rxjs';

@Component({
  selector: 'texas-connection-status',
  templateUrl: './connection-status.component.html',
  styleUrls: ['./connection-status.component.scss'],
})
export class ConnectionStatusComponent implements OnInit, OnDestroy {

  connected = false;

  sub: Subscription = new Subscription();

  constructor(private lasagne: LasagneService) {
    this.sub.add(this.lasagne.connectionChanged$.subscribe(connected => {
      this.connected = connected;
    }));
  }

  ngOnInit() {}

  ngOnDestroy() {
    this.sub.unsubscribe();
  }
}
