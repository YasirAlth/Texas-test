package dst.cordova.lasagne.plugin;

import android.util.Log;

import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.CallbackContext;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import org.apache.cordova.CordovaInterface;
import org.apache.cordova.CordovaWebView;
import android.content.Context;

import android.content.Intent;
import android.app.AlarmManager;
import android.app.PendingIntent;

/**
 * This class echoes a string called from JavaScript.
 */
public class Restart extends CordovaPlugin {

    private static final String TAG = "RestartPlugin";

    @Override
    public boolean execute(String action, JSONArray args, CallbackContext callbackContext) throws JSONException {
        if (action.equals("restart")) {
            this.restart(callbackContext);
            return true;
        }
        return false;
    }

    private void restart(CallbackContext callbackContext) {
        Log.i(TAG, "Attempting restart");
        try {                                                                                                                                  
          Intent i = this.cordova.getActivity().getBaseContext().getPackageManager()
                       .getLaunchIntentForPackage( this.cordova.getActivity().getBaseContext().getPackageName() );
           i.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);

           int mPendingIntentId = 123456;
           PendingIntent mPendingIntent = PendingIntent.getActivity(this.cordova.getActivity().getBaseContext(), mPendingIntentId,  i, PendingIntent.FLAG_CANCEL_CURRENT);
           AlarmManager mgr = (AlarmManager)this.cordova.getActivity().getBaseContext().getSystemService(Context.ALARM_SERVICE);
           mgr.set(AlarmManager.RTC, System.currentTimeMillis() + 100, mPendingIntent);
           System.exit(0);

          Log.i(TAG, "restart call SUCCESS");
          callbackContext.success("Restarting...");
        } catch (Exception ex) {
          Log.i(TAG, "Could not restart", ex);
          callbackContext.error("Restart failed.");
        }
    }
}
