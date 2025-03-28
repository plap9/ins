import React from "react";    
import { View, Text, Image, ScrollView } from "react-native";
  
interface Story {
  id: string;
  image: string;
  title?: string;
  username?: string;
  hasStory?: boolean;
  isYourStory?: boolean;
  isOpened?: boolean;
  isHighlight?: boolean;
}

interface HighlightsStoryProps {
  stories: Story[];
}

const StoryList = ({ stories }: HighlightsStoryProps): JSX.Element => {
  return (
    <View className="mb-4">
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {stories.map((story) => (
          <View key={story.id} className="items-center mr-4">
            <View className={`
             ${story.hasStory ? (story.isOpened ? "border-pink-500 border-2" : "border-gray-300 border-2") : ""} 
             ${story.isHighlight ? "w-16" : "w-24"}
             aspect-square rounded-full border border-gray-300 p-0.5 
            `}>
              <Image
                source={{ uri: story.image }}
                className="w-full h-full rounded-full"
              />
            </View>
            <Text className="mt-1 text-xs text-center">{story.title || story.username}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

export default StoryList;
