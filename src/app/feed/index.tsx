import { FlatList, SafeAreaView } from "react-native";
import PostListItem from "../../components/PostListItem";
import posts from "../../../assets/data/posts.json";
import React, { useState } from "react";
import { View, Text, TouchableOpacity, Modal } from "react-native";
import Feather from '@expo/vector-icons/Feather';
import AntDesign from '@expo/vector-icons/AntDesign';
import Entypo from '@expo/vector-icons/Entypo';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import SimpleLineIcons from '@expo/vector-icons/SimpleLineIcons';
import { useRouter } from "expo-router";

export default function FeedScreen() {
    const router = useRouter();
    const [modalVisible, setModalVisible] = useState<boolean>(false);
    return (
    <SafeAreaView>
            {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-2 border-b border-gray-200">
            {/* Nút bên trái: chữ Instagram */}
            <TouchableOpacity onPress={() => setModalVisible(true)}>
                <View className="flex-row items-center gap-1">
                    <Text className="text-3xl font-bold">Instagram</Text>
                    <Entypo name="chevron-small-down" size={24} color="black" className="mt-1"/>
                </View>
            </TouchableOpacity>

            {/* Nút bên phải: Notifications và Messages */}
            <View className="flex-row gap-8">
            <TouchableOpacity onPress={() => router.push("/feed/notification")}>{ /* Xử lý thông báo */ }
                <Feather name="heart" size={24} color="black" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push("/feed/listmessage")}>
                <AntDesign name="message1" size={24} color="black" />
            </TouchableOpacity>
            </View>
        </View>

        {/* Modal hiển thị khi bấm vào chữ "Instagram" */}
        <Modal
            visible={modalVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setModalVisible(false)}
        >
            {/* Nút bấm ngoài modal để đóng */}
            <TouchableOpacity
            className="flex-1"
            onPress={() => setModalVisible(false)}
            >
            {/* Nội dung modal */}
            <View className="absolute mt-28 left-4 bg-white p-4 rounded-lg shadow-lg">
                <TouchableOpacity
                onPress={() => {
                    // Xử lý "Đang theo dõi"
                    setModalVisible(false);
                }}
                >
                <View className="flex-row items-center gap-3">
                    <SimpleLineIcons name="user-following" size={20} color="black" />
                    <Text className="text-lg">Đang theo dõi</Text>
                </View>
                </TouchableOpacity>
                <TouchableOpacity
                onPress={() => {
                    // Xử lý "Yêu thích"
                    setModalVisible(false);
                }}
                className="mt-2"
                >
                <View className="flex-row items-center gap-3">
                    <FontAwesome5 name="star" size={22} color="black" />
                    <Text className="text-lg">Yêu thích</Text>
                </View>
                </TouchableOpacity>
            </View>
            </TouchableOpacity>
        </Modal>
        <FlatList
            data={posts}
            className="bg-white "
            renderItem={({item}) => <PostListItem posts={item} />}
            contentContainerStyle={{
                gap: 10,
                alignItems: "center",
                width: "100%",
            }}
            showsVerticalScrollIndicator={false}
        />
    </SafeAreaView>
    );
}

