package dev.jahir.blueprint.app.glass

import android.os.Build
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicText
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.layout.positionInWindow
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kyant.backdrop.backdrops.rememberCanvasBackdrop
import com.kyant.backdrop.drawBackdrop
import com.kyant.backdrop.effects.blur
import com.kyant.backdrop.effects.lens
import com.kyant.backdrop.effects.vibrancy
import com.kyant.backdrop.highlight.Highlight

/** One tab, mapped 1:1 to a Blueprint bottom-navigation menu item id. */
data class GlassTab(val menuId: Int, val iconRes: Int, val label: String)

/**
 * Apple-style liquid-glass floating bottom bar built on kyant0's Backdrop.
 *
 * The bar refracts a live snapshot of the content behind it ([backdropState]).
 * The real Blueprint [FramesBottomNavigationView] stays in the tree (hidden) and
 * is driven through [onSelect]; [selectedId] mirrors its current selection so the
 * highlight stays in sync.
 *
 * The AGSL refraction/blur needs Android 13+ (API 33). Below that we fall back to
 * a simple translucent capsule so the app still works everywhere down to API 23.
 */
@Composable
fun LiquidGlassBottomBar(
    tabs: List<GlassTab>,
    selectedId: Int,
    onSelect: (Int) -> Unit,
    backdropState: GlassBackdropState,
    modifier: Modifier = Modifier,
) {
    val navBottom: Dp = with(LocalDensity.current) {
        WindowInsets.navigationBars.getBottom(this).toDp()
    }
    val dark = isSystemInDarkTheme()
    val accent = if (dark) Color(0xFFFF6BA6) else Color(0xFF3881FA)
    val inactive = (if (dark) Color(0xFFEDEDED) else Color(0xFF1F1F1F)).copy(alpha = 0.7f)
    val capsule: Shape = RoundedCornerShape(percent = 50)
    val supportsGlass = Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU

    var barPos by remember { mutableStateOf(Offset.Zero) }

    val backdrop = rememberCanvasBackdrop {
        val img = backdropState.image
        if (img != null) {
            val tl = backdropState.contentTopLeftInWindow
            // Draw the full-screen content snapshot shifted so the slice directly
            // behind the bar lands under it (1:1 in window space).
            drawImage(img, topLeft = Offset(tl.x - barPos.x, tl.y - barPos.y))
        } else {
            drawRect(if (dark) Color(0xFF202124) else Color(0xFFF5F5F5))
        }
    }

    Box(
        modifier
            .fillMaxWidth()
            .padding(start = 16.dp, end = 16.dp, top = 6.dp, bottom = navBottom + 10.dp),
        contentAlignment = Alignment.Center
    ) {
        val base = Modifier
            .fillMaxWidth()
            .height(62.dp)
            .onGloballyPositioned { barPos = it.positionInWindow() }

        val container = if (supportsGlass) {
            base
                .shadow(14.dp, capsule, clip = false)
                .drawBackdrop(
                    backdrop,
                    { capsule },
                    {
                        vibrancy()
                        blur(6.dp.toPx())
                        lens(20.dp.toPx(), 36.dp.toPx(), true, false)
                    },
                    { Highlight.Default }
                )
        } else {
            base
                .shadow(10.dp, capsule, clip = false)
                .clip(capsule)
                .background(if (dark) Color(0xCC2A2A2D) else Color(0xCCFFFFFF))
        }

        Row(
            modifier = container.padding(horizontal = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            tabs.forEach { tab ->
                val selected = tab.menuId == selectedId
                val color = if (selected) accent else inactive
                Column(
                    Modifier
                        .weight(1f)
                        .fillMaxHeight()
                        .clip(capsule)
                        .clickable(
                            interactionSource = remember { MutableInteractionSource() },
                            indication = null
                        ) { onSelect(tab.menuId) },
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Image(
                        painter = painterResource(tab.iconRes),
                        contentDescription = tab.label,
                        colorFilter = ColorFilter.tint(color),
                        modifier = Modifier.size(24.dp)
                    )
                    Spacer(Modifier.height(2.dp))
                    BasicText(
                        text = tab.label,
                        style = TextStyle(color = color, fontSize = 10.sp, textAlign = TextAlign.Center),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
        }
    }
}
