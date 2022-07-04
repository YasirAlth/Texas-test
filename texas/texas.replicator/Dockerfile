# node engine >=10.0.0 specified in package.json
FROM node:10.15.1

# override with:
#   docker build -t texas.replicator --build-arg <name>=<value>
ARG env=production

RUN mkdir /opt/app
WORKDIR /opt/app

COPY package.json package.json
RUN npm install

COPY . .
RUN npm run build

ENV NODE_ENV $env
CMD ["node", "lib"]
