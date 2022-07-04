# ----------------------------------------------------------
# Docker Builder for Web broswer deployment
#
# This Dockerfile will build a docker image of the texas.service
# If you want to build the binary form under texas.docker/Dockerfile
# This docker image needs to be tagged texas-service
#
# ie %> docker build -t texas-service .
#

FROM lasagneopensystems/docker-lasagne-core:latest

# Need CMake for rabbitmq-c and dependencies for rabbitmq-c
RUN apt-get update && apt-get install -y cmake libssl-dev libssl1.0.0

RUN git config --global advice.detachedHead false \
  && git clone --depth 1 -b v0.9.0 git://github.com/alanxz/rabbitmq-c.git /opt/DEV/rabbitmq-c \
  && git clone --depth 1 -b 6.10 git://github.com/cesanta/mongoose.git /opt/DEV/mongoose \
  && git clone --depth 1 -b v3.1.0 git://github.com/nlohmann/json.git /opt/DEV/json

# TODO add lasagne-connector repo when it becomes available.

COPY lasagne-connector /opt/DEV/lasagne-connector
COPY texas /opt/DEV/texas
COPY scripts /opt/DEV/scripts
COPY test.conf /opt/DEV/test.conf


# Build the LASAGNE Connectors / RabbitMQ connector
#
RUN /opt/DEV/scripts/build_texas.sh

# TAF Server Entry for services
CMD /opt/DEV/scripts/run_texas.sh
