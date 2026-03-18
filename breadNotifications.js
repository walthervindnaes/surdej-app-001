// notifications/breadNotifications.js
// ─────────────────────────────────────────────────────────────────────────────
// Levain — Push-notifikationer til bagning
//
// Kræver: npm install expo-notifications expo-device
// Eller med bare React Native: npm install @notifee/react-native
//
// Denne fil bruger Expo Notifications (nemmest at sætte op)
// ─────────────────────────────────────────────────────────────────────────────

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// ── Opsætning — kald én gang ved app-start ───────────────────────────────────

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  false,
  }),
});

// ── Bed om tilladelse ────────────────────────────────────────────────────────

export async function requestPermissions() {
  if (!Device.isDevice) {
    console.warn('Push-notifikationer virker ikke i simulatoren');
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('Notifikations-tilladelse afvist');
    return false;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('bread', {
      name: 'Levain bagning',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      sound: true,
    });
  }

  return true;
}

// ── Planlæg alle notifikationer for en opskrift ──────────────────────────────

/**
 * @param {Array} schedule   - schedule fra generateRecipe()
 * @param {Date}  startTime  - hvornår brugeren starter (default: nu)
 * @returns {Array}          - liste af notifikations-IDs (gem til cancellation)
 */
export async function scheduleBreadNotifications(schedule, startTime = new Date()) {
  const granted = await requestPermissions();
  if (!granted) return [];

  // Annullér eventuelle tidligere notifikationer
  await cancelAllBreadNotifications();

  const notifIds = [];
  let cursor     = new Date(startTime);

  for (const step of schedule) {
    // Notifikation NU (ved trinets starttidspunkt)
    const triggerTime = new Date(cursor);

    // Spring fortid over
    if (triggerTime > new Date()) {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: stepTitle(step),
          body:  step.description,
          data:  { stepId: step.id },
          sound: true,
          ...(Platform.OS === 'android' && { channelId: 'bread' }),
        },
        trigger: { date: triggerTime },
      });
      notifIds.push(id);
    }

    // Påmindelse 5 min FØR næste trin (hvis trinets varighed > 10 min)
    if (step.durationMinutes > 10) {
      const reminderTime = addMinutes(cursor, step.durationMinutes - 5);
      if (reminderTime > new Date()) {
        const remId = await Notifications.scheduleNotificationAsync({
          content: {
            title: '5 minutter tilbage',
            body:  `Gør dig klar til: ${step.title}`,
            data:  { stepId: step.id, type: 'reminder' },
            sound: false,
            ...(Platform.OS === 'android' && { channelId: 'bread' }),
          },
          trigger: { date: reminderTime },
        });
        notifIds.push(remId);
      }
    }

    cursor = addMinutes(cursor, step.durationMinutes);
  }

  // Afslutnings-notifikation
  const doneTime = addMinutes(cursor, 0);
  if (doneTime > new Date()) {
    const doneId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Brødet er færdigt!',
        body:  'Tillykke! Lad det køle i mindst 1 time inden du skærer i det.',
        data:  { stepId: 'done' },
        sound: true,
        ...(Platform.OS === 'android' && { channelId: 'bread' }),
      },
      trigger: { date: doneTime },
    });
    notifIds.push(doneId);
  }

  // Gem IDs i AsyncStorage så vi kan aflyse dem senere
  await saveNotificationIds(notifIds);

  console.log(`Planlagt ${notifIds.length} notifikationer`);
  return notifIds;
}

// ── Aflyse alle brød-notifikationer ──────────────────────────────────────────

export async function cancelAllBreadNotifications() {
  const ids = await getSavedNotificationIds();
  for (const id of ids) {
    await Notifications.cancelScheduledNotificationAsync(id);
  }
  await saveNotificationIds([]);
  console.log(`Aflyst ${ids.length} notifikationer`);
}

// ── Hjælpefunktioner ─────────────────────────────────────────────────────────

function stepTitle(step) {
  const icons = {
    mix:          'Tid til at blande',
    add_starter:  'Tilsæt surdej og salt',
    bulk:         'Bulk fermentering starter',
    shape:        'Tid til at forme brødet',
    cold_proof:   'Sæt i køleskabet nu',
    final_proof:  'Efterhævning starter',
    preheat:      'Tænd ovnen nu',
    bake_lid_on:  'Bag med låg',
    bake_lid_off: 'Tag låget af',
    cool:         'Brødet er ude af ovnen',
  };

  if (step.id.startsWith('fold_')) {
    const num = step.id.split('_')[1];
    return `Stretch & fold nr. ${num}`;
  }

  return icons[step.id] || step.title;
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60000);
}

// AsyncStorage helpers
async function saveNotificationIds(ids) {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.setItem('bread_notif_ids', JSON.stringify(ids));
  } catch (e) {
    console.error('Kunne ikke gemme notifikations-IDs:', e);
  }
}

async function getSavedNotificationIds() {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const raw = await AsyncStorage.getItem('bread_notif_ids');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}
