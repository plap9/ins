
import { Text, View, Image, TextInput, Pressable } from "react-native";
import { useEffect, useState } from "react";
import * as ImagePicker from 'expo-image-picker';

export default function CreatePost() {
    const [caption, setCaption] = useState('');
    const [image, setImage] = useState<string | null>(null);

    useEffect(() => {
        if(!image) {
            pickImage();
        }
    }, [image]);

    const pickImage = async () => {
        // No permissions request is necessary for launching the image library
        let result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images', 'videos'],
          allowsEditing: true,
          aspect: [3, 4],
          quality: 1,
        });
    
        console.log(result);
    
        if (!result.canceled) {
          setImage(result.assets[0].uri);
        }
      };

    return (
        <View className="p-3 items-center flex-1">
            {/* Image Picker */}
            {image ? (
            <Image
                source={{ uri: image }}
                className='w-2/3 aspect-[3/4] rounded-lg bg-slate-300'/>
            ) : (
                <View className="w-2/3 aspect-[3/4] rounded-lg bg-slate-300"/>
            )}

            <Text onPress={pickImage} className="text-blue-500 font-semibold m-3 ">
                Change
            </Text>
            
            {/* Text Input for caption */}
            <TextInput 
                value={caption}
                onChangeText={(text) => setCaption(text)}
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