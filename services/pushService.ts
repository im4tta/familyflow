
/**
 * Service to manage Web Push Notifications
 */

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.error("This browser does not support notifications.");
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === 'granted';
};

export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      // Use relative path directly to let the browser resolve against the correct document origin.
      // Do NOT manually construct absolute URLs using window.location.origin as it may differ
      // in sandboxed environments (e.g. AI Studio previews).
      const swUrl = './sw.js';
      
      const registration = await navigator.serviceWorker.register(swUrl, {
        scope: './'
      });
      
      console.log('SW registered successfully with scope:', registration.scope);
      return registration;
    } catch (error) {
      console.error('SW registration failed:', error);
    }
  } else {
    console.warn('Service Workers are not supported in this browser.');
  }
  return null;
};

/**
 * Send a local notification immediately (useful for testing or local app events)
 */
export const sendLocalNotification = async (title: string, body: string, url: string = '/') => {
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration && Notification.permission === 'granted') {
      // FIX: Cast options object to any to avoid "vibrate does not exist in type 'NotificationOptions'" error
      registration.showNotification(title, {
        body,
        data: { url },
        icon: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"%3E%3Crect width="512" height="512" rx="120" fill="%23F97316"/%3E%3Cpath d="M130 360L130 160L256 280L382 160L382 360" stroke="white" stroke-width="40" stroke-linecap="round" stroke-linejoin="round" fill="none"/%3E%3C/svg%3E',
        vibrate: [200, 100, 200],
        badge: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"%3E%3Crect width="512" height="512" rx="120" fill="%23F97316"/%3E%3Cpath d="M130 360L130 160L256 280L382 160L382 360" stroke="white" stroke-width="40" stroke-linecap="round" stroke-linejoin="round" fill="none"/%3E%3C/svg%3E'
      } as any);
    } else if (Notification.permission === 'granted') {
      // Fallback to basic notification if registration not ready
      new Notification(title, { body });
    }
  } catch (err) {
    console.error("Failed to send notification:", err);
  }
};

/**
 * Logic for actual Web Push (Requires a backend with VAPID keys)
 */
export const subscribeToPush = async (publicVapidKey: string) => {
  try {
    const registration = await navigator.serviceWorker.ready;
    
    // Check if subscription already exists
    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) return existingSubscription;

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
    });

    return subscription;
  } catch (error) {
    console.error('Push subscription failed:', error);
    return null;
  }
};

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
