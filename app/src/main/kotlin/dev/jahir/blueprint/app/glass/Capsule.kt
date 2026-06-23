package dev.jahir.blueprint.app.glass

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.graphics.Paint
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.drawscope.drawIntoCanvas

/** Pill shape — stand-in for com.kyant.shapes.Capsule (not needed by backdrop 1.0.2). */
internal fun Capsule(): Shape = RoundedCornerShape(percent = 50)

/**
 * Tints all drawn content through an offscreen layer.
 * Replacement for `Modifier.graphicsLayer(colorFilter = ...)` which only exists in
 * Compose 1.11+; this project is on 1.10.
 */
internal fun Modifier.tintLayer(color: Color): Modifier = drawWithContent {
    drawIntoCanvas { canvas ->
        val paint = Paint().apply { colorFilter = ColorFilter.tint(color) }
        canvas.saveLayer(Rect(Offset.Zero, size), paint)
        drawContent()
        canvas.restore()
    }
}
