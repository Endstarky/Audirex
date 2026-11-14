package com.audirex

import android.media.audiofx.BassBoost
import android.media.audiofx.Equalizer
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray

class AudioEffectModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  private var equalizer: Equalizer? = null
  private var bassBoost: BassBoost? = null

  override fun getName() = "AudioEffectModule"

  private fun initEffects(sessionId: Int = 0) {
    try {
      if (equalizer == null) {
        // Priority 0, audioSessionId (0 targets device output mix)
        equalizer = Equalizer(0, sessionId).apply {
          enabled = true
        }
      }
      if (bassBoost == null) {
        bassBoost = BassBoost(0, sessionId).apply {
          enabled = true
        }
      }
    } catch (e: Exception) {
      e.printStackTrace()
    }
  }

  @ReactMethod
  fun initAudioEffects(sessionId: Int, promise: Promise) {
    try {
      initEffects(sessionId)
      val result = Arguments.createMap()

      equalizer?.let { eq ->
        result.putInt("numBands", eq.numberOfBands.toInt())
        val range = eq.bandLevelRange // e.g. [-1500, 1500] in millibels
        result.putInt("minLevel", range[0].toInt())
        result.putInt("maxLevel", range[1].toInt())

        val freqs = Arguments.createArray()
        for (i in 0 until eq.numberOfBands) {
          // Center freq is in milliHertz (e.g., 60000 mHz = 60 Hz)
          freqs.pushInt(eq.getCenterFreq(i.toShort()) / 1000)
        }
        result.putArray("centerFreqs", freqs)
      }

      promise.resolve(result)
    } catch (e: Exception) {
      promise.reject("AUDIO_EFFECT_ERROR", "Failed to init audio effects", e)
    }
  }

  @ReactMethod
  fun setEqualizerEnabled(enabled: Boolean, promise: Promise) {
    try {
      initEffects()
      equalizer?.enabled = enabled
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("AUDIO_EFFECT_ERROR", e.message, e)
    }
  }

  @ReactMethod
  fun setBandLevel(band: Int, millibels: Int, promise: Promise) {
    try {
      initEffects()
      equalizer?.let { eq ->
        if (band in 0 until eq.numberOfBands) {
          val range = eq.bandLevelRange
          val clamped = millibels.coerceIn(range[0].toInt(), range[1].toInt()).toShort()
          eq.setBandLevel(band.toShort(), clamped)
        }
      }
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("AUDIO_EFFECT_ERROR", e.message, e)
    }
  }

  @ReactMethod
  fun setAllBands(millibelsArray: ReadableArray, promise: Promise) {
    try {
      initEffects()
      equalizer?.let { eq ->
        val range = eq.bandLevelRange
        val count = minOf(eq.numberOfBands.toInt(), millibelsArray.size())
        for (i in 0 until count) {
          val mb = millibelsArray.getInt(i)
          val clamped = mb.coerceIn(range[0].toInt(), range[1].toInt()).toShort()
          eq.setBandLevel(i.toShort(), clamped)
        }
      }
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("AUDIO_EFFECT_ERROR", e.message, e)
    }
  }

  @ReactMethod
  fun setBassBoostEnabled(enabled: Boolean, promise: Promise) {
    try {
      initEffects()
      bassBoost?.enabled = enabled
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("AUDIO_EFFECT_ERROR", e.message, e)
    }
  }

  @ReactMethod
  fun setBassBoostStrength(strength: Int, promise: Promise) {
    try {
      initEffects()
      bassBoost?.let { bb ->
        // Strength ranges from 0 to 1000
        val clamped = strength.coerceIn(0, 1000).toShort()
        bb.setStrength(clamped)
      }
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("AUDIO_EFFECT_ERROR", e.message, e)
    }
  }

  @ReactMethod
  fun releaseEffects(promise: Promise) {
    try {
      equalizer?.release()
      bassBoost?.release()
      equalizer = null
      bassBoost = null
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("AUDIO_EFFECT_ERROR", e.message, e)
    }
  }
}