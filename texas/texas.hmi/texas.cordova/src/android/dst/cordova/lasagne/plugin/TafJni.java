package dst.cordova.lasagne.plugin;

import android.util.Log;

public class TafJni {

    private static final String CLASS_NAME = TafJni.class.getSimpleName();
    private static final String TAG = CLASS_NAME;

    // ---------------------------------------------------------------------------------------------

    static {

        final String[] libs = {
            "ACE",
            "TAO",
            "TAO_AnyTypeCode",
            "TAO_PortableServer",
            "TAO_IORTable",
            "DAF",
            "TAO_CodecFactory",
            "TAO_PI",
            "TAO_Strategies",
            "TAO_Svc_Utils",
            "TAO_CosNaming",
            "TAF",
            "crypto",
            "ssl",
            "rabbitmq",
            "Texas",
            "taf-jni"
        };
        
        for (String lib : libs) {
            Log.d(TAG, "Loading Native Library: " + lib);
            try {
                System.loadLibrary(lib);
            }
            catch(UnsatisfiedLinkError ex) {
                Log.d(TAG, "Load Native Libraries failed: " + ex.getMessage());
            }
        }
        
    }

    // ---------------------------------------------------------------------------------------------

    protected static native int startTafServer(String[] args);
    protected static native int shutdownTafServer();

}
