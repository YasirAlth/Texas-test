#include <android/log.h>
#include <taf/TAFServer.h>
#include <daf/ShutdownHandler.h>
#include <jni.h>
#include <iostream>

static char* DEFAULT_SERVER_ARGV[] =
{
		"TafService",
		"-TAFProperties", "/data/data/dstg.lasagne.hmi/files/LASAGNEProperties.conf:android",
        "-ACEDebug"
};
static int DEFAULT_SERVER_ARGC = 5; //7;


static int fileDescriptor[2];
static pthread_t loggingThread;
static const char* tag = "TafService(JNI)";

static void* logger_thread_func(void*)
{
	ssize_t rdsz;
	char buf[128];
	while ((rdsz = read(fileDescriptor[0], buf, sizeof(buf) - 1)) >= 0)
	{
		if (buf[rdsz - 1] == '\n') --rdsz;
		buf[rdsz - 1] = 0;
		__android_log_write(ANDROID_LOG_DEBUG, tag, buf);
		fflush(stdout);
	}
	return 0;
}

int start_logger()
{
	setvbuf(stdout, 0, _IOLBF, 0);
	setvbuf(stderr, 0, _IOLBF, 0);

	pipe(fileDescriptor);
	dup2(fileDescriptor[1],1);
	dup2(fileDescriptor[1],2);

	if (pthread_create(&loggingThread, 0, logger_thread_func, 0) == -1)
	{
		return -1;
	}
	pthread_detach(loggingThread);
	return 0;
}

namespace { // Ensure We Register a shutdown Handler for this TAFServer
    const DAF::ShutdownHandler shutdown_handler;
}

#ifdef __cplusplus
extern "C" {
#endif

JNIEXPORT int JNICALL
Java_dst_cordova_lasagne_plugin_TafJni_shutdownTafServer(JNIEnv *env, jobject instance) {

    __android_log_write(ANDROID_LOG_DEBUG, tag, "Java_dst_cordova_lasagne_plugin_TafJni_shutdownTafServer");

    try
    {
        ACE_DEBUG((LM_DEBUG, ACE_TEXT("(%P|%t) TafService_JNI::shutdownTafServer - shutdown_handler.send_shutdown()...\n")));
        return shutdown_handler.send_shutdown();
    }
// TODO Renable, ensure Corba::Exception can be found in linking
//    catch (const CORBA::Exception &ex)
//    {
//        ex._tao_print_exception("TAFServer - exiting");
//    }
    DAF_CATCH_ALL
    {
    }

    ACE_ERROR((LM_ERROR, ACE_TEXT("TAFServer (%P|%t) ERROR: Encountered a runtime error - exiting.")));
}


int
start(int argc, char** argv) 
{
    
    /*
     * Start the TafServer and wait for completion (block)
     */
    try
    {
        ACE_DEBUG((LM_DEBUG, ACE_TEXT("(%P|%t) TAFService_JNI::startTafServer - Creating TAFServer\n")));
        TAFServer tafServer(argc, argv);
        ACE_DEBUG((LM_DEBUG, ACE_TEXT("(%P|%t) TAFService_JNI::startTafServer - Running TAFServer\n")));
        int returnCode = tafServer.run(true);
        ACE_DEBUG((LM_DEBUG, ACE_TEXT("(%P|%t) TAFService_JNI::startTafServer - Closing TAFServer...\n")));
        return returnCode;
    }
// TODO Renable, ensure Corba::Exception can be found in linking
//    catch (const CORBA::Exception &ex)
//    {
//    	 ex._tao_print_exception("TAFServer - exiting");
//    }
    DAF_CATCH_ALL
    {
    }

    ACE_ERROR((LM_ERROR, ACE_TEXT("TAFServer (%P|%t) ERROR: Encountered a runtime error - exiting.")));
}

JNIEXPORT int JNICALL
Java_dst_cordova_lasagne_plugin_TafJni_startTafServer(JNIEnv *env, jobject instance, jobjectArray tafArgs) {

    __android_log_write(ANDROID_LOG_DEBUG, tag, "Java_dst_cordova_lasagne_plugin_TafJni_startTafServer");

    ACE_DEBUG((LM_DEBUG, ACE_TEXT("(%P|%t) TAFService_JNI::startTafServer\n")));

    start_logger();

    if(env->GetArrayLength(tafArgs) > 0) 
    {
        int argc = env->GetArrayLength(tafArgs);
        char* argv[argc];

        for (int i = 0; argc > i; ++i) {
            jstring jstr = (jstring) (env->GetObjectArrayElement(tafArgs, i));
            const char * cstr = env->GetStringUTFChars(jstr, 0);
            argv[i] = strdup(cstr);
            ACE_DEBUG((LM_DEBUG, ACE_TEXT("(%P|%t) TAFService_JNI::startTafServer - Arg %d: %s\n"), i, argv[i]));
            env->ReleaseStringUTFChars(jstr, cstr);
        }

        ACE_DEBUG((LM_DEBUG, ACE_TEXT("(%P|%t) TAFService_JNI::startTafServer - Using specified arguments\n")));
        return start(argc, argv);
    }
    else
    {
        ACE_DEBUG((LM_DEBUG, ACE_TEXT("(%P|%t) TAFService_JNI::startTafServer - No arguments specified, using defaults\n")));
        return start(DEFAULT_SERVER_ARGC, DEFAULT_SERVER_ARGV);
    }
}

#ifdef __cplusplus
}
#endif


