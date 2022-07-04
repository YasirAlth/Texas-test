package dst.cordova.lasagne.plugin;

import android.content.Context;

import android.util.Log;

import java.io.File;
import java.io.FileOutputStream;
import java.io.FileNotFoundException;
import java.io.InputStream;
import java.io.IOException;

import java.util.ArrayList;
import java.util.List;
import java.util.Collection;

/**
 * This class can be used to copy Android assets to the "files" directory.
 * 
 * <p>
 * The purpose of this class is to move files to a path where the native libraries can load them.
 * </p>
 */
public class ConfigFilesHandler {

    private static final String CLASS_NAME = ConfigFilesHandler.class.getSimpleName();
    private static final String TAG = CLASS_NAME;

    // ---------------------------------------------------------------------------------------------

    /** Interface to global information about the application environment */
    private final Context _context;

    /** The list of file names to move */
    private List<String> _files = new ArrayList<String>();

    /** The folder relative path within {@link android.content.res.AssetManager} to find files */
    private final String _assetFolder;

    // ---------------------------------------------------------------------------------------------

    /**
     * Constructor, adds the default files to be handled
     * Sets the assets folder to "www/assets" (Assumed to come from texas.cordova/www pre-build).
     */
    public ConfigFilesHandler(final Context context) {
        _context = context;
        _assetFolder = "www";
        _files.add("LASAGNEProperties.conf");
        _files.add("TAFServer.conf");
        _files.add("DDS.ini");
    }

        /**
     * Constructor, adds the specified files to be handled.
     * Sets the assets folder to "www/assets" (Assumed to come from texas.hmi/assets pre-build).
     */
    public ConfigFilesHandler(final Context context, String... files) {
        _context = context;
        _assetFolder = "www";
        for(final String file : files) {
            _files.add(file);
        }
    }

    /**
     * Constructor, adds the specified files to be handled.
     * Sets the assets folder to "www/assets" (Assumed to come from texas.hmi/assets pre-build).
     */
    public ConfigFilesHandler(final Context context, final Collection<String> files) {
        _context = context;
        _assetFolder = "www" + File.separator + "assets";
        _files.addAll(files);
    }

    // ---------------------------------------------------------------------------------------------

    /**
     * Copies the files in Android Asset to the "files" directory. 
     */
    public void handle() {
        Log.d(TAG, "handle()");
        
        try {

            for (final String file : _files) {
                final String src = _assetFolder + File.separator + file;
                final String dst = file;
                moveAssetToFilesDir(src, dst);
            }

        } catch (final Exception ex) {
            throw new RuntimeException(ex);
        }
    }

    // ---------------------------------------------------------------------------------------------

    private void moveAssetToFilesDir(final String srcPath, final String dstPath) throws
        IOException, FileNotFoundException {

        // Read file from Android's assets directory
        final InputStream in = _context.getAssets().open(srcPath);
        final int fileSize = in.available();
        final byte[] fileBuffer = new byte[fileSize];
        in.read(fileBuffer);
        in.close();

        // Write file to Android's files directory
        final File newFile = new File(_context.getFilesDir() + File.separator + dstPath);
        final FileOutputStream out = new FileOutputStream(newFile);
        out.write(fileBuffer);
        out.close();
    }
}