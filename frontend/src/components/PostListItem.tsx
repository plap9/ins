import { Text, View, Image } from "react-native";
import {Ionicons, Feather, AntDesign} from '@expo/vector-icons';
import { SafeAreaView } from "react-native-safe-area-context";


export default function PostListItem ({posts}: {posts: any}) {
    return (
        
            <View className="bg-white ">

            {/* Header */}
            <View className="p-3 flex-row items-center gap-3">
                <Image 
                    source={{uri: posts.image_url}}
                    className="w-12 aspect-square rounded-full"
                />
                <Text className="font-semibold text-l">{posts.user?.user_username}</Text>
            </View>

            {/* Posts */}
            <Image 
                source={{uri: posts.image_url}}  
                className="w-full aspect-[4/4]"
            />

            {/* Actions Icons */}
            <View className="flex-row gap-3 p-3">
                <AntDesign name="hearto" size={20} color="black" />
                <Ionicons name="chatbubble-outline" size={20} color="black" />
                <Feather name="send" size={20} color="black" />
                
                <Feather name="bookmark" size={20} color="black" className="ml-auto"/>
            </View>
        </View>
        
    );
}