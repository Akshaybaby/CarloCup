import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { COLORS, SPACING } from '../config/theme';

interface Verse {
  text: string;
  reference: string;
}

const VERSES: Verse[] = [
  {
    text: "Do you not know that in a race all the runners run, but only one gets the prize? Run in such a way as to get the prize.",
    reference: "1 Corinthians 9:24"
  },
  {
    text: "I can do all things through Christ who strengthens me.",
    reference: "Philippians 4:13"
  },
  {
    text: "But those who hope in the Lord will renew their strength. They will soar on wings like eagles; they will run and not grow weary.",
    reference: "Isaiah 40:31"
  },
  {
    text: "I have fought the good fight, I have finished the race, I have kept the faith.",
    reference: "2 Timothy 4:7"
  },
  {
    text: "Let us run with perseverance the race marked out for us, fixing our eyes on Jesus.",
    reference: "Hebrews 12:1-2"
  },
  {
    text: "Have I not commanded you? Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you.",
    reference: "Joshua 1:9"
  },
  {
    text: "The Lord is my strength and my shield; my heart trusts in him, and he helps me.",
    reference: "Psalm 28:7"
  },
  {
    text: "Fight the good fight of the faith. Take hold of the eternal life.",
    reference: "1 Timothy 6:12"
  },
  {
    text: "An athlete is not crowned unless he competes according to the rules.",
    reference: "2 Timothy 2:5"
  },
  {
    text: "For physical training is of some value, but godliness has value for all things.",
    reference: "1 Timothy 4:8"
  }
];

export const BibleVerse: React.FC = () => {
  const [verse, setVerse] = useState<Verse>(VERSES[0]);

  useEffect(() => {
    // Select a random verse on component mount
    const randomIdx = Math.floor(Math.random() * VERSES.length);
    setVerse(VERSES[randomIdx]);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Sparkles color={COLORS.primary} size={14} style={{ marginRight: 6 }} />
        <Text style={styles.bannerTitle}>Scripture of the Moment</Text>
      </View>
      <Text style={styles.verseText}>“{verse.text}”</Text>
      <Text style={styles.refText}>— {verse.reference}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0F2C20', // Forest green overlay
    borderRadius: 8,
    padding: SPACING.md,
    marginVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  bannerTitle: {
    color: COLORS.primaryLight,
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  verseText: {
    color: COLORS.text,
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 18,
    textAlign: 'center',
  },
  refText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'right',
    marginTop: 6,
  },
});
