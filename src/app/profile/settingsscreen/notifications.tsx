import React, { useState } from 'react';
import { View, Text, ScrollView, Switch, SafeAreaView, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Header from './components/Header';

// Notification setting item component
const NotificationItem = ({ title, description, value, onValueChange }: 
  { title: string; description?: string; value: boolean; onValueChange: (value: boolean) => void }
) => (
  <View className="flex-row items-center justify-between py-4 border-b border-gray-100">
    <View className="flex-1 pr-4">
      <Text className="text-base font-medium">{title}</Text>
      {description && <Text className="text-sm text-gray-500 mt-1">{description}</Text>}
    </View>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: "#e0e0e0", true: "#3897f0" }}
      thumbColor="#fff"
    />
  </View>
);

// Group of notification settings
const NotificationGroup = ({ title, children }: 
  { title: string; children: React.ReactNode }
) => (
  <View className="mb-6">
    <Text className="text-lg font-semibold mb-2">{title}</Text>
    <View className="bg-white rounded-lg p-3 shadow-sm">
      {children}
    </View>
  </View>
);

export default function NotificationsScreen() {
  // States for different notification settings
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [likesNotify, setLikesNotify] = useState(true);
  const [commentsNotify, setCommentsNotify] = useState(true);
  const [followRequestsNotify, setFollowRequestsNotify] = useState(true);
  const [followAcceptedNotify, setFollowAcceptedNotify] = useState(true);
  const [directMessagesNotify, setDirectMessagesNotify] = useState(true);
  const [liveAndReelsNotify, setLiveAndReelsNotify] = useState(true);
  const [supportRequestsNotify, setSupportRequestsNotify] = useState(true);
  const [remindersNotify, setRemindersNotify] = useState(true);
  const [productAnnouncementsNotify, setProductAnnouncementsNotify] = useState(false);
  const [feedbackRequestsNotify, setFeedbackRequestsNotify] = useState(false);

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <Header title="Notifications" />
      <ScrollView className="flex-1 p-4">
        {/* Push Notifications */}
        <NotificationGroup title="Push Notifications">
          <NotificationItem
            title="Push Notifications"
            description="Receive notifications on your device"
            value={pushNotifications}
            onValueChange={setPushNotifications}
          />
        </NotificationGroup>

        {/* Email Notifications */}
        <NotificationGroup title="Email Notifications">
          <NotificationItem
            title="Email Notifications"
            description="Receive notifications via email"
            value={emailNotifications}
            onValueChange={setEmailNotifications}
          />
        </NotificationGroup>

        {/* Posts, Stories and Comments */}
        <NotificationGroup title="Posts, Stories and Comments">
          <NotificationItem
            title="Likes"
            description="Someone liked your post"
            value={likesNotify}
            onValueChange={setLikesNotify}
          />
          <NotificationItem
            title="Comments"
            description="Someone commented on your post"
            value={commentsNotify}
            onValueChange={setCommentsNotify}
          />
          <NotificationItem
            title="Live and Reels"
            description="New live videos or reels from people you follow"
            value={liveAndReelsNotify}
            onValueChange={setLiveAndReelsNotify}
          />
        </NotificationGroup>

        {/* Following and Followers */}
        <NotificationGroup title="Following and Followers">
          <NotificationItem
            title="Follow Requests"
            description="Someone requested to follow you"
            value={followRequestsNotify}
            onValueChange={setFollowRequestsNotify}
          />
          <NotificationItem
            title="Accepted Follow Requests"
            description="Someone accepted your follow request"
            value={followAcceptedNotify}
            onValueChange={setFollowAcceptedNotify}
          />
        </NotificationGroup>

        {/* Messages */}
        <NotificationGroup title="Messages">
          <NotificationItem
            title="Direct Messages"
            description="Someone sent you a message"
            value={directMessagesNotify}
            onValueChange={setDirectMessagesNotify}
          />
        </NotificationGroup>

        {/* From Instagram */}
        <NotificationGroup title="From Instagram">
          <NotificationItem
            title="Reminders"
            description="Reminders about unread notifications and other activity"
            value={remindersNotify}
            onValueChange={setRemindersNotify}
          />
          <NotificationItem
            title="Product Announcements"
            description="Information about new Instagram features"
            value={productAnnouncementsNotify}
            onValueChange={setProductAnnouncementsNotify}
          />
          <NotificationItem
            title="Support Requests"
            description="Updates about your support requests"
            value={supportRequestsNotify}
            onValueChange={setSupportRequestsNotify}
          />
          <NotificationItem
            title="Feedback Requests"
            description="Requests to provide feedback on Instagram"
            value={feedbackRequestsNotify}
            onValueChange={setFeedbackRequestsNotify}
          />
        </NotificationGroup>
      </ScrollView>
    </SafeAreaView>
  );
}
