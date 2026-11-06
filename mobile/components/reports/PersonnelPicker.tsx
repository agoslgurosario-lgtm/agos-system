import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Modal, Pressable,
  KeyboardAvoidingView,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { api } from "@/lib/api";

// A report stores personnel as one text string ("Juan, Pedro"). The backend joins names
// with commas, so the string and the list of names convert both ways.
export function namesFromText(text: string): string[] {
  return (text ?? "").split(",").map((n) => n.trim()).filter(Boolean);
}
export function namesToText(names: string[]): string {
  return names.join(", ");
}

/* ---------- the field shown inside a form: chips + button ---------- */

export function PersonnelField({ names, onRemove, onOpen, error, label = "Assigned Personnel" }: {
  names: string[];
  onRemove: (name: string) => void;
  onOpen: () => void;
  error?: string;
  label?: string;
}) {
  return (
    <View>
      <Text className="mb-1.5 text-xs font-semibold text-[#334155]">
        {label} <Text className="text-[#dc2626]">*</Text>
      </Text>
      <View className={`rounded-[10px] border bg-[#f1f5f9] px-3 py-2.5 ${error ? "border-[#dc2626]" : "border-[#e2e8f0]"}`}>
        {names.length > 0 && (
          <View className="mb-2 flex-row flex-wrap gap-1.5">
            {names.map((n) => (
              <View key={n} className="flex-row items-center rounded-full bg-[#E0ECFF] py-1 pl-3 pr-1.5">
                <Text className="mr-1 text-[12px] font-semibold text-[#122A48]">{n}</Text>
                <TouchableOpacity onPress={() => onRemove(n)} hitSlop={8} accessibilityLabel={`Remove ${n}`}>
                  <MaterialCommunityIcons name="close-circle" size={16} color="#64748B" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
        <TouchableOpacity onPress={onOpen} className="flex-row items-center gap-1.5 self-start">
          <MaterialCommunityIcons name="account-plus-outline" size={16} color="#1D4ED8" />
          <Text className="text-[13px] font-semibold text-[#1D4ED8]">
            {names.length ? "Add / change personnel" : "Assign personnel"}
          </Text>
        </TouchableOpacity>
      </View>
      {error ? <Text className="mt-1 text-[11px] text-[#dc2626]">{error}</Text> : null}
    </View>
  );
}

/* ---------- the panel: saved names, new names, same as last report ---------- */

interface PanelProps {
  names: string[];                       // currently assigned
  onChange: (names: string[]) => void;
  onDone: () => void;
}

export function PersonnelPanel({ names, onChange, onDone }: PanelProps) {
  const [saved, setSaved] = useState<string[]>([]);
  const [lastCrew, setLastCrew] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<string[]>([]);
  const [similar, setSimilar] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const seq = useRef(0);

  useEffect(() => {
    let alive = true;
    api.get("/api/personnel/")
      .then((r: any) => { if (alive) { setSaved(r.names ?? []); setLastCrew(r.last_crew ?? []); } })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  // live preview of how the typed text will be split
  useEffect(() => {
    if (!text.trim()) { setPreview([]); setSimilar({}); setError(null); setChecking(false); return; }
    const mine = ++seq.current;
    setChecking(true);
    const t = setTimeout(async () => {
      try {
        const r: any = await api.post("/api/personnel/", { text, save: false });
        if (mine !== seq.current) return;
        setPreview(r.names ?? []); setSimilar(r.similar ?? {}); setError(null);
      } catch (e: any) {
        if (mine !== seq.current) return;
        setPreview([]); setSimilar({}); setError(e?.error ?? "Could not check these names.");
      } finally {
        if (mine === seq.current) setChecking(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [text]);

  const has = (n: string) => names.some((x) => x.toLowerCase() === n.toLowerCase());
  const addMany = (list: string[]) => onChange([...names, ...list.filter((n, i) => !has(n) && list.findIndex((m) => m.toLowerCase() === n.toLowerCase()) === i)]);

  const available = saved.filter((n) => !has(n));
  const newOnes = preview.filter((n) => !has(n));
  const missingLast = lastCrew.filter((n) => !has(n));

  const addTyped = () => {
    if (!newOnes.length || error) return;
    addMany(newOnes);
    setSaved((s) => [...s, ...newOnes.filter((n) => !s.some((x) => x.toLowerCase() === n.toLowerCase()))]);
    setText("");
  };

  return (
    <View>
      <View className="mb-1 flex-row items-center justify-between">
        <Text className="text-base font-bold text-[#122A48]">Assign personnel</Text>
        <TouchableOpacity onPress={onDone} className="rounded-lg bg-[#122A48] px-4 py-1.5">
          <Text className="text-[13px] font-bold text-white">Done</Text>
        </TouchableOpacity>
      </View>
      <Text className="mb-3 text-[11px] leading-4 text-[#94A3B8]">
        Tap a saved name to add it, or type new names. New names are saved for next time.
      </Text>

      {names.length > 0 && (
        <View className="mb-3 flex-row flex-wrap gap-1.5">
          {names.map((n) => (
            <View key={n} className="flex-row items-center rounded-full bg-[#E0ECFF] py-1 pl-3 pr-1.5">
              <Text className="mr-1 text-[12px] font-semibold text-[#122A48]">{n}</Text>
              <TouchableOpacity onPress={() => onChange(names.filter((x) => x !== n))} hitSlop={8}>
                <MaterialCommunityIcons name="close-circle" size={16} color="#64748B" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {missingLast.length > 0 && (
        <TouchableOpacity
          onPress={() => addMany(lastCrew)}
          className="mb-3 flex-row items-center gap-2 self-start rounded-xl border border-[#BFD4F6] bg-[#F1F6FE] px-3 py-2"
        >
          <MaterialCommunityIcons name="history" size={16} color="#1D4ED8" />
          <Text className="text-[12px] font-semibold text-[#1D4ED8]">
            Same as last report ({lastCrew.length})
          </Text>
        </TouchableOpacity>
      )}

      <Text className="mb-1.5 text-[11px] font-bold text-[#64748B]">SAVED NAMES</Text>
      {loading ? (
        <ActivityIndicator className="my-3" />
      ) : available.length === 0 ? (
        <Text className="mb-3 text-[12px] text-[#94A3B8]">
          {saved.length ? "All saved names are already added." : "No saved names yet. Type one below."}
        </Text>
      ) : (
        <ScrollView style={{ maxHeight: 140 }} className="mb-3" nestedScrollEnabled keyboardShouldPersistTaps="handled">
          <View className="flex-row flex-wrap gap-1.5">
            {available.map((n) => (
              <TouchableOpacity
                key={n}
                onPress={() => addMany([n])}
                className="flex-row items-center gap-1 rounded-full border border-[#E2E8F0] bg-white px-3 py-1.5"
              >
                <MaterialCommunityIcons name="plus" size={13} color="#64748B" />
                <Text className="text-[12px] font-semibold text-[#334155]">{n}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}

      <Text className="mb-1.5 text-[11px] font-bold text-[#64748B]">ADD NEW NAMES</Text>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="e.g. Juan Dela Cruz, Maria Santos and Ana"
        placeholderTextColor="#94A3B8"
        maxLength={500}
        multiline
        className={`rounded-xl border bg-[#F8FAFC] px-3 py-2.5 text-[13px] text-[#122A48] ${error ? "border-[#dc2626]" : "border-[#E2E8F0]"}`}
        style={{ minHeight: 48, textAlignVertical: "top" }}
      />
      <View className="mt-1 min-h-[34px]">
        {error ? (
          <Text className="text-[11px] text-[#dc2626]">{error}</Text>
        ) : text.trim() === "" ? (
          <Text className="text-[11px] text-[#94A3B8]">
            Separate names with a comma, &, /, +, "and" or "at".
          </Text>
        ) : checking ? (
          <Text className="text-[11px] text-[#94A3B8]">Checking…</Text>
        ) : preview.length > 0 ? (
          <View>
            <Text className="text-[11px] text-[#475569]">
              Adding {preview.length} {preview.length === 1 ? "name" : "names"}: {preview.join(" · ")}
            </Text>
            {Object.entries(similar).map(([typed, existing]) => (
              <Text key={typed} className="text-[11px] text-[#B45309]">
                Did you mean "{existing}" instead of "{typed}"?
              </Text>
            ))}
          </View>
        ) : null}
      </View>
      <TouchableOpacity
        onPress={addTyped}
        disabled={!newOnes.length || !!error || checking}
        className="mt-2 items-center rounded-xl bg-[#1F9D55] py-3"
        style={!newOnes.length || error || checking ? { opacity: 0.4 } : undefined}
      >
        <Text className="text-sm font-bold text-white">
          {newOnes.length > 1 ? `Add ${newOnes.length} names` : "Add name"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

/* ---------- bottom sheet wrapper, for screens that are not already inside a Modal ---------- */

export function PersonnelSheet({ visible, names, onChange, onClose }: {
  visible: boolean;
  names: string[];
  onChange: (names: string[]) => void;
  onClose: () => void;
}) {
  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <Pressable className="flex-1 justify-end bg-black/35" onPress={onClose}>
          <Pressable className="max-h-[90%] rounded-t-3xl bg-white px-5 pb-8 pt-3" onPress={(e) => e.stopPropagation()}>
            <View className="mb-4 h-1 w-10 self-center rounded-full bg-[#E2E8F0]" />
            <ScrollView keyboardShouldPersistTaps="handled">
              <PersonnelPanel names={names} onChange={onChange} onDone={onClose} />
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
