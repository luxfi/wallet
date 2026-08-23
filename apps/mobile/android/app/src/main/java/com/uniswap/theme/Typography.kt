package com.uniswap.theme

import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.sp
import com.uniswap.R

// TODO gary update for Spore changes
@Immutable
data class CustomTypography(
  // Zen's axis is fitted, not nominal: the text weight is wght 497 and the
  // emphasis weight is wght 606 (the .zen-book and .zen-medium presets). The
  // nearest static cuts are Medium (500) and SemiBold (600), which is why the
  // body slot takes zen_medium and every heavier slot takes zen_semibold.
  val defaultFontFamily: FontFamily = FontFamily(
    Font(R.font.zen_medium),
    Font(R.font.zen_semibold, FontWeight.Medium),
    Font(R.font.zen_semibold, FontWeight.SemiBold),
    Font(R.font.zen_semibold, FontWeight.Bold),
  ),
  val defaultLetterSpacing: TextUnit = 0.sp,
  val heading1: TextStyle = TextStyle(
    fontFamily = defaultFontFamily,
    fontSize = 52.sp,
    lineHeight = 60.sp,
    fontWeight = FontWeight.Normal,
    letterSpacing = defaultLetterSpacing,
  ),
  val heading2: TextStyle = TextStyle(
    fontFamily = defaultFontFamily,
    fontSize = 36.sp,
    lineHeight = 44.sp,
    fontWeight = FontWeight.Normal,
    letterSpacing = defaultLetterSpacing,
  ),
  val heading3: TextStyle = TextStyle(
    fontFamily = defaultFontFamily,
    fontSize = 24.sp,
    lineHeight = 32.sp,
    fontWeight = FontWeight.Normal,
    letterSpacing = defaultLetterSpacing,
  ),
  val subheading1: TextStyle = TextStyle(
    fontFamily = defaultFontFamily,
    fontSize = 18.sp,
    lineHeight = 24.sp,
    fontWeight = FontWeight.Normal,
    letterSpacing = defaultLetterSpacing,
  ),
  val subheading2: TextStyle = TextStyle(
    fontFamily = defaultFontFamily,
    fontSize = 16.sp,
    lineHeight = 24.sp,
    fontWeight = FontWeight.Normal,
    letterSpacing = defaultLetterSpacing,
  ),
  val body1: TextStyle = TextStyle(
    fontFamily = defaultFontFamily,
    fontSize = 18.sp,
    lineHeight = 24.sp,
    fontWeight = FontWeight.Normal,
    letterSpacing = defaultLetterSpacing,
  ),
  val body2: TextStyle = TextStyle(
    fontFamily = defaultFontFamily,
    fontSize = 16.sp,
    lineHeight = 24.sp,
    fontWeight = FontWeight.Normal,
    letterSpacing = defaultLetterSpacing,
  ),
  val body3: TextStyle = TextStyle(
    fontFamily = defaultFontFamily,
    fontSize = 14.sp,
    lineHeight = 16.sp,
    fontWeight = FontWeight.Normal,
    letterSpacing = defaultLetterSpacing,
  ),
  val buttonLabel1: TextStyle = TextStyle(
    fontFamily = defaultFontFamily,
    fontSize = 18.sp,
    lineHeight = 24.sp,
    fontWeight = FontWeight.Normal,
    letterSpacing = defaultLetterSpacing,
  ),
  val buttonLabel2: TextStyle = TextStyle(
    fontFamily = defaultFontFamily,
    fontSize = 18.sp,
    lineHeight = 24.sp,
    fontWeight = FontWeight.Medium,
    letterSpacing = defaultLetterSpacing,
  ),
  val buttonLabel3: TextStyle = TextStyle(
    fontFamily = defaultFontFamily,
    fontSize = 18.sp,
    lineHeight = 24.sp,
    fontWeight = FontWeight.Normal,
    letterSpacing = defaultLetterSpacing,
  ),
  val buttonLabel4: TextStyle = TextStyle(
    fontFamily = defaultFontFamily,
    fontSize = 14.sp,
    lineHeight = 16.sp,
    fontWeight = FontWeight.Medium,
    letterSpacing = defaultLetterSpacing,
  ),
  val monospace: TextStyle = TextStyle(
    fontFamily = FontFamily(
      Font(R.font.inputmono_regular),
      ),
    fontSize = 14.sp,
    lineHeight = 20.sp,
    letterSpacing = defaultLetterSpacing,
  ),
)

val LocalCustomTypography = staticCompositionLocalOf {
  CustomTypography()
}
