import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { format } from 'date-fns';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { NavBar } from '../../components/layout/NavBar';
import { useChat } from '../../hooks/useChat';
import { useActivities } from '../../hooks/useActivities';
import { useAuthStore } from '../../store/authStore';
import type { Message } from '../../types';

export default function GroupChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const { activities } = useActivities();
  const { messages, isLoading, sendMessage, pinnedMessage } = useChat(id ?? '');

  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList<Message>>(null);

  const activity = useMemo(
    () => activities.find((a) => a.id === id),
    [activities, id]
  );

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const handleSend = async () => {
    if (!inputText.trim() || !user) return;
    const text = inputText.trim();
    setInputText('');
    await sendMessage(text, user.uid, user.displayName);
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.senderId === user?.uid;
    const isSystem = item.type === 'system';
    const timeStr = item.createdAt.toDate
      ? format(item.createdAt.toDate(), 'h:mm a')
      : '';

    if (isSystem) {
      return (
        <View style={styles.systemMessage}>
          <Text style={styles.systemText}>{item.text}</Text>
        </View>
      );
    }

    if (item.type === 'location') {
      return (
        <View style={[styles.bubbleRow, isMe ? styles.bubbleRowRight : styles.bubbleRowLeft]}>
          <View style={[styles.bubble, isMe ? styles.bubbleSent : styles.bubbleReceived]}>
            <Ionicons name="location" size={18} color={isMe ? Colors.white : Colors.accent} />
            <Text style={[styles.bubbleText, isMe && styles.bubbleTextSent]}>
              📍 Shared location
            </Text>
            <Text style={[styles.timeText, isMe && styles.timeTextSent]}>{timeStr}</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.bubbleRow, isMe ? styles.bubbleRowRight : styles.bubbleRowLeft]}>
        {!isMe && (
          <View style={styles.senderInfo}>
            <Text style={styles.senderName}>{item.senderName}</Text>
          </View>
        )}
        <View style={[styles.bubble, isMe ? styles.bubbleSent : styles.bubbleReceived]}>
          <Text style={[styles.bubbleText, isMe && styles.bubbleTextSent]}>
            {item.text}
          </Text>
          <Text style={[styles.timeText, isMe && styles.timeTextSent]}>{timeStr}</Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {activity?.title ?? 'Chat'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {activity?.participants.length ?? 0} participants
          </Text>
        </View>
      </View>

      {/* Pinned message banner */}
      {pinnedMessage && (
        <View style={styles.pinnedBanner}>
          <Ionicons name="pin" size={14} color={Colors.accent} />
          <Text style={styles.pinnedText} numberOfLines={1}>
            {pinnedMessage.text}
          </Text>
        </View>
      )}

      {/* Event info banner */}
      {activity && (
        <View style={styles.eventBanner}>
          <Text style={styles.eventBannerText}>
            {activity.dateTime.toDate
              ? `Tomorrow at ${format(activity.dateTime.toDate(), 'h:mm a')}`
              : ''
            }
          </Text>
          <Text style={styles.eventBannerSub}>{activity.location.name}, West Entrance</Text>
        </View>
      )}

      {/* Messages */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.accent} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: false })
          }
        />
      )}

      {/* Input bar */}
      <View style={[styles.inputBar, { paddingBottom: insets.bottom + Spacing.sm }]}>
        <TouchableOpacity style={styles.attachBtn}>
          <Ionicons name="add-circle-outline" size={26} color={Colors.slate} />
        </TouchableOpacity>
        <TextInput
          style={styles.textInput}
          placeholder="Type a message..."
          placeholderTextColor={Colors.slate}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim()}
        >
          <Ionicons
            name="send"
            size={20}
            color={inputText.trim() ? Colors.white : Colors.slate}
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    backgroundColor: Colors.white,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  headerTitle: {
    fontFamily: Typography.bodyBold,
    fontSize: 17,
    color: Colors.text,
  },
  headerSubtitle: {
    fontFamily: Typography.body,
    fontSize: 13,
    color: Colors.slate,
  },
  pinnedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accent + '10',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  pinnedText: {
    fontFamily: Typography.bodyMed,
    fontSize: 13,
    color: Colors.text,
    flex: 1,
  },
  eventBanner: {
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  eventBannerText: {
    fontFamily: Typography.bodyBold,
    fontSize: 14,
    color: Colors.white,
  },
  eventBannerSub: {
    fontFamily: Typography.body,
    fontSize: 12,
    color: Colors.white + 'CC',
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messagesList: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    flexGrow: 1,
  },
  systemMessage: {
    alignSelf: 'center',
    backgroundColor: Colors.divider + '60',
    borderRadius: BorderRadius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    marginVertical: Spacing.sm,
  },
  systemText: {
    fontFamily: Typography.body,
    fontSize: 12,
    color: Colors.slate,
  },
  bubbleRow: {
    marginBottom: Spacing.sm,
    maxWidth: '80%',
  },
  bubbleRowLeft: {
    alignSelf: 'flex-start',
  },
  bubbleRowRight: {
    alignSelf: 'flex-end',
  },
  senderInfo: {
    marginBottom: 2,
    marginLeft: 4,
  },
  senderName: {
    fontFamily: Typography.bodyMed,
    fontSize: 12,
    color: Colors.accent,
  },
  bubble: {
    borderRadius: BorderRadius.card,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  bubbleSent: {
    backgroundColor: Colors.accent,
    borderBottomRightRadius: 4,
  },
  bubbleReceived: {
    backgroundColor: Colors.white,
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontFamily: Typography.body,
    fontSize: 15,
    color: Colors.text,
    lineHeight: 21,
  },
  bubbleTextSent: {
    color: Colors.white,
  },
  timeText: {
    fontFamily: Typography.body,
    fontSize: 11,
    color: Colors.slate,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  timeTextSent: {
    color: Colors.white + 'AA',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.sm,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  attachBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    flex: 1,
    fontFamily: Typography.body,
    fontSize: 15,
    color: Colors.text,
    backgroundColor: Colors.cream,
    borderRadius: BorderRadius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    maxHeight: 100,
    marginRight: Spacing.sm,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  sendBtnDisabled: {
    backgroundColor: Colors.divider,
  },
});
