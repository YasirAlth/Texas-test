#!/usr/bin/env bash

export RABBITMQC_ROOT=/opt/DEV/rabbitmq-c

export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:$RABBITMQC_ROOT/lib

$DAF_ROOT/bin/TAFServer -TAFProperties /opt/conf/lasagne.properties:default
