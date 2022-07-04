import { Subject, Subscription } from 'rxjs';
import { Amqp } from '../services/amqp';

const rabbitAdminUsername =  process.env['rabbitmq-username'];
const rabbitAdminPassword = process.env['rabbitmq-password'];
const releaseName = process.env.RELEASE_NAME;
const namespace =  process.env.NAMESPACE;

const amqpAddress: string = `amqp://${rabbitAdminUsername}:${rabbitAdminPassword}@${releaseName}-rabbitmq-ha.${namespace}.svc.cluster.local:5672`;

const amqpTracksExchange: string = "texas.tracks";
const amqpControlExchange: string = "texas.control";

export class AmqpListener {

  private tracksSubject = new Subject<any>();
  tracks$ = this.tracksSubject.asObservable();

  private controlSubject = new Subject<any>();
  control$ = this.controlSubject.asObservable();

  private subscriptions: Subscription;

  constructor() {
    const amqp: Amqp = new Amqp();

    amqp.connectAmqp(amqpAddress).then(() => {
      console.log("AMQP: Connected successfully");

      amqp.connectExchange(amqpTracksExchange).ta

      this.subscriptions = amqp.connectExchange(amqpTracksExchange).subscribe((track: any) => {
        console.log("AMQP: Track received: " + JSON.stringify(track));
        this.tracksSubject.next(track);
      });

      this.subscriptions = amqp.connectExchange(amqpControlExchange, "topic", "#").subscribe((control: any) => {
        console.log("AMQP: Control received: " + JSON.stringify(control));
        this.controlSubject.next(control);
      });
    }).catch(e => {
      console.error(e);
      process.exit(1);
    });
  }

  close() {
    this.subscriptions.unsubscribe();
  }
}
