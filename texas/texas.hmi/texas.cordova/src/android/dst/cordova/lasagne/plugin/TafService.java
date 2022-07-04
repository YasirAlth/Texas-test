package dst.cordova.lasagne.plugin;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.IBinder;
import android.os.Message;
import android.os.Messenger;
import android.os.Process;
import android.util.Log;

import java.io.File;

import java.util.concurrent.Executor;
import java.util.concurrent.Executors;
import java.util.ArrayList;

public class TafService extends Service {

    private static final String CLASS_NAME = TafService.class.getSimpleName();
    private static final String TAG = CLASS_NAME;

    // ---------------------------------------------------------------------------------------------

    /** Command to the service to start TafServer */
    static final int MSG_START = 1;

    /** Command to the service to shutdown TafServer */
    static final int MSG_SHUTDOWN = 2;

    /** Key to a bundle's server arguments */
    static final String BUNDLE_DATA_SERVER_ARGS = "DATA_SERVER_ARGS";

    /** Key to a bundle's server config files */
    static final String BUNDLE_DATA_SERVER_CONFIG_FILES = "DATA_SERVER_CONFIG_FILES";

    /**
     * Handler of incoming messages from clients.
     */
    class IncomingHandler extends Handler {
        @Override
        public void handleMessage(final Message msg) {
            switch (msg.what) {
            case MSG_START:
                final Bundle bundle = msg.getData();
                final ArrayList<String> args = bundle.getStringArrayList(BUNDLE_DATA_SERVER_ARGS);
                final ArrayList<String> files = bundle.getStringArrayList(BUNDLE_DATA_SERVER_CONFIG_FILES);
                handle_start(args, files);
                break;
            case MSG_SHUTDOWN:
                handle_shutdown();
                break;
            default:
                super.handleMessage(msg);
            }
        }
    }

    // ---------------------------------------------------------------------------------------------

    /**
     * Target we publish for clients to send messages to IncomingHandler.
     */
    private final Messenger mMessenger = new Messenger(new IncomingHandler());

    /*
     * The cordova documentation recommends using "cordova.getThreadPool()", however, we want to
     * run this service in a separate process, therefore we should create our own thread pool
     * https://cordova.apache.org/docs/en/latest/guide/platforms/android/plugin.html#threading
     */
    private Executor mTaskExecutor = Executors.newCachedThreadPool();

    // ---------------------------------------------------------------------------------------------
    @Override
    public void onCreate() {
        Log.d(TAG, "onCreate()");

        /*
         * This should return the icon id representing the service as defined in plugin.xml.
         * If it is not set, it should return the icon id for the application as a whole.
         * An icon is required to display a notification (unless we use the older
           Notification.Compat class which requires v4 support)
         */
        final int iconId = this.getApplicationInfo().icon;

        String NOTIFICATION_CHANNEL_ID = "dst.cordova.lasagne.plugin";
        String channelName = "LASAGNE Service";
        NotificationChannel channel = new NotificationChannel(NOTIFICATION_CHANNEL_ID, channelName, NotificationManager.IMPORTANCE_NONE);
        channel.setLockscreenVisibility(Notification.VISIBILITY_PRIVATE);
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        manager.createNotificationChannel(channel);

        Notification notification = new Notification.Builder(this, NOTIFICATION_CHANNEL_ID)
            .setOngoing(true)
            .setContentTitle("LASAGNE Service")
            .setContentText("LASAGNE Service Running...")
            .setSmallIcon(iconId)
            .setPriority(NotificationManager.IMPORTANCE_MIN)
            .setCategory(Notification.CATEGORY_SERVICE)
            .build();

        // value must be greater than 0
        startForeground(1, notification);

        super.onCreate();
    }

    @Override
    public IBinder onBind(final Intent intent) {
        Log.d(TAG, "onBind(...)");

        return mMessenger.getBinder();
    }

    @Override
    public int onStartCommand(final Intent intent, final int flags, final int startId) {
        Log.d(TAG, "onStartCommand(...)");

        final Bundle bundle = intent.getBundleExtra(BUNDLE_DATA_SERVER_ARGS);
        final ArrayList<String> args = bundle.getStringArrayList(BUNDLE_DATA_SERVER_ARGS);
        final ArrayList<String> files = bundle.getStringArrayList(BUNDLE_DATA_SERVER_CONFIG_FILES);

        handle_start(args, files);

        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        Log.d(TAG, "onDestroy()");

        handle_shutdown();

        super.onDestroy();
    }

    // ---------------------------------------------------------------------------------------------

    private void handle_start(final ArrayList<String> args, final ArrayList<String> files) {
        Log.d(TAG, "handle_start()");

        mTaskExecutor.execute(new Runnable() {
            @Override
            public void run() {

                /*
                 * Move the config files from the assets "www" folder to the "files" directory.
                 * This is done so that the config files can be found by the native libraries.
                 */
                new ConfigFilesHandler(getApplicationContext(), files).handle();

                Log.d(TAG, "Starting TafServer...");
                final int returnValue = TafJni.startTafServer(args.toArray(new String[args.size()]));
                Log.d(TAG, "startTafServer() returned: " + returnValue);

                /*
                 * once complete, crudely kill the process not a recommended approach but re-using
                 * this process will result in SIGSEGV fault
                 */
                Process.killProcess(Process.myPid());
            }
        });
    }

    private void handle_shutdown() {
        Log.d(TAG, "handle_shutdown()");

        // Is there anyway to get a call back when shutdown??
        Log.d(TAG, "Shutting down TafServer...");
        final int returnValue = TafJni.shutdownTafServer();
        Log.d(TAG, "shutdownTafServer() returned: " + returnValue);
    }
}
