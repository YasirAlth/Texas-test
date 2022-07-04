FROM node:10.15.1

# Copy across the texas logging appplication and build.
RUN mkdir /opt/couch.setup
WORKDIR /opt/couch.setup
COPY ./package.json package.json
RUN npm install --verbose
COPY ./ .
