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

# install global dependepncies
RUN npm install -g angular-http-server envsub --no-optional

RUN mkdir /opt/texas.replay.hmi
WORKDIR /opt/texas.replay.hmi
COPY ./angular.json  angular.json
COPY ./package.json package.json
COPY ./package-lock.json  package-lock.json
COPY ./tsconfig.json  tsconfig.json
COPY ./tslint.json  tslint.jsons
COPY ./src  src

# COPY ./.env .env
RUN npm install --verbose --no-optional
# RUN npm run configure
RUN more src/environments/environment.prod.ts
RUN npm run build

CMD ["angular-http-server", "--path", "/opt/texas.replay.hmi/dist/texas-replay-hmi",  "-p", "80"]
