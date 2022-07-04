# instructions for bargeos:
#   sudo pkg install git -e BR2_PACKAGE_OPENSSL=y -e BR2_PACKAGE_LIBCURL=y
#   git config --global http.sslCAinfo /etc/ssl/certs/ca-certificates.crt
#   git clone git@labs.consilium.technology:7999/texas/texas.tasking.git
#   cd texas.tasking
#   docker build -t 'texas.tasking' .
#   docker run -d texas.tasking
#     or: docker logs -f `docker run -d texas.tasking`

FROM node:10.15.1

# override with:
#   docker build -t texas.tasking --build-arg <name>=<value> .
ARG env=production

RUN mkdir /opt/app
WORKDIR /opt/app

COPY package.json package.json
RUN npm install

COPY . .
RUN npm run build

ENV NODE_ENV $env
CMD ["node", "-r", "esm", "lib"]
