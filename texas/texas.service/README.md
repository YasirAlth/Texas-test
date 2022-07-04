# TexasService

Texas service is a LASAGNE service which acts as a communication gateway, forwarding local updates to external devices/systems and forwarding remote updates to the application.

* Messages are transferred to/from the Application using the Websocket protocol.
* Messages are transferred to/from the RabbitMQ server using the AMQP protocol.
* Messsages are broadcast from the TexasService to all subscribers of the fanout exchange (i.e. all other TexasServices)

 +-------------+                 +-------------+                 +------------+
 |             |                 |             |                 |            |
 |    TEXAS    | 1  Websocket  1 |    TEXAS    | *    AMQP     1 |  RABBITMQ  |
 |     APP     |-----------------|   SERVICE   |-----------------|   SERVER   |
 |             |                 |             |                 |            |
 +-------------+                 +-------------+                 +------------+

## Dependencies

* LASAGNE + Connectors
* [Mongoose](https://github.com/cesanta/mongoose) v6.10
* [nlohmann/json](https://github.com/nlohmann/json)  v3.1.0

## Environment Variables

* All LASAGNE & LASAGNE Connectors environment variables

## Deployment

At present, after the native TexasService has been cross-compiled for Android, it must then be copied to the libs folder in the texas.cordova repository which makes them available for the texas.cordova plugin used in the texas.hmi application.

## Docker Deployment

There is the ability to build a docker image for server deployment. The first docker file builds off the [lasagne-core](https://github.com/sioutisc/docker-lasagne-core) image and follows the pattern of building a development images "texas-service" and a binary version for service deployment "texas-service-bin"

- Dockerfile : "texas-lasagne" image - use 'docker build -t texas-lasagne .'
- texas.docker/Dockerfile : "texas-service-bin" image - use 'docker build -t texas-service-bin .'

For running the image you have a couple of configuration options:
- port exposed on 9999 for the texas service to be reached
- /opt/conf in the container should be a mount point for configuration options.

For example:
```bash
docker run -it -p 9999:9999 -v my-conf:/opt/conf texas-service-bin
```

Caveats:
- lasagne-connectors is needed in the texas.service folder as there is no open repo for this it needs to manually be added. TODO Find a better method - happy to commit lasagne-connectors/rabbitmq into this repo?
