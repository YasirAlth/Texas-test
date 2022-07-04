#!/usr/bin/env bash

TEXAS_SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Setup up ENVIRONMENT
source $TEXAS_SCRIPT_DIR/docker_build_env.sh
source $TEXAS_SCRIPT_DIR/texas_build_env.sh

# Build up rabbitmq-c


# TODO Better checks on directory existing and
# build directory existing
pushd $RABBITMQC_ROOT > /dev/null
  cmake -DCMAKE_INSTALL_PREFIX="" -DCMAKE_INSTALL_LIBDIR=lib .
  make DESTDIR=$RABBITMQC_ROOT install
  ls -al $RABBITMQC_ROOT/lib
pushd > /dev/null


# Build the
pushd $TEXAS_SCRIPT_DIR > /dev/null
$ACE_ROOT/bin/mwc.pl -type gnuace TexasDocker.mwc

make --jobs=1 rabbitmq=1 ssl=1

# Copy over the system libssl.so for bundling
# TODO dig up the script that resolves the ldd dependencies and copies them
ldd  $DAF_ROOT/lib/libTexas.so
cp -L -v /usr/lib/x86_64-linux-gnu/libssl.so* $DAF_ROOT/lib/
cp -L -v /lib/x86_64-linux-gnu/libssl.so* $DAF_ROOT/lib/
cp -L -v /lib/x86_64-linux-gnu/libcrypto.so* $DAF_ROOT/lib/

#Crappy hack to get the right version name


popd > /dev/null
