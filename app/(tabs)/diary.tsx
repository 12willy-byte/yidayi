import { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { api } from "../../src/lib/api";
import { useAuthStore } from "../../src/stores/authStore";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Camera,
  X,
  Cloud,
  Thermometer,
} from "lucide-react-native";
import type { DiaryEntry, Outfit } from "../../src/types/database";

export default function DiaryScreen() {
  const user = useAuthStore((s) => s.user);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [note, setNote] = useState("");
  const [weather, setWeather] = useState("");
  const [temperature, setTemperature] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const todayStr = format(new Date(), "yyyy-MM-dd");

  const { data: entries, refetch } = useQuery({
    queryKey: ["diary", format(monthStart, "yyyy-MM")],
    queryFn: async () => {
      const year = monthStart.getFullYear();
      const month = monthStart.getMonth() + 1;
      const { data } = await api.diary.list(year, month);
      return (data as DiaryEntry[]) || [];
    },
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [])
  );

  const entryMap = new Map((entries || []).map((e) => [e.date, e]));

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });
    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("权限不足", "需要相机权限");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });
    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const saveEntry = async () => {
    if (!selectedDate) return;
    setSaving(true);
    try {
      const existing = entryMap.get(selectedDate);
      if (existing) {
        await api.diary.update(existing.id, {
          note,
          weather: weather || null,
          temperature: temperature ? Number(temperature) : null,
          photo_url: photoUri || existing.photo_url,
        });
      } else {
        await api.diary.create({
          date: selectedDate,
          note,
          weather: weather || null,
          temperature: temperature ? Number(temperature) : null,
          photo_url: photoUri,
        });
      }

      await refetch();
      setShowModal(false);
    } catch (err: any) {
      Alert.alert("保存失败", err.message);
    } finally {
      setSaving(false);
    }
  };

  const openEntry = (date: string) => {
    setSelectedDate(date);
    const entry = entryMap.get(date);
    setNote(entry?.note || "");
    setWeather(entry?.weather || "");
    setTemperature(entry?.temperature?.toString() || "");
    setPhotoUri(entry?.photo_url || null);
    setShowModal(true);
  };

  const prevMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    );
  };

  const nextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    );
  };

  return (
    <View className="flex-1 bg-ivory-200">
      <View className="pt-14 pb-4 px-5 bg-ivory-200">
        <Text className="text-3xl font-bold text-charcoal-900">搭配日记</Text>
      </View>

      {/* Calendar header */}
      <View className="flex-row items-center justify-between px-5 mb-4">
        <TouchableOpacity onPress={prevMonth}>
          <ChevronLeft size={24} color="#2A2A25" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-charcoal-900">
          {format(currentDate, "yyyy年 M月")}
        </Text>
        <TouchableOpacity onPress={nextMonth}>
          <ChevronRight size={24} color="#2A2A25" />
        </TouchableOpacity>
      </View>

      {/* Day headers */}
      <View className="flex-row px-2 mb-2">
        {["日", "一", "二", "三", "四", "五", "六"].map((d) => (
          <View key={d} className="flex-1 items-center py-2">
            <Text className="text-xs text-charcoal-400 font-semibold">{d}</Text>
          </View>
        ))}
      </View>

      {/* Calendar grid */}
      <View className="flex-row flex-wrap px-2">
        {/* Empty cells before first day */}
        {Array.from({ length: monthStart.getDay() }).map((_, i) => (
          <View key={`empty-${i}`} className="w-[14.28%] aspect-square" />
        ))}
        {days.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const entry = entryMap.get(dateStr);
          const isToday = dateStr === todayStr;
          return (
            <TouchableOpacity
              key={dateStr}
              onPress={() => openEntry(dateStr)}
              className={`w-[14.28%] aspect-square items-center justify-center rounded-xl ${
                isToday ? "bg-gold-500" : ""
              }`}
            >
              <Text
                className={`text-sm ${
                  isToday
                    ? "text-white font-bold"
                    : "text-charcoal-700"
                }`}
              >
                {format(day, "d")}
              </Text>
              {entry?.photo_url ? (
                <Image
                  source={{ uri: entry.photo_url }}
                  style={{ width: 28, height: 28, borderRadius: 6, marginTop: 2 }}
                  contentFit="cover"
                />
              ) : entry ? (
                <View className="w-2 h-2 rounded-full bg-gold-500 mt-1" />
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Recent entries */}
      <ScrollView className="flex-1 px-5 mt-4" showsVerticalScrollIndicator={false}>
        <Text className="text-lg font-semibold text-charcoal-900 mb-3">最近记录</Text>
        {(entries || [])
          .sort((a, b) => b.date.localeCompare(a.date))
          .slice(0, 10)
          .map((entry) => (
            <TouchableOpacity
              key={entry.id}
              onPress={() => openEntry(entry.date)}
              className="bg-white rounded-2xl p-4 mb-3 flex-row border border-charcoal-100"
            >
              {entry.photo_url ? (
                <Image
                  source={{ uri: entry.photo_url }}
                  style={{ width: 70, height: 93, borderRadius: 12 }}
                  contentFit="cover"
                />
              ) : (
                <View className="w-[70] h-[93] bg-charcoal-100 rounded-xl items-center justify-center">
                  <Camera size={24} color="#8C8C84" />
                </View>
              )}
              <View className="ml-4 flex-1">
                <Text className="text-sm text-charcoal-600">
                  {entry.date}
                </Text>
                {entry.weather && (
                  <View className="flex-row items-center mt-1">
                    <Cloud size={14} color="#8C8C84" />
                    <Text className="ml-1 text-charcoal-500 text-xs">
                      {entry.weather}
                      {entry.temperature ? ` ${entry.temperature}°C` : ""}
                    </Text>
                  </View>
                )}
                {entry.note && (
                  <Text className="text-charcoal-700 mt-2" numberOfLines={2}>
                    {entry.note}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        {(entries || []).length === 0 && (
          <View className="items-center py-16">
            <Text className="text-5xl mb-3">📔</Text>
            <Text className="text-charcoal-500">点击日历日期开始记录穿搭</Text>
          </View>
        )}
        <View className="h-24" />
      </ScrollView>

      {/* Entry modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <View className="flex-1 bg-ivory-200">
          <View className="pt-14 px-5 flex-row items-center justify-between mb-6">
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <X size={24} color="#2A2A25" />
            </TouchableOpacity>
            <Text className="text-lg font-semibold text-charcoal-900">
              {selectedDate || ""}
            </Text>
            <TouchableOpacity onPress={saveEntry} disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color="#D4A83A" />
              ) : (
                <Text className="text-gold-500 font-semibold text-base">保存</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
            {/* Photo */}
            <TouchableOpacity
              onPress={photoUri ? () => setPhotoUri(null) : undefined}
              className="bg-white rounded-2xl p-4 items-center mb-4 border border-charcoal-100"
            >
              {photoUri ? (
                <Image
                  source={{ uri: photoUri }}
                  style={{ width: "100%", aspectRatio: 3 / 4, borderRadius: 12 }}
                  contentFit="cover"
                />
              ) : (
                <View className="w-full aspect-[3/4] items-center justify-center">
                  <View className="flex-row space-x-4">
                    <TouchableOpacity
                      onPress={takePhoto}
                      className="items-center"
                    >
                      <Camera size={40} color="#D4A83A" />
                      <Text className="mt-2 text-charcoal-500">拍照</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={pickPhoto}
                      className="items-center"
                    >
                      <Plus size={40} color="#D4A83A" />
                      <Text className="mt-2 text-charcoal-500">从相册选</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </TouchableOpacity>

            {/* Weather */}
            <View className="bg-white rounded-2xl p-4 mb-4 border border-charcoal-100">
              <View className="flex-row items-center mb-3">
                <Cloud size={18} color="#8C8C84" />
                <Text className="ml-2 text-sm font-semibold text-charcoal-400">
                  天气
                </Text>
              </View>
              <TextInput
                className="bg-charcoal-50 rounded-xl px-3 py-2 text-charcoal-900"
                placeholder="例如：晴朗"
                placeholderTextColor="#B0B0AA"
                value={weather}
                onChangeText={setWeather}
              />
            </View>

            {/* Temperature */}
            <View className="bg-white rounded-2xl p-4 mb-4 border border-charcoal-100">
              <View className="flex-row items-center mb-3">
                <Thermometer size={18} color="#8C8C84" />
                <Text className="ml-2 text-sm font-semibold text-charcoal-400">
                  温度 (°C)
                </Text>
              </View>
              <TextInput
                className="bg-charcoal-50 rounded-xl px-3 py-2 text-charcoal-900"
                placeholder="例如：22"
                placeholderTextColor="#B0B0AA"
                keyboardType="numeric"
                value={temperature}
                onChangeText={setTemperature}
              />
            </View>

            {/* Note */}
            <View className="bg-white rounded-2xl p-4 mb-6 border border-charcoal-100">
              <Text className="text-sm font-semibold text-charcoal-400 mb-3">
                今日笔记
              </Text>
              <TextInput
                className="bg-charcoal-50 rounded-xl px-3 py-2 text-charcoal-900 min-h-[100]"
                placeholder="记录今天的搭配想法..."
                placeholderTextColor="#B0B0AA"
                multiline
                textAlignVertical="top"
                value={note}
                onChangeText={setNote}
              />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
