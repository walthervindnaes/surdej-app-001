// navigation/AppNavigator.js
// ─────────────────────────────────────────────────────────────────────────────
// Levain — Navigation
//
// Kræver:
// npx expo install @react-navigation/native @react-navigation/bottom-tabs
// npx expo install react-native-screens react-native-safe-area-context
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import RecipeScreen      from '../screens/RecipeScreen';
import StarterCheckScreen from '../screens/StarterCheckScreen';

const Tab = createBottomTabNavigator();

// ── Tab ikoner (SVG-lignende med View) ────────────────────────────────────────

function BreadIcon({ focused }) {
  return (
    <View style={[iconStyles.wrap, focused && iconStyles.wrapActive]}>
      <View style={[iconStyles.breadOuter, focused && iconStyles.breadOuterActive]}>
        <View style={iconStyles.breadInner} />
        <View style={iconStyles.breadLine} />
      </View>
    </View>
  );
}

function StarterIcon({ focused }) {
  return (
    <View style={[iconStyles.wrap, focused && iconStyles.wrapActive]}>
      <View style={[iconStyles.jar, focused && iconStyles.jarActive]}>
        <View style={iconStyles.jarBubble1} />
        <View style={iconStyles.jarBubble2} />
        <View style={iconStyles.jarBubble3} />
      </View>
    </View>
  );
}

const iconStyles = StyleSheet.create({
  wrap:             { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  wrapActive:       { backgroundColor: 'rgba(212,133,74,0.12)' },
  breadOuter:       { width: 22, height: 18, borderRadius: 11, backgroundColor: '#C8B8A8', alignItems: 'center', justifyContent: 'center' },
  breadOuterActive: { backgroundColor: '#D4854A' },
  breadInner:       { width: 14, height: 10, borderRadius: 7, backgroundColor: 'rgba(255,255,255,0.3)' },
  breadLine:        { position: 'absolute', top: 5, width: 10, height: 1.5, backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 1 },
  jar:              { width: 18, height: 22, borderRadius: 4, borderWidth: 1.5, borderColor: '#C8B8A8', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 3 },
  jarActive:        { borderColor: '#D4854A' },
  jarBubble1:       { width: 5, height: 5, borderRadius: 3, backgroundColor: '#C8B8A8', position: 'absolute', top: 4, left: 3 },
  jarBubble2:       { width: 4, height: 4, borderRadius: 2, backgroundColor: '#C8B8A8', position: 'absolute', top: 7, right: 3 },
  jarBubble3:       { width: 3, height: 3, borderRadius: 2, backgroundColor: '#C8B8A8', position: 'absolute', top: 3, right: 6 },
});

// ── Tab bar ───────────────────────────────────────────────────────────────────

function TabBar({ state, descriptors, navigation }) {
  return (
    <View style={tabStyles.container}>
      {state.routes.map((route, index) => {
        const { options }  = descriptors[route.key];
        const label        = options.tabBarLabel ?? route.name;
        const focused      = state.index === index;

        return (
          <View
            key={route.key}
            style={tabStyles.tab}
            onStartShouldSetResponder={() => true}
            onResponderRelease={() => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
            }}
          >
            {options.tabBarIcon?.({ focused })}
            <Text style={[tabStyles.label, focused && tabStyles.labelActive]}>
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const tabStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FDFAF5',
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(44,30,16,0.1)',
    paddingBottom: 24,
    paddingTop: 10,
    paddingHorizontal: 16,
  },
  tab:         { flex: 1, alignItems: 'center', gap: 4 },
  label:       { fontSize: 11, color: '#A09080', fontWeight: '400' },
  labelActive: { color: '#D4854A', fontWeight: '500' },
});

// ── App Navigator ─────────────────────────────────────────────────────────────

export default function AppNavigator() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Tab.Navigator
          tabBar={props => <TabBar {...props} />}
          screenOptions={{
            headerStyle: {
              backgroundColor: '#FDFAF5',
              shadowColor: 'transparent',
              elevation: 0,
              borderBottomWidth: 0.5,
              borderBottomColor: 'rgba(44,30,16,0.08)',
            },
            headerTitleStyle: {
              fontFamily: 'serif',
              fontSize: 18,
              fontWeight: '400',
              color: '#2C1E10',
            },
            headerTitleAlign: 'center',
          }}
        >
          <Tab.Screen
            name="Opskrift"
            component={RecipeScreen}
            options={{
              title: 'Levain',
              tabBarLabel: 'Opskrift',
              tabBarIcon: ({ focused }) => <BreadIcon focused={focused} />,
            }}
          />
          <Tab.Screen
            name="SurdejsCheck"
            component={StarterCheckScreen}
            options={{
              title: 'Surdejscheck',
              tabBarLabel: 'Er den klar?',
              tabBarIcon: ({ focused }) => <StarterIcon focused={focused} />,
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
