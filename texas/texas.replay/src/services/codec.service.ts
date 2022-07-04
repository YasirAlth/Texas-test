import { Injectable, Inject } from '@nestjs/common';
import * as msgpack from 'msgpack';
// import * as msgpack from 'msgpack-lite';
import { Logger } from 'winston';

/*
 * In order to get msgpack working I have moved the release that
 * node-gyp made and changed the to the following in msgpack.js:
 * mpBindings = require(__dirname +"/Release/msgpackBinding.node");
 * we will revisit this and fix this after the software conference
 */

@Injectable()
export class CodecService {

  constructor(@Inject('winston') private readonly logger: Logger) {
    this.logger.debug(`${CodecService.name}::constructor(...)`);
  }

  public encode(obj: any): Buffer {
    this.logger.debug(`${CodecService.name}::encode(${obj})`);
    // return msgpack.encode(obj);
    return msgpack.pack(obj);
  }

  public decode(buf: Buffer): any {
    this.logger.debug(`${CodecService.name}::decode(${buf})`);
    // return msgpack.decode(buf);
    return msgpack.unpack(buf);
  }
}