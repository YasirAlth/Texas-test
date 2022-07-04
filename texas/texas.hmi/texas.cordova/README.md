# Texas Cordova

This project contains the [Cordova](https://cordova.apache.org/docs/en/latest/guide/overview/index.html) plugin for controlling the execution of a [LASAGNE](https://github.com/LASAGNE-Open-Systems) Server on an Android armv8a device. The plugin is intended to be installed in the texas.hmi application.

## Investigation into controlling Android Services

A pdf can be found in 'docs/LASAGNE-Android-Service-Control.pdf', detailing the investigation that went into controlling LASAGNE services on Android.

## Modifying C/C++ files

If you modify the taf-jni.c or other C/C++ files be sure to re-build using the ndk-build script to update the libtaf-jni.so binary.

## Usage in javascript code

The plugin must be installed using the cordova CLI

```Javascript

// Declaration, usually placed directly under the import statements
declare let taf: any;

if (typeof taf !== 'undefined') {

    taf.start(

        // success callback
        (data) => {
            console.log(data);
        },

        // failure callback
        (err) => {
            console.log(err);
        },

        // startup arguments
        [
            "TEXAS_TafServer",
            "-TAFProperties",
            "/data/user/0/dstg.lasagne.hmi/files/TEXAS_LasagneProperties.conf:android",
            "-ACEDebug"
        ],

        // configuration files
        [
            "TEXAS_DDS.ini", 
            "TEXAS_LasagneProperties.conf",
            "TEXAS_TAFServer.conf"
        ]

    );

} else {
    console.log('Could not get LASAGNE plugin');
}
```

## Known Limitations

* Only tested to work with cordova android platform v9.0.0
