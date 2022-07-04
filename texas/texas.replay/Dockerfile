FROM node:10.15.1

ARG env=production

RUN mkdir /opt/texas.replay
WORKDIR /opt/texas.replay
COPY ./package.json package.json
RUN npm install --verbose  --no-optional
COPY . .
RUN npm run prestart:prod
COPY ./production.env /opt/texas.replay/dist

ENV NODE_ENV $env

CMD ["node", "/opt/texas.replay/dist/main.js"]
