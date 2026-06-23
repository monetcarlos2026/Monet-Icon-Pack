package dev.jahir.blueprint.app.glass

import android.graphics.Bitmap
import android.graphics.Canvas
import android.view.View
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap

/**
 * Holds a live snapshot of whatever is drawn *behind* the liquid-glass bar (the
 * fragments container with its icon grid / wallpaper), together with where that
 * content sits in window coordinates. The glass samples this so it refracts the
 * real UI underneath rather than an empty surface.
 *
 * A single backing [Bitmap] is reused; each capture only re-wraps it as a new
 * [ImageBitmap] so Compose's draw phase observes the change without copying pixels.
 */
class GlassBackdropState {

    var image by mutableStateOf<ImageBitmap?>(null)
        private set

    /** Top-left of the captured content in window coordinates. */
    var contentTopLeftInWindow by mutableStateOf(Offset.Zero)
        private set

    private var backing: Bitmap? = null
    private val location = IntArray(2)

    /** Renders [view] into the reusable bitmap. Must run on the main thread. */
    fun capture(view: View) {
        val w = view.width
        val h = view.height
        if (w <= 0 || h <= 0) return
        var bmp = backing
        if (bmp == null || bmp.width != w || bmp.height != h) {
            bmp?.recycle()
            bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
            backing = bmp
        }
        val target = bmp!!
        target.eraseColor(0)
        view.draw(Canvas(target))
        view.getLocationInWindow(location)
        contentTopLeftInWindow = Offset(location[0].toFloat(), location[1].toFloat())
        image = target.asImageBitmap()
    }
}
