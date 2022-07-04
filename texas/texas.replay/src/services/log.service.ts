import { Injectable, Inject } from '@nestjs/common';
import { stripIndent } from 'common-tags';
import * as nano from 'nano';
import { ServerScope } from 'nano';
import { Logger } from 'winston';

import { ConfigService } from '../modules/config/services/config.service';
import { TexasDeviceMessage } from '../model/message';
import { Trial } from '../model/trial';
import { TrialsService } from './trials.service';

@Injectable()
export class LogService {
  private static readonly ALL_MESSAGES_KEY = '';
  private readonly server: ServerScope;
  private readonly msgMap = new Map<string, TexasDeviceMessage[]>();

  constructor(@Inject('winston') private readonly logger: Logger,
    private readonly config: ConfigService,
    private readonly trials: TrialsService) {
    this.logger.silly(`${LogService.name}::constructor(...)`);

    let couchAddress = '';
    if(config.get('USE_ENVIRONMENT')) {
      couchAddress = "http://" +  process.env.adminUsername + ":" + process.env.adminPassword + "@" + process.env.RELEASE_NAME  + "-couchdb." + process.env.NAMESPACE + ".svc.cluster.local:5984";
    } else {
      couchAddress =  config.get('COUCHDB_ADDRESS');
    }

    console.log('Using couchdb address: ' + couchAddress);

    this.server = nano({ url: couchAddress });
    if (this.server === null) {
      console.error('Exiting, couch not connect to couch on: ' + couchAddress);
      process.exit(1);
    } else {
      nano.db.list().then((body) => {
        // body is an array
        body.forEach((db) => {
          console.log(db);
        });
      }).catch(e => {
        console.error('Exiting, couch not connect to couch on: ' + couchAddress);
        process.exit(1);
      });
    }
  }

  // Get all messages from couchdb
  public getAllMessages(): Promise<TexasDeviceMessage[]> {
    if (this.msgMap.has(LogService.ALL_MESSAGES_KEY)) {
      return new Promise(resolve => this.msgMap.get(LogService.ALL_MESSAGES_KEY));
    } else {
      this.msgMap[LogService.ALL_MESSAGES_KEY] = [];
      const messages = this.msgMap[LogService.ALL_MESSAGES_KEY];
      return Promise.all(
        // Add all messages to the in-memory message list
        [this.addAllMessagesFromDb('tracksamqp'),
        this.addAllMessagesFromDb('alertsamqp')])
        .then(() => {
          // Sort the messages by time ascending
          messages.sort(
            (a: TexasDeviceMessage, b: TexasDeviceMessage) =>
              a.timestamp.getTime() - b.timestamp.getTime());
          this.logger.info(`${messages.length} \
            messages loaded from couchdb; ordered by time`);
          return messages;
        });
    }
  }

  // Get messages for a specific trial from couchdb
  public getMessages(run: Trial): Promise<TexasDeviceMessage[]> {
    this.logger.debug(`${LogService.name}::loadMessages(${run})`);
    if (!run.name) {
      this.logger.error('Invalid parameter, run.name is undefined');
      return new Promise((resolve, reject) => reject(true));
    } else if (run.name === '') {
      this.logger.error('Invalid parameter, run.name is empty');
      return new Promise((resolve, reject) => reject(true));
    } // No guarentees if dates are invalid!

    if (this.msgMap.has(run.name)) {
      // Logs have already been loaded, return previously loaded logs
      return new Promise(resolve => this.msgMap.get(run.name));
    } else {
      this.msgMap.set(run.name, []);
      // Get all log messages for this run
      return Promise.all(
        // Add all messages to the in-memory message list
        [this.addMessagesFromDb('tracksamqp', run),
        this.addMessagesFromDb('alertsamqp', run),
        this.addMessagesFromDb('controlamqp', run)])
        .then(() => {
          // Sort the messages by time ascending
          const messages = this.msgMap.get(run.name);
          messages.sort((a: TexasDeviceMessage, b: TexasDeviceMessage) =>
            a.timestamp.getTime() - b.timestamp.getTime());
          this.logger.info(stripIndent`${messages.length} messages loaded from \
            couchdb; ordered by time`);
          return messages;
        });
    }
  }

  // Add messages from db to 'ALL MESSAGES' - ignore start / end times
  private addAllMessagesFromDb(dbName: string): Promise<void> {
    const db = this.server.db.use(dbName);
    return db.list({ include_docs: true }).then(result => {
      this.logger.info(`${result.rows.length} messages from ${dbName}`);
      result.rows.forEach((element: any) => {
        const msg = (element.doc as TexasDeviceMessage);
        msg.timestamp = new Date(msg.timestamp);
        this.msgMap[LogService.ALL_MESSAGES_KEY].push(msg);
        this.logger.info(`Added message dated: ${msg.timestamp}`);
      });
    });
  }

  // Add messages from db to run/trial - based on trial start / end times
  private addMessagesFromDb(dbName: string, run: Trial): Promise<void> {
    this.logger.debug(`${LogService.name}::addMessagesFromDb(${dbName}, ${run})`);
    const start = new Date(run.start);
    const end = new Date(run.end);
    const db = this.server.db.use(dbName);
    return db.list({ include_docs: true }).then((result) => {
      this.logger.info(`${result.rows.length} messages from ${dbName}`);
      // Process the results from the database
      result.rows.forEach((element: any) => {
        const msg = (element.doc as TexasDeviceMessage);
        msg.timestamp = new Date(msg.timestamp);
        if (msg.timestamp.getTime() >= start.getTime() &&
          end.getTime() > msg.timestamp.getTime()) {
          const messages = this.msgMap.get(run.name);
          messages.push(msg);
          this.logger.info(`Added message dated: ${msg.timestamp}`);
        }
      });
    });
  }
}
