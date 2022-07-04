import * as cors from 'cors';
import * as bodyParser from 'body-parser';
import * as express from 'express';
import * as http2 from 'spdy';
import { Eta } from './api/eta';

const PORT = process.env.PORT || 3131;

const app = express();
app.use(cors());
app.use(bodyParser.json());

const router = express.Router();
const eta = new Eta(router);
app.use('/', router);

const opts: http2.server.ServerOptions = {
  spdy: { plain: true }, // true to make plain http
};

http2.createServer(opts, app).listen(PORT, () => {
  console.log(`running on port: ${PORT}`);
  console.log(`environment: ${process.env.NODE_ENV}`);
});
