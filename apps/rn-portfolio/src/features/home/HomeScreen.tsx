import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import { LinkedInIcon } from '../../components/brand-icons';
import { Icon } from '../../components/Icon';
import { FadeIn, Page } from '../../components/layout';
import { Span, Text } from '../../components/Text';
import { LINKEDIN_URL, RESUME_URL } from '../../config';
import { colors, fonts } from '../../theme';

const headCrop = require('../../../assets/images/head-crop.png');
const easter = require('../../../assets/images/easter-2026-web.jpg');
const familyNight = require('../../../assets/images/family-night-2026.jpg');
const orchards = require('../../../assets/images/orchards-2025.jpg');

const PHOTO_GRID_MAX_WIDTH = 850;
const PHOTO_GAP = 4;

// Opens a page outside the app, like target="_blank": a new tab on the web, the in-app browser otherwise
function openExternal(url: string) {
  if (Platform.OS === 'web') {
    Linking.openURL(url);
  } else {
    WebBrowser.openBrowserAsync(url);
  }
}

/** The home page: the bio, links and family photos. */
export function HomeScreen() {
  const router = useRouter();
  const [gridWidth, setGridWidth] = useState(0);

  // The Easter photo is 3:4 portrait; the stacked ones are 4:3 landscape. A 9:8 split makes the left
  // photo as tall as the two stacked photos and the gap between them.
  const columns = gridWidth - PHOTO_GAP;
  const stackWidth = (columns * 8) / 17;
  const stackPhotoHeight = (stackWidth * 3) / 4;

  return (
    <Page>
      <FadeIn style={styles.container}>
        <View style={styles.headWrapper}>
          <Image source={headCrop} style={styles.head} contentFit="contain" accessibilityLabel="Devin Voss" />
        </View>
        <View style={styles.intro}>
          <Text weight="medium" style={styles.name} accessibilityRole="header">Devin Voss</Text>
          <Text weight="medium" style={styles.title}>Lead Front-End Software Engineer</Text>
          <View style={styles.links}>
            <Pressable accessibilityRole="link" accessibilityLabel="LinkedIn Profile" onPress={() => openExternal(LINKEDIN_URL)}>
              <LinkedInIcon size={24} />
            </Pressable>
            <Pressable accessibilityRole="link" accessibilityLabel="Resume" onPress={() => openExternal(RESUME_URL)}>
              <Icon name="description" color={colors.button} />
            </Pressable>
          </View>
        </View>

        <View style={styles.bio}>
          <Text style={styles.paragraph}>
            I&apos;ve been working professionally as a software developer since 2015 with a focus in Angular development. I followed along with tutorials in the Angular Beta, which was interesting since many tutorials and documentation
            were quickly outdated by changes in syntax prior to the full release. When Angular was released I was ecstatic because everything just clicked for me, and over ten years later it still does. My first big
            Angular project was piloting an Angular 2 application inside of a .NET application at Marketsharp. Since then I&apos;ve led the front-end on everything from a COVID-19 testing site that serviced multiple states
            to a healthcare provider application at Optum.
          </Text>
          <Text style={styles.paragraph}>
            Today I&apos;m a Senior Front-End Engineer at DroneSense, where I&apos;ve led the rebuilds of four of our Angular applications, including our mission-critical live operations client for viewing real-time drone video
            and telemetry on a map. I also built a translation automation system that works across all of our Angular apps, and I&apos;ve become the go-to developer for starting new projects. In 2026 I moved to an
            AI-native workflow, and much like when Angular first came out, it&apos;s changed how fast I can learn and build.
          </Text>
          <Text style={styles.paragraph}>
            This site was created using an NX monorepo with Angular 22, NestJS, and MongoDB.
          </Text>
          <Text style={styles.paragraph}>
            Outside of work, I&apos;m usually watching movies (I keep track of them{' '}
            <Span style={styles.link} accessibilityRole="link" onPress={() => router.navigate('/movie')}>here</Span>) or playing the drums, which I&apos;ve done since I was 13. I also grow a new lineup of
            hot peppers every year to make my own crushed pepper flakes. I play tennis, rollerblade, and am a former company-wide table tennis champion. My wife, Micah, and I are raising two sons, Ridley and Zephyr.
          </Text>
        </View>

        <View style={styles.photoGrid} onLayout={event => setGridWidth(event.nativeEvent.layout.width)}>
          {gridWidth > 0 && (
            <>
              <Image
                source={easter}
                accessibilityLabel="Easter 2026"
                contentFit="cover"
                style={{ width: columns - stackWidth, height: stackPhotoHeight * 2 + PHOTO_GAP }}
              />
              <View style={styles.photoStack}>
                <Image source={familyNight} accessibilityLabel="Family night 2026" contentFit="cover" style={{ width: stackWidth, height: stackPhotoHeight }} />
                <Image source={orchards} accessibilityLabel="Orchards 2025" contentFit="cover" style={{ width: stackWidth, height: stackPhotoHeight }} />
              </View>
            </>
          )}
        </View>
      </FadeIn>
    </Page>
  );
}

const styles = StyleSheet.create({
  container: { padding: 12, backgroundColor: colors.dvLightGray },
  headWrapper: { alignItems: 'center', marginBottom: 12 },
  // w-52; the photo is 669 by 753
  head: { width: 208, aspectRatio: 669 / 753 },
  intro: { alignItems: 'center', marginBottom: 12 },
  name: { fontSize: 32, lineHeight: 40, marginBottom: 4, color: colors.text, textAlign: 'center' },
  title: { fontSize: 24, lineHeight: 32, marginBottom: 4, color: colors.text, textAlign: 'center' },
  links: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  bio: { width: '100%', maxWidth: 1152, alignSelf: 'center', paddingVertical: 12, gap: 24 },
  paragraph: { fontSize: 16, lineHeight: 24, color: colors.text },
  link: { textDecorationLine: 'underline', fontFamily: fonts.regular },
  photoGrid: { flexDirection: 'row', gap: PHOTO_GAP, width: '100%', maxWidth: PHOTO_GRID_MAX_WIDTH, alignSelf: 'center' },
  photoStack: { gap: PHOTO_GAP }
});
