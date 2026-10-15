import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import { Screen } from '../components/Screen';
import { Button, Card, ListCard, Row, Section } from '../components/ui';
import { tapHaptic } from '../components/haptics';
import { FAQ, HELP_ARTICLES, SUPPORT_EMAIL } from '../lib/help';
import { SUPPORT_PHONE, SUPPORT_PHONE_HREF } from '../lib/support';
import { colors, font, radius, space } from '../theme';

// Hilfe-Center wie im Web (Fragezeichen oben rechts): Suche, Artikel zum Aufklappen, häufige Fragen,
// Rundgang starten und Support per Anfrage, E-Mail oder Telefon.
export function HelpScreen({ navigation }: { navigation: { goBack: () => void } }) {
  const nav = useNavigation<any>();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const needle = q.trim().toLowerCase();
  const articles = useMemo(() => HELP_ARTICLES.filter((a) => !needle || `${a.title} ${a.body}`.toLowerCase().includes(needle)), [needle]);
  const faq = useMemo(() => FAQ.filter((f) => !needle || `${f.q} ${f.a}`.toLowerCase().includes(needle)), [needle]);

  return (
    <Screen title="Hilfe-Center" subtitle="Wobei können wir helfen?" onBack={navigation.goBack}>
      <View style={styles.search}>
        <Ionicons name="search" size={18} color={colors.ink3} />
        <TextInput value={q} onChangeText={setQ} placeholder="Suchen, z. B. Papier oder Preis" placeholderTextColor={colors.ink3} style={styles.input} returnKeyType="search" />
      </View>

      <View style={styles.tiles}>
        <Tile icon="play-circle-outline" label="Rundgang starten" onPress={() => nav.navigate('Tour')} />
        <Tile icon="chatbubbles-outline" label="Anfrage stellen" onPress={() => nav.navigate('NewTicket')} />
        <Tile icon="mail-outline" label="E-Mail" onPress={() => void Linking.openURL(`mailto:${SUPPORT_EMAIL}`)} />
        <Tile icon="call-outline" label="Anrufen" onPress={() => void Linking.openURL(SUPPORT_PHONE_HREF)} />
      </View>

      <Section title="Anleitungen">
        <ListCard>
          {articles.map((a, i) => (
            <Animated.View key={a.id} layout={LinearTransition.duration(200)}>
              <Pressable
                onPress={() => {
                  tapHaptic();
                  setOpen(open === a.id ? null : a.id);
                }}
                style={[styles.item, i > 0 && styles.line]}
              >
                <Text style={{ ...font.callout, color: colors.ink, flex: 1, fontWeight: '600' }}>{a.title}</Text>
                <Ionicons name={open === a.id ? 'chevron-up' : 'chevron-down'} size={16} color={colors.ink3} />
              </Pressable>
              {open === a.id ? (
                <Animated.View entering={FadeIn.duration(180)} style={styles.body}>
                  <Text style={{ ...font.subhead, color: colors.ink2 }}>{a.body}</Text>
                  {a.route ? (
                    <Pressable onPress={() => nav.navigate(a.route!)} style={{ marginTop: 8 }}>
                      <Text style={{ ...font.callout, color: colors.brand, fontWeight: '600' }}>Zur Seite →</Text>
                    </Pressable>
                  ) : null}
                </Animated.View>
              ) : null}
            </Animated.View>
          ))}
        </ListCard>
      </Section>

      {faq.length ? (
        <Section title="Häufige Fragen">
          <ListCard>
            {faq.map((f, i) => (
              <Row key={f.q} title={f.q} subtitle={f.a} subtitleLines={4} titleLines={2} last={i === faq.length - 1} />
            ))}
          </ListCard>
        </Section>
      ) : null}

      <Card style={{ gap: 6 }}>
        <Text style={{ ...font.headline, color: colors.ink }}>Support</Text>
        <Text style={{ ...font.footnote, color: colors.ink2 }}>Oder anrufen: {SUPPORT_PHONE} · {SUPPORT_EMAIL}</Text>
        <Button title="Anfragen ansehen" kind="plain" icon="help-buoy-outline" onPress={() => nav.navigate('Support')} />
      </Card>
    </Screen>
  );
}

function Tile({ icon, label, onPress }: { icon: any; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => {
        tapHaptic();
        onPress();
      }}
      style={({ pressed }) => [styles.tile, pressed && { opacity: 0.8 }]}
    >
      <Ionicons name={icon} size={22} color={colors.brand} />
      <Text style={{ ...font.footnote, color: colors.ink, fontWeight: '600' }} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.card, borderRadius: radius.md, paddingHorizontal: space.md, minHeight: 50, borderWidth: 1, borderColor: colors.lineStrong },
  input: { flex: 1, ...font.body, fontSize: 17, color: colors.ink },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { flexBasis: '47%', flexGrow: 1, backgroundColor: colors.card, borderRadius: radius.lg, padding: space.md, gap: 6, minHeight: 74, justifyContent: 'center' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: space.lg, minHeight: 54 },
  line: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.lineStrong },
  body: { paddingHorizontal: space.lg, paddingBottom: space.md },
});
