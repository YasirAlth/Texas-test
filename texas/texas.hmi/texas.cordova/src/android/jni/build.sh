#!/bin/bash

# TODO This script only works with the texas.vagrant VM

source /vagrant/scripts/android_env.sh
source /vagrant/scripts/lasagne_build_env.sh
source /vagrant/scripts/lasagne_android_env.sh

export BUILD_DIR=build-$ANDROID_ABI
export LIB_DIR=lib
export CMAKE_ROOT=$ANDROID_SDK_HOME/cmake/3.6.4111459
export CMAKE_BIN=$CMAKE_ROOT/bin

rm -rf $LIB_DIR
rm -rf $BUILD_DIR;

if [[ ! -d "$BUILD_DIR" ]]; then

  mkdir -p $BUILD_DIR

  pushd $BUILD_DIR

    $CMAKE_BIN/cmake \
      -DCMAKE_BUILD_TYPE=Release \
      -DCMAKE_TOOLCHAIN_FILE=$ANDROID_NDK_HOME/build/cmake/android.toolchain.cmake \
      -DANDROID_ABI=$ANDROID_ABI \
      -DANDROID_NDK=$ANDROID_NDK_HOME \
      -DANDROID_NATIVE_API_LEVEL=$NDK_PLATFORM \
      -DANDROID_TOOLCHAIN=clang \
      -DANDROID_STL=gnustl_shared \
      ..

    make

    mkdir -p ../$LIB_DIR && cp libtaf-jni.so $_

  popd

fi