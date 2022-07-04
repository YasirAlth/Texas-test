# Texas HMI

This is the HMI for TSI Experimentation Architecture Support (TEXAS). This is an [Ionic](http://ionicframework.com/docs/) application which uses [Cordova](https://cordova.apache.org/docs/en/latest/guide/overview/index.html) to build and  deploy the application as a native application. This project was started using the [ionic2-app-base template](https://github.com/ionic-team/ionic2-app-base).

## Required Software

* [Node.js](https://nodejs.org/) vv10.15.3+
* [NPM](https://www.npmjs.com/) v6.4.1+
* [Java JDK](http://www.oracle.com/technetwork/java/javase/overview/index.html) v8 (note v9 is not yet compatible with the Android SDK)
* [Android SDK](https://developer.android.com/studio/index.html) v24+ (available as Android Studio or as standalone command line tools)

## Required Global NPM Packages

* [Ionic](https://ionicframework.com/) v5.2.3+
* [Cordova](https://cordova.apache.org/) v9.0.0+

```
npm install -g ionic cordova
```

## Required Environment Variables

As indicated in the [Ionic framework documentation](http://ionicframework.com/docs/):

> "each platform has certain features and installation requirements before you can get the most out of your Ionic and Cordova development."

It then refers to the [Cordova Android Platform Guide](https://cordova.apache.org/docs/en/latest/guide/platforms/android/) which details the required environment variables:

* JAVA_HOME set to JRE installation directory
* ANDROID_HOME set to the location of the Android SDK installation
* PATH appended with Android SDK's tools, tools/bin, and platform-tools folders (see Android SDK setup).

When deploying to an android phone you may encounter the following error:
"Could not reserve enough space for 2097152KB object heap"
If this occurs, you need to increase the object heap by setting:

* _JAVA_OPTIONS with the JVM heap option (e.g. -Xmx512M)(

The _JAVA_OPTIONS are picked up and used by the [sdkmanager](https://developer.android.com/studio/command-line/sdkmanager.html).

## Required Android SDK setup

If you are not using an IDE you will need to perform some additional Android SDK setup. The [Cordova Android Platform Guide](https://cordova.apache.org/docs/en/latest/guide/platforms/android/) lists the required steps but does not provide the commands.

> "Open the Android SDK Manager (run android or sdkmanager from the terminal) and make sure the following are installed:
>
> 1. Android Platform SDK for your targeted version of Android
> 1. Android SDK build-tools version 19.1.0 or higher
> 1. Android Support Repository (found under "Extras")

The following command can be used to install these:
```
sdkmanager "platform-tools" "platforms;android-26" "build-tools;26.0.2"
```

## Required Native Build tools

"node-gyp is a cross-platform command-line tool written in Node.js for compiling native addon modules for Node.js" (see the [node-gyp github page](https://github.com/nodejs/node-gyp) for more information)

On windows, in a powershell with admin privileges, run the following command to install all of the required tools and configurations for node-gyp:

```
npm install --global --production windows-build-tools
```

## Installing Dependencies

Usually the following command is the standard for installing npm dependencies:

```
npm install
```

In npm versions after 5.0.3, you may encounter the following error:

"Error: EPERM: operation not permitted, scandir ..." (errno: -4048)

[GitHub Issue #17671: npm install fails in windows using fsevents](https://github.com/npm/npm/issues/17671) describes this exact issue.
Until this issue is resolved, you will have to use one of the valid work arounds:

1. Revert npm to version 5.0.3 which is generally accepted to work;

1. Run the npm install command with the flag --no-optional;

There are many other suggestions on the github #17671 page that do not work such as cleaning the cache. Therefore, it is highly recommended on npm > 5.0.3 you use the --no-optional flag until the issue is finally resolved in future versions of npm.

```
npm install --no-optional
```

## Building and running the application

See the scripts in package.json for an entire list of scripts to build and run the application. If you are running the application on the android, ensure that debugging is enabled on the device. See the workarounds below that may need to be applied

### Current workarounds

#### Cordova-plugin-texas-lasagne and cordova-plugin-restart

Since these plugins are stored in a relative file location, you may need to manually add them if you have trouble installing it.

```
ionic cordova plugin add .\texas.cordova
ionic cordova plugin add .\texas.restart
```

## Rocket Chat Integration (Experimental!!)
Rocket Chat has been integrated using an IFRAME and embedding in the Ionic web app. The Rocket Cat sever must be setup with the following:
1. Default installation on Ubuntu 16.04 (or similar) using a recent [Snap](https://rocket.chat/docs/installation/manual-installation/ubuntu/snaps/).
2. Once installed, enable IFRAME installation as an administrator.
3. Enable REST and CORS as an administrator.
4. Add the required SLS users where the username and password is the same as each device name (for example, username: SLS-GOLD-2, password: SLS-GOLD-2)
5. Update the application to the new Rocket Chat URL in the configuration service. 

2019!
