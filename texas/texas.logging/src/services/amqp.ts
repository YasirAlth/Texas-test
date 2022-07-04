import { Connection, Message } from 'amqp-ts';
import * as msgpack5 from "msgpack5";
import { Observable, Subscriber } from 'rxjs';

export class Amqp {

  private connection: Connection;

  private msgpack = msgpack5();

  public async connectAmqp(address: string): Promise<void> {
    this.connection = new Connection(address, {}, { retries: 5, interval: 1500 });

    return this.connection.initialized;
  }

  public connectExchange<T>(exchange: string, type: string = "fanout", pattern: string  = "") {
    return Observable.create((observer: Subscriber<T>) => {

      const queue = this.connection.declareQueue(exchange + ".logger.queue", {
        autoDelete: true,
        durable: false,
      });
      queue.bind(this.connection.declareExchange(exchange, type), pattern);
      queue.activateConsumer(
        (msg: Message) => {

          const decoded = this.msgpack.decode(msg.content);
          observer.next(decoded);
        },
        {
          exclusive: true,
          noAck: true,
        },
      );
    });
  }
}
