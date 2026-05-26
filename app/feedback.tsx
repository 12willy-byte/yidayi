import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { ArrowLeft, Star, Send } from "lucide-react-native";
import { api } from "../src/lib/api";

const NPS_LABELS: Record<number, { label: string; color: string }> = {
  0: { label: "极不满意", color: "#DC2626" },
  1: { label: "非常不满意", color: "#DC2626" },
  2: { label: "不满意", color: "#EA580C" },
  3: { label: "有些不满意", color: "#EA580C" },
  4: { label: "略不满意", color: "#F59E0B" },
  5: { label: "一般", color: "#F59E0B" },
  6: { label: "略满意", color: "#84CC16" },
  7: { label: "有些满意", color: "#65A30D" },
  8: { label: "满意", color: "#16A34A" },
  9: { label: "非常满意", color: "#16A34A" },
  10: { label: "极满意", color: "#16A34A" },
};

export default function FeedbackScreen() {
  const [score, setScore] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const getScoreColor = (s: number) => {
    if (s <= 2) return "bg-red-500";
    if (s <= 4) return "bg-orange-500";
    if (s <= 6) return "bg-yellow-500";
    if (s <= 8) return "bg-lime-500";
    return "bg-green-500";
  };

  const handleSubmit = async () => {
    if (score === null) {
      Alert.alert("提示", "请先选择评分");
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await api.feedback.submitNPS(
        score,
        feedbackText.trim() || undefined
      );

      if (error) {
        Alert.alert("提交失败", error);
        return;
      }

      setSubmitted(true);
    } catch (err: any) {
      Alert.alert("提交失败", err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <View className="flex-1 bg-ivory-200">
        <View className="pt-14 px-5 flex-row items-center mb-6">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <ArrowLeft size={24} color="#2A2A25" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-charcoal-900">反馈</Text>
        </View>

        <View className="flex-1 items-center justify-center px-5">
          <View className="bg-white rounded-3xl p-8 items-center border border-charcoal-100 w-full">
            <View className="w-20 h-20 rounded-full bg-green-100 items-center justify-center mb-4">
              <Star size={36} color="#16A34A" fill="#16A34A" />
            </View>
            <Text className="text-2xl font-bold text-charcoal-900 mb-2">
              感谢您的反馈！
            </Text>
            <Text className="text-charcoal-500 text-center mb-2">
              您给出了 {score} 分的评价
            </Text>
            {NPS_LABELS[score!] && (
              <Text
                className="text-lg font-semibold mb-6"
                style={{ color: NPS_LABELS[score!].color }}
              >
                {NPS_LABELS[score!].label}
              </Text>
            )}
            <TouchableOpacity
              onPress={() => router.back()}
              className="bg-charcoal-900 rounded-2xl px-8 py-3"
            >
              <Text className="text-white font-semibold">返回</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-ivory-200">
      <View className="pt-14 px-5 flex-row items-center mb-6">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <ArrowLeft size={24} color="#2A2A25" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-charcoal-900">帮助与反馈</Text>
      </View>

      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        {/* NPS Question */}
        <View className="bg-white rounded-3xl p-6 mb-4 border border-charcoal-100">
          <Text className="text-lg font-bold text-charcoal-900 mb-1">
            您有多大可能向朋友推荐衣搭衣？
          </Text>
          <Text className="text-charcoal-400 text-sm mb-6">
            0 = 完全不可能，10 = 非常可能
          </Text>

          {/* Score buttons */}
          <View className="flex-row flex-wrap gap-2 mb-4">
            {Array.from({ length: 11 }, (_, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => setScore(i)}
                className={`w-10 h-10 rounded-full items-center justify-center border-2 ${
                  score === i
                    ? "border-charcoal-900 bg-charcoal-900"
                    : "border-charcoal-200 bg-white"
                }`}
              >
                <Text
                  className={`text-sm font-semibold ${
                    score === i ? "text-white" : "text-charcoal-600"
                  }`}
                >
                  {i}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Score range labels */}
          <View className="flex-row justify-between mb-6">
            <Text className="text-xs text-charcoal-400">完全不可能</Text>
            <Text className="text-xs text-charcoal-400">非常可能</Text>
          </View>

          {/* Selected score indicator */}
          {score !== null && (
            <View className="flex-row items-center mb-6">
              <View
                className={`h-3 rounded-full flex-1 ${getScoreColor(score)}`}
                style={{ width: `${(score / 10) * 100}%` }}
              />
              <View className="h-3 rounded-full bg-charcoal-100 flex-1" />
            </View>
          )}

          {/* Feedback text */}
          <Text className="text-sm font-semibold text-charcoal-700 mb-2">
            补充说明（可选）
          </Text>
          <TextInput
            className="bg-ivory-100 rounded-xl px-4 py-3 text-charcoal-900 mb-2"
            multiline
            numberOfLines={4}
            placeholder="告诉我们您的想法，帮助我们做得更好..."
            placeholderTextColor="#B0B0AA"
            value={feedbackText}
            onChangeText={setFeedbackText}
            textAlignVertical="top"
          />

          {/* Submit button */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={submitting || score === null}
            className={`rounded-2xl py-4 flex-row items-center justify-center ${
              score === null ? "bg-charcoal-200" : "bg-charcoal-900"
            }`}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Send size={18} color="#FFFFFF" />
                <Text className="text-white font-semibold ml-2">提交反馈</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Additional feedback options */}
        <View className="bg-white rounded-2xl overflow-hidden mb-10 border border-charcoal-100">
          <TouchableOpacity className="flex-row items-center justify-between px-5 py-4 border-b border-charcoal-100">
            <Text className="text-charcoal-900">报告问题</Text>
            <Text className="text-charcoal-400 text-sm">contact@yidayi.com</Text>
          </TouchableOpacity>
          <TouchableOpacity className="flex-row items-center justify-between px-5 py-4">
            <Text className="text-charcoal-900">功能建议</Text>
            <Text className="text-charcoal-400 text-sm">contact@yidayi.com</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
