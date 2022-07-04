package dst.cordova.lasagne.plugin;

import org.apache.cordova.*;
import org.json.JSONArray;
import org.json.JSONException;

import android.app.Activity;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.ServiceConnection;
import android.os.Bundle;
import android.os.IBinder;
import android.os.Message;
import android.os.Messenger;
import android.os.RemoteException;
import android.util.Log;

import java.util.ArrayList;

import com.google.gson.Gson;

public class Taf extends CordovaPlugin {

    private static final String CLASS_NAME = Taf.class.getSimpleName();
    private static final String TAG = CLASS_NAME;

    // ---------------------------------------------------------------------------------------------

    /** Messenger for communicating with the service. */
    private Messenger mService = null;

    /** Flag indicating whether we have called bind on the service. */
    private boolean mBound;

    private JSONArray mData;

    // ---------------------------------------------------------------------------------------------

    /**
     * Class for interacting with the main interface of the service.
     */
    private ServiceConnection mConnection = new ServiceConnection() {

        /*
         * Called when the connection with the service has been established, giving us the object we
         * can use to interact with the service. e are communicating with the service using a Messenger
         * so here we get a client-side representation of that from the raw IBinder object.
         */
        public void onServiceConnected(ComponentName className, IBinder service) {
            Log.d(TAG, "onServiceConnected(...)");
            mService = new Messenger(service);
            mBound = true;
            handle_start();
        }

        // Called when connection with service unexpectedly disconnected -- that is, its process crashed.
        public void onServiceDisconnected(final ComponentName className) {
            Log.d(TAG, "onServiceDisconnected(...)");
            mService = null;
            mBound = false;
        }
    };

    // --------------------------------------------------------------------------------------------

    @Override
    public boolean execute(String action, JSONArray data, CallbackContext callbackContext) throws JSONException {
        Log.d(TAG, "execute(...)");

        mData = data; // TODO Temporary - may be overridden by subsequent calls

        if ("start".equals(action))
            return handle_bind();
        if ("shutdown".equals(action))
            return handle_unbind();

        return false;
    }

    /**
     * Called when the system is about to start resuming a previous activity.
     *
     * @param multitasking		Flag indicating if multitasking is turned on for app
     */
    @Override()
    public void onPause(boolean multitasking) {
        Log.d(TAG, "onPause()");
        super.onPause(multitasking);
    }

    /**
     * Called when the activity will start interacting with the user.
     *
     * @param multitasking		Flag indicating if multitasking is turned on for app
     */
    @Override()
    public void onResume(boolean multitasking) {
        Log.d(TAG, "onResume()");
        super.onResume(multitasking);
    }

    /**
     * Called when the activity is becoming visible to the user.
     */
    @Override()
    public void onStart() {
        Log.d(TAG, "onStart()");
        super.onStart();
    }

    /**
     * Called when the activity is no longer visible to the user.
     */
    @Override()
    public void onStop() {
        Log.d(TAG, "onStop()");
        super.onStop();
    }

    /**
     * The final call you receive before your activity is destroyed.
     */
    @Override
    public void onDestroy() {
        Log.d(TAG, "onDestroy()");
        handle_unbind();
        super.onDestroy();
    };

    /**
     * Called when the Activity is being destroyed (e.g. if a plugin calls out to an external
     * Activity and the OS kills the CordovaActivity in the background). The plugin should save its
     * state in this method only if it is awaiting the result of an external Activity and needs
     * to preserve some information so as to handle that result; onRestoreStateForActivityResult()
     * will only be called if the plugin is the recipient of an Activity result
     *
     * @return  Bundle containing the state of the plugin or null if state does not need to be saved
     */
    public Bundle onSaveInstanceState() {
        Log.d(TAG, "onSaveInstanceState()");
        return super.onSaveInstanceState();
    }

    /**
     * Called when a plugin is the recipient of an Activity result after the CordovaActivity has
     * been destroyed. The Bundle will be the same as the one the plugin returned in
     * onSaveInstanceState()
     *
     * @param state             Bundle containing the state of the plugin
     * @param callbackContext   Replacement Context to return the plugin result to
     */
    @Override
    public void onRestoreStateForActivityResult(Bundle state, CallbackContext callbackContext) {
        Log.d(TAG, "onRestoreStateForActivtiyResult(...)");
        super.onRestoreStateForActivityResult(state, callbackContext);
    }

    /**
     * Called when a message is sent to plugin.
     *
     * @param id            The message id
     * @param data          The message data
     * @return              Object to stop propagation or null
     */
    @Override
    public Object onMessage(String id, Object data) {
        Log.d(TAG, "onMessage(...)");
        return super.onMessage(id, data);
    }

    /**
     * Called when an activity you launched exits, giving you the requestCode you started it with,
     * the resultCode it returned, and any additional data from it.
     *
     * @param requestCode   The request code originally supplied to startActivityForResult(),
     *                      allowing you to identify who this result came from.
     * @param resultCode    The integer result code returned by the child activity through its setResult().
     * @param intent        An Intent, which can return result data to the caller (various data can be
     *                      attached to Intent "extras").
     */
    @Override
    public void onActivityResult(int requestCode, int resultCode, Intent intent) {
        Log.d(TAG, "onActivityResult(...)");
        super.onActivityResult(requestCode, resultCode, intent);
    }

    /**
     * Called when the WebView does a top-level navigation or refreshes.
     *
     * Plugins should stop any long-running processes and clean up internal state.
     *
     * Does nothing by default.
     */
    @Override
    public void onReset() {
        Log.d(TAG, "onReset()");
        super.onReset();
    }

    // --------------------------------------------------------------------------------------------

    private boolean handle_bind() {
        Log.d(TAG, "handle_bind()");

        final Intent intent = new Intent(cordova.getActivity(), TafService.class);
        cordova.getActivity().bindService(intent, mConnection, Context.BIND_AUTO_CREATE);

        return true;
    }

    private boolean handle_unbind() {
        Log.d(TAG, "handle_unbind()");

        if (mBound) {
            handle_shutdown();
            cordova.getActivity().unbindService(mConnection);
            mBound = false;
        }
        return true;
    }

    private void handle_start() {
        Log.d(TAG, "handle_start()");

        if (!mBound)
            return;

        // Convert parameters to their expected types
        final Gson googleJson = new Gson();

        ArrayList<String> tafServerArgs = null;
        try {
            tafServerArgs = googleJson.fromJson(mData.getString(0), ArrayList.class);
        } catch (JSONException e) {
            e.printStackTrace();
        }

        ArrayList<String> tafConfigFiles = null;
        try {
            tafConfigFiles = googleJson.fromJson(mData.getString(1), ArrayList.class);
        } catch (JSONException e) {
            e.printStackTrace();
        }

        // Add the parameters to a bundle (A mapping from String keys to various Parcelable values)
        final Bundle bundle = new Bundle();
        bundle.putStringArrayList(TafService.BUNDLE_DATA_SERVER_ARGS, tafServerArgs);
        bundle.putStringArrayList(TafService.BUNDLE_DATA_SERVER_CONFIG_FILES, tafConfigFiles);

        // Add the bundle to a TafService start message
        final Message msg = Message.obtain(null, TafService.MSG_START, 0, 0);
        msg.setData(bundle);

        try {
            mService.send(msg);
        } catch (RemoteException e) {
            e.printStackTrace();
        }
    }

    private void handle_shutdown() {
        Log.d(TAG, "handle_shutdown()");

        if (!mBound)
            return;

        final Message msg = Message.obtain(null, TafService.MSG_SHUTDOWN, 0, 0);
        try {
            mService.send(msg);
        } catch (RemoteException e) {
            e.printStackTrace();
        }
    }

    // --------------------------------------------------------------------------------------------
}
