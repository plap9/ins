import React from "react";
import { View, Text, Image, ScrollView } from "react-native";
  
interface Story {
  id: string;
  image: string;
  title: string;
}

interface HighlightsStoryProps {
  stories: Story[];
}

const HighlightsStory = ({ stories }: HighlightsStoryProps): JSX.Element => {
  return (
    <View className="mb-4">
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {stories.map((story) => (
          <View key={story.id} className="items-center mr-4">
            <View className="w-16 h-16 rounded-full border border-gray-300 p-0.5">
              <Image
                source={{ uri: story.image }}
                className="w-full h-full rounded-full"
              />
            </View>
            <Text className="mt-1 text-xs text-center">{story.title}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

export default HighlightsStory;
