import { AmqpListener } from './logger/amqp-listener';
import { PrometheusExporter } from './logger/prometheus-exporter';
import { CouchdbLogger } from './logger/couchdb-logger';

// use these two environment variables to control behaviour of logger
const useCouchdb = process.env.TEXAS_LOGGER_COUCHDB != '0';
const usePrometheus = process.env.TEXAS_LOGGER_PROMETHEUS != '0';

const amqpListener = new AmqpListener();
let couchdbLogger: CouchdbLogger;
let prometheusExporter: PrometheusExporter;

if (useCouchdb) {
  couchdbLogger = new CouchdbLogger(amqpListener.tracks$, amqpListener.control$);
}
if (usePrometheus) {
  prometheusExporter = new PrometheusExporter(amqpListener.tracks$);
}

process.on('SIGTERM', () => {
  amqpListener.close();
  couchdbLogger.close();
  prometheusExporter.close();
});
