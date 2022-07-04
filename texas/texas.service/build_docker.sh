#!/usr/bin/env bash

docker build -t texas-lasagne .

pushd texas.docker
 docker build -t texas-service-bin .

popd > /dev/null
