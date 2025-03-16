import { Text, View, Image, TextInput, Pressable,  } from 'react-native';
import { useEffect, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';

export default function CreatePost() {
    const [caption, setCaption] = useState('');
    const [image, setImage] = useState<string | null>(null);

    const pickImage = async () => {
      // No permissions request is necessary for launching the image library
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });
    
      if (!result.canceled) {
        setImage(result.assets[0].uri);
      }
    };
  return (
    <View className="p-3 items-center">
        {/* Image Picker */}
        <Image
            source={{ uri: 'https://th.bing.com/th/id/R.82220e938f0a24900c7c3bce7bb033c4?rik=lGZvLk6St6MUfA&pid=ImgRaw&r=0' }}
            className='w-[60%] aspect-[3/4] bg-gray-300 rounded-lg'
        />
        <Text className='m-5 font-semibold text-blue-500'>
            Change
        </Text>

        {/* Caption */}
        <TextInput
            placeholder='Caption...'
            className='w-full p-3' 
            value={caption}
            onChangeText={text => setCaption(text)} 
        />    

        {/* Post Button */}
        <View className='w-full'>
            <Pressable className='bg-blue-500 p-4 w-full rounded-lg items-center'> 
                <Text className='text-white font-semibold'>Share</Text>
            </Pressable>
        </View>

    </View>
  );
}