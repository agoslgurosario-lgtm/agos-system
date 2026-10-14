import { useEffect, useState, useRef } from 'react'
import { Modal, Pressable, Text, View, Alert, Switch } from 'react-native'
import { isPushEnabled, setPushEnabled } from '../../lib/pushNotifications'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../lib/AuthContext'
import { useRouter } from 'expo-router'


interface Props {
  visible: boolean
  onClose: () => void
}

function CredentialRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between items-center py-2.5 border-b border-slate-100">
      <Text className="text-[12px] text-slate-500">{label}</Text>
      <Text className="text-[13px] font-semibold text-slate-800">{value}</Text>
    </View>
  )
}

export default function ProfileSheet({ visible, onClose }: Props) {
  const router = useRouter()
  const { user, logout } = useAuth()
  const [pushOn, setPushOn] = useState(true)
  const pushQueue = useRef<Promise<unknown>>(Promise.resolve())

  useEffect(() => {
    if (user) isPushEnabled(user.user_id).then(setPushOn)
  }, [user?.user_id])

  if (!user) return null

  const initials = `${user.first_name[0] ?? ''}${user.last_name[0] ?? ''}`.toUpperCase()

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => { onClose(); logout() } },
    ])
  }

  const togglePush = (next: boolean) => {
    setPushOn(next) // flip immediately; the real work happens in the background
    pushQueue.current = pushQueue.current.then(async () => {
      const result = await setPushEnabled(user.user_id, next)
      if (result !== next) {
        setPushOn(result) // e.g. permission denied: put the switch back
        if (next && !result) {
          Alert.alert(
            'Notifications blocked',
            'Allow notifications for AGOS in your phone settings, then try again.'
          )
        }
      }
    })
  }


  return (
    <Modal transparent visible={visible} animationType="slide">
      <Pressable className="flex-1 bg-black/35 justify-end" onPress={onClose}>
        <Pressable className="bg-white rounded-t-3xl p-5" onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View className="flex-row justify-between items-center mb-4">
            <View className="flex-row items-center">
              <Ionicons name="person-circle-outline" size={18} color="#122A48" />
              <Text className="ml-2 text-[15px] font-bold text-slate-800">Profile</Text>
            </View>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={20} color="#64748B" />
            </Pressable>
          </View>

          {/* Avatar + name */}
          <View className="items-center mb-5">
            <View className="w-16 h-16 rounded-full bg-[#122A48] items-center justify-center mb-2">
              <Text className="text-white text-lg font-bold">{initials}</Text>
            </View>
            <Text className="text-[16px] font-bold text-slate-800">
              {user.first_name} {user.last_name}
            </Text>
            <Text className="text-[12px] text-slate-500">{user.position ?? user.user_role}</Text>
          </View>

          {/* Credentials */}
          <CredentialRow label="Email" value={user.email} />
          <CredentialRow label="Role" value={user.user_role} />
          {user.barangay_details && (
            <CredentialRow label="Barangay" value={user.barangay_details.barangay_name} />
          )}
          <CredentialRow label="Status" value={user.status} />

          <View className="flex-row justify-between items-center py-2.5 border-b border-slate-100">
            <View className="flex-1 pr-3">
              <Text className="text-[12px] text-slate-500">Push notifications</Text>
              <Text className="text-[11px] text-slate-400">
                Clog and water level alerts for your barangay
              </Text>
            </View>
            <Switch value={pushOn} onValueChange={togglePush}/>
          </View>

          {/* Actions */}
          <Pressable
            className="w-full border border-slate-300 rounded-lg py-3.5 items-center mt-5 flex-row justify-center gap-2"
            onPress={() => router.push('/user-manual')}
          >
            <Ionicons name="book-outline" size={16} color="#334155" />
            <Text className="text-slate-700 text-[14px] font-semibold">User Manual</Text>
          </Pressable>

          <Pressable
            className="w-full bg-[#D81010] rounded-lg py-3.5 items-center mt-3 flex-row justify-center gap-2"
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={16} color="white" />
            <Text className="text-white text-[14px] font-semibold">Log Out</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  )
}