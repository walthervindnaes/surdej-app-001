// screens/StarterCheckScreen.js
// ─────────────────────────────────────────────────────────────────────────────
// Levain — "Er min surdej klar?" skærm
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Image, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { analyzeStarterImage } from '../ai/starterAnalysis';

// TODO: hent fra din backend (se kommentar i starterAnalysis.js)
const API_KEY = 'sk-ant-INDSÆT_HER';

export default function StarterCheckScreen() {
  const [image,    setImage]    = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState(null);
  const [error,    setError]    = useState(null);

  // ── Tag nyt billede ────────────────────────────────────────────────────────
  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Tilladelse kræves', 'Levain skal bruge kamera-adgang for at analysere din surdej.');
      return;
    }

    const picked = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: true,
    });

    if (!picked.canceled) {
      const asset = picked.assets[0];
      setImage(asset.uri);
      setResult(null);
      setError(null);
      await runAnalysis(asset.base64);
    }
  }

  // ── Vælg fra bibliotek ─────────────────────────────────────────────────────
  async function pickFromLibrary() {
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: true,
    });

    if (!picked.canceled) {
      const asset = picked.assets[0];
      setImage(asset.uri);
      setResult(null);
      setError(null);
      await runAnalysis(asset.base64);
    }
  }

  // ── Kør AI-analyse ─────────────────────────────────────────────────────────
  async function runAnalysis(base64) {
    setLoading(true);
    setError(null);
    try {
      const analysis = await analyzeStarterImage(base64, API_KEY);
      setResult(analysis);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      <Text style={styles.title}>Er min surdej klar?</Text>
      <Text style={styles.subtitle}>Tag et billede af din surdej — AI'en analyserer om den er klar til bagning.</Text>

      {/* Kamera knapper */}
      <View style={styles.btnRow}>
        <TouchableOpacity style={styles.cameraBtn} onPress={takePhoto}>
          <Text style={styles.cameraBtnIcon}>📷</Text>
          <Text style={styles.cameraBtnText}>Tag billede</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.cameraBtn, styles.cameraBtnSecondary]} onPress={pickFromLibrary}>
          <Text style={styles.cameraBtnIcon}>🖼</Text>
          <Text style={[styles.cameraBtnText, styles.cameraBtnTextSecondary]}>Vælg billede</Text>
        </TouchableOpacity>
      </View>

      {/* Billede preview */}
      {image && (
        <View style={styles.imageContainer}>
          <Image source={{ uri: image }} style={styles.previewImage} />
        </View>
      )}

      {/* Loading */}
      {loading && (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#D4854A" />
          <Text style={styles.loadingText}>Analyserer din surdej...</Text>
        </View>
      )}

      {/* Fejl */}
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => image && runAnalysis(image)}>
            <Text style={styles.retryText}>Prøv igen</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Resultat */}
      {result && !loading && (
        <View style={styles.resultContainer}>

          {/* Hoved-verdict */}
          <View style={[styles.verdictBox, result.ready ? styles.verdictReady : styles.verdictNotReady]}>
            <Text style={styles.verdictEmoji}>{result.ready ? '✓' : '○'}</Text>
            <View style={styles.verdictText}>
              <Text style={[styles.verdictTitle, result.ready ? styles.verdictTitleReady : styles.verdictTitleNotReady]}>
                {result.ready ? 'Klar til bagning!' : 'Ikke klar endnu'}
              </Text>
              <Text style={styles.verdictDesc}>{result.verdict}</Text>
            </View>
            <View style={styles.confidenceBadge}>
              <Text style={styles.confidenceText}>{result.confidence}%</Text>
              <Text style={styles.confidenceLabel}>sikker</Text>
            </View>
          </View>

          {/* Ventetid */}
          {!result.ready && result.waitHours > 0 && (
            <View style={styles.waitBox}>
              <Text style={styles.waitText}>
                Estimeret ventetid: <Text style={styles.waitHours}>{result.waitHours} {result.waitHours === 1 ? 'time' : 'timer'}</Text>
              </Text>
            </View>
          )}

          {/* Positive tegn */}
          {result.signs?.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Det ser godt ud</Text>
              {result.signs.map((sign, i) => (
                <View key={i} style={styles.signRow}>
                  <View style={styles.signDot} />
                  <Text style={styles.signText}>{sign}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Bekymringer */}
          {result.concerns?.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>At være opmærksom på</Text>
              {result.concerns.map((concern, i) => (
                <View key={i} style={styles.concernRow}>
                  <View style={styles.concernDot} />
                  <Text style={styles.concernText}>{concern}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Råd */}
          <View style={styles.adviceBox}>
            <Text style={styles.adviceLabel}>Råd fra Levain</Text>
            <Text style={styles.adviceText}>{result.advice}</Text>
          </View>

          {/* Tag nyt billede */}
          <TouchableOpacity style={styles.retakeBtn} onPress={takePhoto}>
            <Text style={styles.retakeBtnText}>Tag nyt billede</Text>
          </TouchableOpacity>

        </View>
      )}

      {/* Tip hvis intet billede */}
      {!image && !loading && (
        <View style={styles.tipBox}>
          <Text style={styles.tipTitle}>Tips til et godt billede</Text>
          <Text style={styles.tipText}>Fotografér din surdej fra siden i et gennemsigtigt glas, så du kan se boblerne og hvor meget den har hævet. God belysning giver bedre analyse.</Text>
        </View>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:            { flex: 1, backgroundColor: '#F7F3EC' },
  content:              { padding: 24, paddingBottom: 60 },
  title:                { fontSize: 26, fontWeight: '400', color: '#2C1E10', marginBottom: 8, fontFamily: 'serif' },
  subtitle:             { fontSize: 14, color: '#7A6555', lineHeight: 21, marginBottom: 28 },
  btnRow:               { flexDirection: 'row', gap: 12, marginBottom: 24 },
  cameraBtn:            { flex: 1, backgroundColor: '#2C1E10', borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
  cameraBtnSecondary:   { backgroundColor: 'transparent', borderWidth: 0.5, borderColor: '#C8B8A8' },
  cameraBtnIcon:        { fontSize: 24, marginBottom: 6 },
  cameraBtnText:        { fontSize: 13, fontWeight: '500', color: '#F7F3EC' },
  cameraBtnTextSecondary: { color: '#7A6555' },
  imageContainer:       { borderRadius: 20, overflow: 'hidden', marginBottom: 20 },
  previewImage:         { width: '100%', height: 260, resizeMode: 'cover' },
  loadingBox:           { alignItems: 'center', padding: 40, gap: 16 },
  loadingText:          { fontSize: 14, color: '#7A6555' },
  errorBox:             { backgroundColor: '#FCEBEB', borderWidth: 0.5, borderColor: '#F09595', borderRadius: 14, padding: 16, alignItems: 'center', gap: 8 },
  errorText:            { fontSize: 13, color: '#791F1F', textAlign: 'center' },
  retryText:            { fontSize: 13, color: '#D4854A', fontWeight: '500' },
  resultContainer:      { gap: 16 },
  verdictBox:           { borderRadius: 18, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14 },
  verdictReady:         { backgroundColor: '#EAF3DE', borderWidth: 0.5, borderColor: '#97C459' },
  verdictNotReady:      { backgroundColor: '#FEF3E2', borderWidth: 0.5, borderColor: '#F0B882' },
  verdictEmoji:         { fontSize: 28, width: 40, textAlign: 'center' },
  verdictText:          { flex: 1 },
  verdictTitle:         { fontSize: 16, fontWeight: '500', marginBottom: 3 },
  verdictTitleReady:    { color: '#27500A' },
  verdictTitleNotReady: { color: '#854F0B' },
  verdictDesc:          { fontSize: 13, color: '#7A6555', lineHeight: 18 },
  confidenceBadge:      { alignItems: 'center' },
  confidenceText:       { fontSize: 18, fontWeight: '500', color: '#2C1E10' },
  confidenceLabel:      { fontSize: 10, color: '#A09080' },
  waitBox:              { backgroundColor: '#F7F3EC', borderWidth: 0.5, borderColor: '#DDD5C8', borderRadius: 14, padding: 14 },
  waitText:             { fontSize: 13, color: '#7A6555', textAlign: 'center' },
  waitHours:            { fontWeight: '500', color: '#D4854A' },
  section:              { gap: 8 },
  sectionLabel:         { fontSize: 11, fontWeight: '500', letterSpacing: 1.1, textTransform: 'uppercase', color: '#D4854A' },
  signRow:              { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  signDot:              { width: 7, height: 7, borderRadius: 4, backgroundColor: '#3A5A40', marginTop: 5, flexShrink: 0 },
  signText:             { fontSize: 13, color: '#2C1E10', lineHeight: 20, flex: 1 },
  concernRow:           { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  concernDot:           { width: 7, height: 7, borderRadius: 4, backgroundColor: '#D4854A', marginTop: 5, flexShrink: 0 },
  concernText:          { fontSize: 13, color: '#2C1E10', lineHeight: 20, flex: 1 },
  adviceBox:            { backgroundColor: '#FDFAF5', borderWidth: 0.5, borderColor: '#DDD5C8', borderRadius: 16, padding: 18 },
  adviceLabel:          { fontSize: 11, fontWeight: '500', letterSpacing: 1.1, textTransform: 'uppercase', color: '#D4854A', marginBottom: 8 },
  adviceText:           { fontSize: 14, color: '#2C1E10', lineHeight: 22 },
  retakeBtn:            { borderWidth: 0.5, borderColor: '#C8B8A8', borderRadius: 100, paddingVertical: 13, alignItems: 'center' },
  retakeBtnText:        { fontSize: 13, color: '#7A6555', fontWeight: '500' },
  tipBox:               { backgroundColor: '#FDFAF5', borderWidth: 0.5, borderColor: '#DDD5C8', borderRadius: 16, padding: 20, marginTop: 8 },
  tipTitle:             { fontSize: 14, fontWeight: '500', color: '#2C1E10', marginBottom: 8 },
  tipText:              { fontSize: 13, color: '#7A6555', lineHeight: 20 },
});
