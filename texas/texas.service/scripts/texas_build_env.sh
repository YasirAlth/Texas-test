
#source $DEV_ROOT/lasagne-connector/config/config.sh
export L_CONNECTOR_ROOT=$DEV_ROOT/lasagne-connector
export RABBITMQC_ROOT=$DEV_ROOT/rabbitmq-c
export TEXAS_FEATURE_FILE=$DEV_ROOT/scripts/texas.features

export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:$RABBITMQC_ROOT/lib
