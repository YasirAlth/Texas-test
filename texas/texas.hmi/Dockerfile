# instructions for texas.hmi:
#   git clone git@labs.consilium.technology:7999/texas/texas.hmi.git
#   cd texas.hmi
#   docker build -t texas.hmi .
#   docker run -dp 80:3000 texas.hmi
#     or: docker logs -f `docker run -dp 80:3000 texas.hmi`

FROM node:10.15.1

# override with:
#   docker build -t texas.hmi --build-arg <name>=<value> .
ARG port=3000
ARG env=production
ARG server=texas.ct-a.ws
ARG couch=texas:texas

# Copy across the texas hmi appplication and build.
RUN mkdir /opt/texas.hmi
WORKDIR /opt/texas.hmi

# install ionic
RUN npm install -g ionic@latest angular-http-server envsub --no-optional

COPY ./src src
COPY ./package.json package.json
COPY ./package-lock.json package-lock.json
COPY ./typings typings
COPY ./resources resources

COPY ./config.xml config.xml
COPY ./ionic.config.json ionic.config.json
COPY ./tsconfig.json tsconfig.json
COPY ./tslint.json tslint.json
COPY ./.env .env
COPY ./angular.json angular.json
COPY ./ngsw-config.json ngsw-config.json
COPY ./run-hmi.sh run-hmi.sh

RUN sed -i '/"cordova-plugin-texas-lasagne": "file:texas.cordova",/d' ./package.json
RUN sed -i '/"cordova-plugin-restart": "file:texas.restart",/d' ./package.json
ENV TEXAS_SERVER $server
ENV TEXAS_SERVER_SSL $ssl
ENV TEXAS_COUCH_AUTH $couch
RUN npm install
#RUN mkdir www && ionic build --prod -- --base-href /hmi/
RUN mkdir www && ionic build --prods
RUN pwd

CMD ["./run-hmi.sh"]
