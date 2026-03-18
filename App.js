// App.js
// ─────────────────────────────────────────────────────────────────────────────
// Levain — App entry point
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import AppNavigator from './navigation/AppNavigator';

// Håndtér notifikations-tryk mens appen er åben
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  false,
  }),
});

export default function App() {
  useEffect(() => {
    // Lyt på notifikations-tryk (åbner appen fra baggrund)
    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      const stepId = response.notification.request.content.data?.stepId;
      console.log('Bruger trykkede på notifikation for trin:', stepId);
      // TODO: naviger til det rigtige trin i opskriften
    });
    return () => sub.remove();
  }, []);

  return (
    <>
      <StatusBar style="dark" backgroundColor="#FDFAF5" />
      <AppNavigator />
    </>
  );
}
