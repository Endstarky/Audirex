import React, {useEffect} from 'react';
import {
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type SplashScreenProps = {
  onAssetsReady?: () => void;
};

const logoSource = require('../../assets/audirex-logo.png');
const wordmarkSource = require('../../assets/audirex-wordmark.png');

const SplashScreen = ({onAssetsReady}: SplashScreenProps) => {

  useEffect(() => {
    const timer = setTimeout(() => {
      onAssetsReady?.();
    }, 100);

    return () => clearTimeout(timer);
  }, [onAssetsReady]);

  return (
    <View style={styles.container}>

      {/* =====================================================
          AUDIREX LOGO
          ===================================================== */}

      <Image
        source={logoSource}
        style={styles.logo}
        resizeMode="contain"
        fadeDuration={0}
      />


      {/* =====================================================
          AUDIREX WORDMARK
          ===================================================== */}

      <Image
        source={wordmarkSource}
        style={styles.wordmark}
        resizeMode="contain"
        fadeDuration={0}
      />


      {/* =====================================================
          WAVEFORM
          ===================================================== */}

      <View style={styles.waveform}>
        {[
          18, 28, 40, 24, 48,
          32, 56, 35, 62, 42,
          52, 30, 44, 22, 50,
          34, 58, 28, 46, 20,
        ].map((height, index) => (
          <View
            key={index}
            style={[
              styles.waveBar,
              {height},
            ]}
          />
        ))}
      </View>


      {/* =====================================================
          TAGLINE
          ===================================================== */}

      <Text style={styles.tagline}>
        YOUR WORLD. YOUR SOUND.
      </Text>


      {/* =====================================================
          ACCENT LINE
          ===================================================== */}

      <View style={styles.accentLine} />


      {/* =====================================================
          BOTTOM MESSAGE
          ===================================================== */}

      <Text style={styles.bottomText}>
        Made for the moments that move you.
      </Text>

    </View>
  );
};


const styles = StyleSheet.create({

  /* =========================================================
     CONTAINER
     ========================================================= */

  container: {
    flex: 1,
    backgroundColor: '#090F22',
    alignItems: 'center',
  },


  /* =========================================================
     MAIN LOGO
     ========================================================= */

  logo: {
    position: 'absolute',

    top: '24%',

    width: 150,
    height: 150,

    alignSelf: 'center',
  },


  /* =========================================================
     WORDMARK
     ========================================================= */

  wordmark: {
    position: 'absolute',

    top: '42%',

    width: 260,
    height: 34,

    alignSelf: 'center',
  },


  /* =========================================================
     WAVEFORM
     ========================================================= */

  waveform: {
    position: 'absolute',

    top: '53.5%',

    height: 65,

    flexDirection: 'row',

    alignItems: 'center',
    justifyContent: 'center',

    gap: 5,
  },

  waveBar: {
    width: 3,

    borderRadius: 3,

    backgroundColor: '#3E50C9',
  },


  /* =========================================================
     TAGLINE
     ========================================================= */

  tagline: {
    position: 'absolute',

    top: '62%',

    color: '#5E6983',

    fontSize: 9,

    letterSpacing: 0.4,

    fontWeight: '400',
  },


  /* =========================================================
     ACCENT LINE
     ========================================================= */

  accentLine: {
    position: 'absolute',

    bottom: '12.4%',

    width: 32,
    height: 3,

    borderRadius: 3,

    backgroundColor: '#5369FF',
  },


  /* =========================================================
     BOTTOM MESSAGE
     ========================================================= */

  bottomText: {
    position: 'absolute',

    bottom: '8.4%',

    color: '#8891A6',

    fontSize: 9,

    fontWeight: '400',
  },

});


export default SplashScreen;