import React, { useMemo, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, Modal, Pressable,
  ScrollView, ActivityIndicator, KeyboardAvoidingView,
} from "react-native";
import { api } from "@/lib/api";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { CustomWasteType } from "@/types/reports";

interface Props {
  visible: boolean;
  onClose: () => void;
  wasteTypes: CustomWasteType[];
  excludeIds: number[];
  onPick: (type: CustomWasteType) => void;
  onCreated: (type: CustomWasteType) => void;
}

export function AddOtherWasteModal({ visible, onClose, wasteTypes, excludeIds, onPick, onCreated }: Props) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<string | null>(null);

  const typed = text.trim();
  const available = useMemo(
    () => wasteTypes.filter((t) => !excludeIds.includes(t.waste_type_id)),
    [wasteTypes, excludeIds]
  );
  const matches = typed
    ? available.filter((t) => t.name.toLowerCase().includes(typed.toLowerCase()))
    : available;
  const alreadyExists = wasteTypes.some((t) => t.name.toLowerCase() === typed.toLowerCase());
  const suggested = suggestion
    ? available.find((t) => t.name.toLowerCase() === suggestion.toLowerCase())
    : null;

  const close = () => {
    setText(""); setError(null); setSuggestion(null);
    onClose();
  };

  const pick = (t: CustomWasteType) => { onPick(t); close(); };

  const createNew = async () => {
    setSaving(true); setError(null); setSuggestion(null);
    try {
      const created: CustomWasteType = await api.post("/api/custom-waste-types/", { name: typed });
      onCreated(created);
      close();
    } catch (err: any) {
      setError(err?.error ?? err?.detail ?? "Couldn't add that waste type. Please try again.");
      setSuggestion(err?.suggestion ?? null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={close}>
      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <Pressable className="flex-1 justify-end bg-black/35" onPress={close}>
          <Pressable className="rounded-t-3xl bg-white px-5 pb-8 pt-3" onPress={(e) => e.stopPropagation()}>
            <View className="mb-4 h-1 w-10 self-center rounded-full bg-[#E2E8F0]" />
            <Text className="mb-1 text-sm font-bold text-[#122A48]">Add other waste</Text>
            <Text className="mb-3 text-[11px] leading-4 text-[#94A3B8]">
              Pick one from the list, or type a new one (letters only, e.g. wood, mattress). New types are reviewed by MENRO.
            </Text>

            <TextInput
              value={text}
              onChangeText={(t) => { setText(t); setError(null); setSuggestion(null); }}
              placeholder="Search or type a waste type"
              placeholderTextColor="#94A3B8"
              maxLength={40}
              autoCapitalize="sentences"
              className="mb-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5 text-[13px] text-[#122A48]"
            />

            {available.length > 0 && (
              <Text className="mb-1.5 text-[11px] font-semibold text-[#64748B]">Saved waste types — tap to add</Text>
            )}
            <ScrollView className="mb-2 max-h-48" keyboardShouldPersistTaps="handled">
              <View className="gap-2">
                {matches.map((t) => (
                  <TouchableOpacity
                    key={t.waste_type_id}
                    onPress={() => pick(t)}
                    activeOpacity={0.7}
                    className="flex-row items-center justify-between rounded-xl border border-[#16a34a] bg-[#f0fdf4] px-3.5 py-3"
                  >
                    <View className="flex-row items-center gap-2">
                      <MaterialCommunityIcons name="plus-circle-outline" size={18} color="#16a34a" />
                      <Text className="text-[13px] font-semibold text-[#15803d]">{t.name}</Text>
                    </View>
                    {t.status === "Pending" && (
                      <Text className="text-[10px] font-semibold text-[#b45309]">Pending approval</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
              {matches.length === 0 && (
                <Text className="py-3 text-[12px] text-[#94A3B8]">
                  {available.length === 0 && !typed ? "No saved types yet." : "No matching saved type."}
                </Text>
              )}
            </ScrollView>

            {error && <Text className="mb-2 text-[12px] font-medium text-[#dc2626]">{error}</Text>}

            {suggested && (
              <TouchableOpacity onPress={() => pick(suggested)} className="mb-2 items-center rounded-xl bg-[#dcfce7] py-3">
                <Text className="text-[13px] font-bold text-[#16a34a]">Use “{suggested.name}” instead</Text>
              </TouchableOpacity>
            )}

            {typed.length >= 2 && !alreadyExists && (
              <TouchableOpacity
                onPress={createNew}
                disabled={saving}
                className="mb-2 items-center rounded-xl bg-[#122A48] py-3"
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-[13px] font-bold text-white">Add “{typed}” as a new waste type</Text>
                )}
              </TouchableOpacity>
            )}

            <TouchableOpacity onPress={close} className="items-center rounded-xl bg-[#f1f5f9] py-3">
              <Text className="text-[13px] font-semibold text-[#64748B]">Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}