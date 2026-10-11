import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import Constants from 'expo-constants'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'
import { api } from './api'

const TOKEN_KEY = 'push_token'
const prefKey = (userId: number) => `push_enabled_${userId}`

// App open = AlertsContext already plays the live alert sound, so no system banner then.
// Push is for when the app is closed or in the background.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
})

// channel ids must match the channelId the backend sends
async function setupChannels() {
  if (Platform.OS !== 'android') return
  await Notifications.setNotificationChannelAsync('critical', {
    name: 'Critical alerts',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 400, 200, 400],
    lightColor: '#D81010',
  })
  await Notifications.setNotificationChannelAsync('warning', {
    name: 'Warning alerts',
    importance: Notifications.AndroidImportance.HIGH,
  })
  await Notifications.setNotificationChannelAsync('info', {
    name: 'Info alerts',
    importance: Notifications.AndroidImportance.DEFAULT,
  })
}

async function getExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null // emulators can't receive push

  await setupChannels() // Android 13+ needs a channel to exist before asking permission

  let { status } = await Notifications.getPermissionsAsync()
  if (status !== 'granted') {
    ;({ status } = await Notifications.requestPermissionsAsync())
  }
  if (status !== 'granted') return null

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId
  const { data } = await Notifications.getExpoPushTokenAsync({ projectId })
  return data
}

export async function registerForPush(): Promise<boolean> {
  try {
    const token = await getExpoPushToken()
    if (!token) return false
    await api.post('/api/push/register/', { token, platform: Platform.OS })
    await SecureStore.setItemAsync(TOKEN_KEY, token)
    return true
  } catch {
    return false
  }
}

export async function unregisterFromPush() {
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY)
    if (token) await api.post('/api/push/unregister/', { token })
  } catch {
    // logging out must never fail because of this
  } finally {
    await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {})
  }
}

// per-user preference, stored on the phone (default: on)
export async function isPushEnabled(userId: number): Promise<boolean> {
  return (await SecureStore.getItemAsync(prefKey(userId))) !== 'false'
}

// returns the resulting state (false if the user denied the permission)
export async function setPushEnabled(userId: number, enabled: boolean): Promise<boolean> {
  if (enabled) {
    const ok = await registerForPush()
    if (!ok) return false
    await SecureStore.setItemAsync(prefKey(userId), 'true')
    return true
  }
  await unregisterFromPush()
  await SecureStore.setItemAsync(prefKey(userId), 'false')
  return false
}