import { Connection, Message } from 'amqp-ts';
import * as msgpack5 from 'msgpack5';
import { Observable, Subscriber } from 'rxjs';

/**
 * Class to manage the AMQP connection.
 */
export class Amqp {
  // The connection object.
  private connection!: Connection;

  // Good ol message pack.
  private msgpack = msgpack5();

  /**
   * Connects to the broker.
   * @param address - the address of the amqp broker.
   */
  public async connectAmqp(address: string): Promise<void> {
    // Go for it - should forever retry?
    this.connection = new Connection(
      address,
      {},
      { retries: 1000, interval: 1000 }
    );

    return this.connection.initialized;
  }

  /**
   * Connects to the given exchange.
   * @param exchange - the name of the exchange.
   * @param type - the type of exchange
   * @param pattern - any routing pattern.
   */
  public connectExchange<T>(
    exchange: string,
    type: string = 'fanout',
    pattern: string = ''
  ) {
    return Observable.create((observer: Subscriber<T>) => {
      const queue = this.connection.declareQueue(exchange + '.tasking.queue', {
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
        }
      );
    });
  }
}
