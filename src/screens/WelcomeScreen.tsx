import React, { useEffect, useRef, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  Animated, 
  Easing, 
  Dimensions, 
  TouchableOpacity,
  Image
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowRight } from 'lucide-react-native';

import { COLORS, SPACING } from '../config/theme';
import { Button } from '../components/Button';
import { BibleVerse } from '../components/BibleVerse';

const { width, height } = Dimensions.get('window');

// Individual Football Particle Component
interface FootballItemProps {
  delay: number;
}

const FootballItem: React.FC<FootballItemProps> = ({ delay }) => {
  const anim = useRef(new Animated.Value(0)).current;
  
  // Random parameters to give each football a unique trajectory
  const angle = useRef(Math.random() * Math.PI * 2).current; // 360-degree direction
  const maxDistance = useRef(Math.max(width, height) * 0.7).current; // Distance to fly
  const maxScale = useRef(1.5 + Math.random() * 2.0).current; // Large scale for 3D closeness
  const rotationDegrees = useRef(
    (Math.random() > 0.5 ? 1 : -1) * (360 + Math.random() * 720)
  ).current; // Spins

  useEffect(() => {
    let isMounted = true;
    
    const startAnim = (initialDelay: number) => {
      if (!isMounted) return;
      anim.setValue(0);
      Animated.sequence([
        Animated.delay(initialDelay),
        Animated.timing(anim, {
          toValue: 1,
          duration: 3000 + Math.random() * 2500, // randomized timing
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (isMounted) {
          startAnim(0); // Repeat loop with no delay
        }
      });
    };

    startAnim(delay);

    return () => {
      isMounted = false;
      anim.stopAnimation();
    };
  }, []);

  // Coordinate interpolations flying outward from center (0, 0)
  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, Math.cos(angle) * maxDistance],
  });

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, Math.sin(angle) * maxDistance],
  });

  // Scale starts tiny and enlarges past the viewer (3D depth)
  const scale = anim.interpolate({
    inputRange: [0, 0.1, 0.8, 1],
    outputRange: [0.05, 0.3, maxScale, maxScale * 1.6],
  });

  // Opacity fades in near center, stays solid, then fades out as it exits screen bounds
  const opacity = anim.interpolate({
    inputRange: [0, 0.1, 0.8, 1],
    outputRange: [0, 0.9, 0.9, 0],
  });

  const rotate = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', `${rotationDegrees}deg`],
  });

  return (
    <Animated.Text
      style={[
        styles.football,
        {
          transform: [
            { translateX },
            { translateY },
            { scale },
            { rotate },
          ],
          opacity,
        },
      ]}
    >
      ⚽
    </Animated.Text>
  );
};

export const WelcomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [btnVisible, setBtnVisible] = useState(false);

  // Animation Refs
  const crossTranslateY = useRef(new Animated.Value(-150)).current;
  const crossScale = useRef(new Animated.Value(0.2)).current;
  const crossOpacity = useRef(new Animated.Value(0)).current;

  const titleScale = useRef(new Animated.Value(0.4)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;

  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const bottomContainerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Sequence of visual entries
    Animated.sequence([
      Animated.delay(300),
      
      // 1. Cross Entrance (falls and scales in)
      Animated.parallel([
        Animated.timing(crossTranslateY, {
          toValue: 0,
          duration: 1500,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),
        Animated.timing(crossScale, {
          toValue: 1.0,
          duration: 1500,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),
        Animated.timing(crossOpacity, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),

      // 2. Carlo Cup Text Enlarging (Enlarges into view)
      Animated.parallel([
        Animated.timing(titleScale, {
          toValue: 1.3,
          duration: 2000,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]),

      // 3. Subtitle ("Jesus Youth Aluva") fades in
      Animated.timing(subtitleOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),

      // 4. Action button and scriptures fade in at the bottom
      Animated.timing(bottomContainerOpacity, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setBtnVisible(true);
    });

    // Auto-transition to Login after 7 seconds if the user does not tap
    const timeout = setTimeout(() => {
      handleEnterApp();
    }, 7500);

    return () => clearTimeout(timeout);
  }, []);

  const handleEnterApp = () => {
    navigation.navigate('Login');
  };

  // Generate 18 football particles with staggered delay offsets
  const footballs = Array.from({ length: 18 }).map((_, i) => (
    <FootballItem key={i} delay={i * 220} />
  ));

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        {/* Background Particle Storm of Footballs */}
        <View style={styles.footballContainer}>
          {footballs}
        </View>

        {/* Top Floating Glowing Image Badge */}
        <Animated.View 
          style={[
            styles.imageBadgeWrapper,
            {
              opacity: crossOpacity,
              transform: [
                { translateY: crossTranslateY },
                { scale: crossScale }
              ]
            }
          ]}
        >
          <View style={styles.avatarFrame}>
            <Image 
              source={require('../../assets/belong-to-jesus.png')}
              style={styles.avatarImage}
              resizeMode="cover"
            />
          </View>
        </Animated.View>

        {/* Center Enlarging Title */}
        <View style={styles.titleContainer}>
          <Animated.Text 
            style={[
              styles.inlineCross,
              {
                opacity: titleOpacity,
                transform: [{ scale: titleScale }]
              }
            ]}
          >
            ✝
          </Animated.Text>
          <Animated.Text 
            style={[
              styles.titleText,
              {
                opacity: titleOpacity,
                transform: [{ scale: titleScale }]
              }
            ]}
          >
            Carlo Cup
          </Animated.Text>
          
          <Animated.Text 
            style={[
              styles.subtitleText,
              {
                opacity: subtitleOpacity
              }
            ]}
          >
            ALUVA JESUS YOUTH
          </Animated.Text>
        </View>

        {/* Bottom CTA and Scripture */}
        <Animated.View 
          style={[
            styles.bottomWrapper,
            {
              opacity: bottomContainerOpacity
            }
          ]}
        >
          <Text style={styles.themeTag}>🔥 JOURNEY TO BURNING BUSH 🔥</Text>

          <Button 
            title="Enter Tournament App"
            onPress={handleEnterApp}
            size="lg"
            style={styles.enterBtn}
            textStyle={styles.enterBtnText}
            icon={<ArrowRight color="#000000" size={18} />}
          />

          <View style={styles.divider} />

          {/* Scripture footer */}
          <BibleVerse />
        </Animated.View>

      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000000', // Deep black background
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
  },
  footballContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 0,
  },
  football: {
    position: 'absolute',
    fontSize: 22,
    zIndex: 0,
  },
  imageBadgeWrapper: {
    marginTop: height * 0.04,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  avatarFrame: {
    width: 140,
    height: 210,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#F59E0B', // Gold border
    backgroundColor: '#000000',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    
    // Golden glow shadow
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 10,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  titleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: SPACING.lg,
    zIndex: 10,
  },
  inlineCross: {
    color: '#E5E7EB', // Silver
    fontSize: 42, // Long cross prominent size
    fontWeight: 'normal',
    textAlign: 'center',
    marginBottom: SPACING.xs,
    textShadowColor: 'rgba(255, 255, 255, 0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  titleText: {
    color: '#FFFFFF',
    fontSize: 50,
    fontWeight: '900',
    letterSpacing: 4,
    textAlign: 'center',
    textTransform: 'uppercase',
    textShadowColor: 'rgba(245, 158, 11, 0.6)', // Gold glow matches Crusader cross
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 20,
  },
  subtitleText: {
    color: '#F59E0B', // Gold
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 6, // Elegant wide tracking
    marginTop: SPACING.sm,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  bottomWrapper: {
    width: '100%',
    marginBottom: SPACING.md,
    zIndex: 10,
  },
  themeTag: {
    color: '#A7F3D0', // soft emerald
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: SPACING.md,
    letterSpacing: 1,
  },
  enterBtn: {
    width: '100%',
    height: 54,
    paddingVertical: 0, // Clear vertical padding default from size="lg" to fix alignment conflict
    backgroundColor: '#F59E0B', // Premium Gold button background
    borderColor: '#D97706',
    borderWidth: 1.5,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    
    // Button drop shadow glow
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 5,
  },
  enterBtnText: {
    color: '#000000', // Deep high-contrast black text
    fontSize: 16,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginVertical: SPACING.md,
  },
});
