
import { Text, View, Image, TextInput, Pressable } from "react-native";
import { useState } from "react";

export default function CreatePost() {
    const [caption, setCaption] = useState('');
    return (
        <View className="p-3 items-center flex-1">
            {/* Image Picker */}
            <Image
                source={{
                    uri: 'https://anhnail.vn/wp-content/uploads/2024/10/anh-meme-ech-xanh-5.webp'
                }}
                className='w-2/3 aspect-[3/4] rounded-lg shadow-md'
            />
            <Text onPress={() => {}} className="text-blue-500 font-semibold m-3 ">
                Change
            </Text>
            
            {/* Text Input for caption */}
            <TextInput 
                value={caption}
                onChange={(newValue) => setCaption(newValue)}
                placeholder="Write a caption..."
                className="bg-slate-100 w-full p-3 rounded-lg"
            />
            
            {/* Post Button */}
            <View className="mt-auto w-full">
                <Pressable className="bg-blue-500 w-full p-4 items-center rounded-md">
                    <Text className="text-white font-semibold">Share Post </Text>
                </Pressable>
            </View>

        </View>
    );
}