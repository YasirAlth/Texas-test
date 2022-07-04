###############################################################################
#
# For more information about using CMake with Android Studio, read the
# documentation: https://d.android.com/studio/projects/add-native-code.html
#
###############################################################################

# Set the minmum required version of cmake for this project.
# https://cmake.org/cmake/help/v3.4/command/cmake_minimum_required.html

cmake_minimum_required(VERSION 3.4.1)

#------------------------------------------------------------------------------

# Add the given directories to those the compiler uses to search for include files.
# https://cmake.org/cmake/help/v3.4/command/include_directories.html

include_directories($ENV{ACE_ROOT}
                    $ENV{TAO_ROOT}
                    $ENV{TAO_ROOT}/orbsvcs
                    $ENV{DAF_ROOT}
                    $ENV{TAF_ROOT}
                    $ENV{SYSROOT}/usr/include)

#------------------------------------------------------------------------------

# Specify directories in which the linker will look for libraries.
# https://cmake.org/cmake/help/v3.4/command/link_directories.html

link_directories($ENV{ACE_ROOT}/lib 
                 $ENV{DAF_ROOT}/lib 
                 $ENV{DDS_ROOT}/lib)

#------------------------------------------------------------------------------

# Adds library to the project using the specified source files
# https://cmake.org/cmake/help/v3.4/command/add_library.html

# Android Note: Gradle automatically packages shared libraries with your APK.

add_library( # Sets the name of the library.
             Taf-jni

             # Sets the library as a shared library.
             SHARED

             # Provides a relative path to your source file(s).
             Taf-jni.cpp )

#------------------------------------------------------------------------------

# This command is used to find a library. 
# A cache entry named by <VAR> is created to store the result of this command.
# https://cmake.org/cmake/help/v3.4/command/find_library.html

# Android: Because CMake includes system libraries in the search path by 
# default, you only need to specify the name of the public NDK library to add.

find_library( # Sets the name of the path variable.
              log-lib

              # Specifies the name of the NDK library to locate.
              log )

#------------------------------------------------------------------------------

# Specifies libraries CMake should link to your target library. You
# can link multiple libraries, such as libraries you define in this
# build script, prebuilt third-party libraries, or system libraries.
# https://cmake.org/cmake/help/v3.4/command/target_link_libraries.html

target_link_libraries( # Specifies the target library.
                       Taf-jni

                       # Links the target library to the NDK log library.
                       ${log-lib}

                       # Links the target library to LASAGNE libraries
                       # gnustl_shared
                        ACE
                        DAF
                        TAF
                        TAO
                        TAO_AnyTypeCode
                        TAO_PortableServer
                        TAO_IORTable
                        TAO_Svc_Utils
                        TAO_CosNaming
                        TAO_CodecFactory
                        TAO_PI
                        TAO_Strategies)

#------------------------------------------------------------------------------
