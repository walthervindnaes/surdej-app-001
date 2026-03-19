// screens/RecipeScreen.js
// Levain — Opskrift-skærm med notifikations-tidsplan

import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import Slider from '@react-native-community/slider';
import { generateRecipe } from '../breadEngine';
import { scheduleBreadNotifications, cancelAllBreadNotifications, requestPermissions } from '../notifications/breadNotifications';

const TIME_MODES = [
  { key: 'quick',   label: 'Hurtig (12t)' },
  { key: 'evening', label: 'Aftenbager'   },
  { key: 'weekend', label: 'Weekend'      },
];

export default function RecipeScreen() {
  const [sourness,   setSourness]   = useState(50);
  const [crustiness, setCrustiness] = useState(50);
  const [openness,   setOpenness]   = useState(50);
  const [timeMode,   setTimeMode]   = useState('weekend');
  const [showRecipe, setShowRecipe] = useState(false);
  const [baking,     setBaking]     = useState(false);
  const [currentStep,setCurrentStep]= useState(0);

  const recipe = useMemo(() => generateRecipe({
    sourness, crustiness, openness, timeMode, flourGrams: 450,
  }), [sourness, crustiness, openness, timeMode]);

  useEffect(() => { requestPermissions(); }, []);

  async function startBaking() {
    Alert.alert('Start bagning?', 'Du får en notifikation ved hvert trin.', [
      { text: 'Ikke endnu', style: 'cancel' },
      { text: 'Start nu', onPress: async () => {
        const ids = await scheduleBreadNotifications(recipe.schedule, new Date());
        if (ids.length > 0) {
          setBaking(true);
          setCurrentStep(0);
          Alert.alert('Notifikationer planlagt!', `Du får besked ved alle ${recipe.schedule.length} trin. God bagning!`);
        }
      }},
    ]);
  }

  async function stopBaking() {
    Alert.alert('Stop bagning?', 'Alle planlagte notifikationer slettes.', [
      { text: 'Fortsæt', style: 'cancel' },
      { text: 'Stop', style: 'destructive', onPress: async () => {
        await cancelAllBreadNotifications();
        setBaking(false);
        setCurrentStep(0);
      }},
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Design dit brød</Text>

      <SliderRow label="Surhed"    value={sourness}   onValueChange={setSourness}   leftLabel="Mild"  rightLabel="Meget syrlig" color="#D4854A" />
      <SliderRow label="Sprødhed"  value={crustiness} onValueChange={setCrustiness} leftLabel="Blød"  rightLabel="Glasagtig"    color="#7A9E7E" />
      <SliderRow label="Luftighed" value={openness}   onValueChange={setOpenness}   leftLabel="Tæt"   rightLabel="Open crumb"   color="#85B7EB" />

      <Text style={styles.sectionLabel}>Tid til rådighed</Text>
      <View style={styles.timeRow}>
        {TIME_MODES.map(t => (
          <TouchableOpacity key={t.key} style={[styles.timeBtn, timeMode === t.key && styles.timeBtnActive]} onPress={() => setTimeMode(t.key)}>
            <Text style={[styles.timeBtnText, timeMode === t.key && styles.timeBtnTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {recipe.warnings.map((w, i) => (
        <View key={i} style={styles.warningBox}><Text style={styles.warningText}>{w.message}</Text></View>
      ))}

      {!showRecipe && (
        <TouchableOpacity style={styles.generateBtn} onPress={() => setShowRecipe(true)}>
          <Text style={styles.generateBtnText}>Generer opskrift</Text>
        </TouchableOpacity>
      )}

      {showRecipe && (
        <View style={styles.recipeContainer}>
          <View style={styles.metricsRow}>
            <Metric label="Hydrering" value={`${recipe.params.hydration}%`} />
            <Metric label="Surdej"    value={`${recipe.params.starterPct}%`} />
            <Metric label="Ovn"       value={`${recipe.params.ovenTemp}°C`} />
          </View>

          <Text style={styles.sectionLabel}>Ingredienser</Text>
          {recipe.ingredients.map((ing, i) => (
            <View key={i} style={styles.ingredientRow}>
              <Text style={styles.ingName}>{ing.name}</Text>
              <Text style={styles.ingAmount}>{ing.amount} {ing.unit}</Text>
            </View>
          ))}

          <Text style={styles.sectionLabel}>Tidsplan</Text>
          {!baking ? (
            <TouchableOpacity style={styles.startBtn} onPress={startBaking}>
              <Text style={styles.startBtnText}>Start bagning — få notifikationer</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.bakingBanner}>
              <Text style={styles.bakingText}>Bagning i gang — notifikationer aktive</Text>
              <TouchableOpacity onPress={stopBaking}><Text style={styles.stopText}>Stop</Text></TouchableOpacity>
            </View>
          )}

          {recipe.schedule.map((step, i) => (
            <View key={step.id} style={[styles.stepRow, baking && i === currentStep && styles.stepRowActive, baking && i < currentStep && styles.stepRowDone]}>
              <View style={[styles.stepNum, baking && i < currentStep && styles.stepNumDone]}>
                <Text style={styles.stepNumText}>{baking && i < currentStep ? '✓' : i + 1}</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTime}>{step.time}</Text>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDesc}>{step.description}</Text>
                {step.durationMinutes > 0 && <Text style={styles.stepDuration}>{step.durationMinutes} min</Text>}
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function SliderRow({ label, value, onValueChange, leftLabel, rightLabel, color }) {
  return (
    <View style={styles.sliderBlock}>
      <View style={styles.sliderTop}>
        <Text style={styles.sliderLabel}>{label}</Text>
        <Text style={[styles.sliderValue, { color }]}>{Math.round(value)}</Text>
      </View>
      <Slider minimumValue={0} maximumValue={100} step={1} value={value} onValueChange={onValueChange} minimumTrackTintColor={color} maximumTrackTintColor="#E8DDD4" thumbTintColor={color} />
      <View style={styles.sliderEnds}>
        <Text style={styles.sliderEndText}>{leftLabel}</Text>
        <Text style={styles.sliderEndText}>{rightLabel}</Text>
      </View>
    </View>
  );
}

function Metric({ label, value }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container:         { flex: 1, backgroundColor: '#F7F3EC' },
  content:           { padding: 24, paddingBottom: 60 },
  title:             { fontSize: 28, fontWeight: '400', color: '#2C1E10', marginBottom: 28, fontFamily: 'serif' },
  sectionLabel:      { fontSize: 11, fontWeight: '500', letterSpacing: 1.2, textTransform: 'uppercase', color: '#D4854A', marginTop: 24, marginBottom: 12 },
  sliderBlock:       { marginBottom: 20 },
  sliderTop:         { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  sliderLabel:       { fontSize: 14, fontWeight: '500', color: '#2C1E10' },
  sliderValue:       { fontSize: 13, fontWeight: '500' },
  sliderEnds:        { flexDirection: 'row', justifyContent: 'space-between' },
  sliderEndText:     { fontSize: 11, color: '#A09080' },
  timeRow:           { flexDirection: 'row', gap: 8 },
  timeBtn:           { flex: 1, paddingVertical: 10, borderRadius: 100, borderWidth: 0.5, borderColor: '#C8B8A8', alignItems: 'center' },
  timeBtnActive:     { backgroundColor: '#2C1E10', borderColor: '#2C1E10' },
  timeBtnText:       { fontSize: 12, color: '#7A6555' },
  timeBtnTextActive: { color: '#F7F3EC', fontWeight: '500' },
  warningBox:        { backgroundColor: '#FEF3E2', borderWidth: 0.5, borderColor: '#F0B882', borderRadius: 12, padding: 12, marginTop: 8 },
  warningText:       { fontSize: 13, color: '#854F0B', lineHeight: 20 },
  generateBtn:       { backgroundColor: '#2C1E10', borderRadius: 100, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  generateBtnText:   { color: '#F7F3EC', fontSize: 15, fontWeight: '500' },
  recipeContainer:   { marginTop: 32 },
  metricsRow:        { flexDirection: 'row', gap: 8, marginBottom: 8 },
  metric:            { flex: 1, backgroundColor: '#EDE8E0', borderRadius: 12, padding: 12 },
  metricLabel:       { fontSize: 11, color: '#7A6555', marginBottom: 4 },
  metricValue:       { fontSize: 20, fontWeight: '500', color: '#2C1E10' },
  ingredientRow:     { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: '#DDD5C8' },
  ingName:           { fontSize: 13, color: '#2C1E10', flex: 1, paddingRight: 8 },
  ingAmount:         { fontSize: 13, fontWeight: '500', color: '#2C1E10' },
  startBtn:          { backgroundColor: '#3A5A40', borderRadius: 100, paddingVertical: 14, alignItems: 'center', marginBottom: 20 },
  startBtnText:      { color: '#F7F3EC', fontSize: 14, fontWeight: '500' },
  bakingBanner:      { backgroundColor: '#EAF3DE', borderWidth: 0.5, borderColor: '#97C459', borderRadius: 12, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  bakingText:        { fontSize: 13, color: '#27500A', flex: 1 },
  stopText:          { fontSize: 13, color: '#E24B4A', fontWeight: '500', marginLeft: 12 },
  stepRow:           { flexDirection: 'row', gap: 12, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: '#DDD5C8' },
  stepRowActive:     { backgroundColor: '#FEF3E2', marginHorizontal: -8, paddingHorizontal: 8, borderRadius: 12, borderBottomWidth: 0 },
  stepRowDone:       { opacity: 0.4 },
  stepNum:           { width: 28, height: 28, borderRadius: 14, backgroundColor: '#EDE8E0', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 },
  stepNumDone:       { backgroundColor: '#EAF3DE' },
  stepNumText:       { fontSize: 12, fontWeight: '500', color: '#7A6555' },
  stepContent:       { flex: 1 },
  stepTime:          { fontSize: 11, color: '#D4854A', fontWeight: '500', marginBottom: 2 },
  stepTitle:         { fontSize: 14, fontWeight: '500', color: '#2C1E10', marginBottom: 4 },
  stepDesc:          { fontSize: 13, color: '#7A6555', lineHeight: 19 },
  stepDuration:      { fontSize: 11, color: '#A09080', marginTop: 4 },
});
