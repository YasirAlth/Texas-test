FROM node:8.11.1

ARG port=3131
ARG env=development

RUN mkdir /opt/app
WORKDIR /opt/app

COPY package.json package.json
RUN npm install

COPY . .
RUN npm run build

ENV PORT $port
EXPOSE $port

ENV NODE_ENV $env
CMD ["node", "lib/"]