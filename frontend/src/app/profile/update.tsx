import { View, Text, TextInput, Image, TouchableOpacity, Pressable, Alert } from "react-native";
import { useState } from "react";
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from "expo-router";
import { MaterialIcons } from '@expo/vector-icons';
import { getUserProfile, updateUserProfile } from '~/services/userService';
import { useEffect } from 'react';
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";

export default function UpdateProfile() {
    const router = useRouter();
    const { authData } = useAuth();
    const [userId, setUserId] = useState<number | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [image, setImage] = useState<string | null>(null);
    const [username, setUsername] = useState("");
    const [bio, setBio] = useState("");
    const [email, setEmail] = useState("");
    const [gender, setGender] = useState("");
    const [uploadingText, setUploadingText] = useState('Đang cập nhật...');

    useEffect(() => {
        if (authData?.user?.user_id) {
            setUserId(authData.user.user_id);
        }
    }, [authData]);

    const pickImage = async () => {
        try {
            let result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.4,
            });
            
            if (!result.canceled) {
                const selectedImage = result.assets[0];
                if (!selectedImage.uri.startsWith('file:')) {
                    console.warn(`[UpdateProfile] URI của ảnh không phải là file local: ${selectedImage.uri}`);
                }
                
                setImage(selectedImage.uri);
            }
        } catch (error) {
            console.error('[UpdateProfile] Lỗi khi chọn ảnh:', error);
            Alert.alert('Lỗi', 'Không thể chọn ảnh. Vui lòng thử lại sau.');
        }
    };

    useEffect(() => {
        const fetchUserProfile = async () => {
            if (!userId) return;
            
            try {
                const response = await getUserProfile(userId);
                const userData = response.user;
                
                setUsername(userData.username || '');
                setBio(userData.bio || '');
                setEmail(userData.email || '');
                setGender(userData.gender || '');
                if (userData.profile_picture) {
                    setImage(userData.profile_picture);
                }
            } catch (error) {
                console.error('Error fetching user profile:', error);
                Alert.alert('Error', 'Failed to fetch user profile');
            }
        };
        
        fetchUserProfile();
    }, [userId]);

    const getBase64FromUri = async (uri: string): Promise<string> => {
        try {
            const response = await fetch(uri);
            if (!response.ok) {
                throw new Error(`Không thể đọc ảnh: ${response.status} ${response.statusText}`);
            }
            const blob = await response.blob();
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    if (typeof reader.result === 'string') {
                        const base64data = reader.result.split(',')[1];
                        resolve(base64data);
                    } else {
                        reject(new Error('Kết quả không phải là chuỗi'));
                    }
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            console.error('[UpdateProfile] Lỗi khi chuyển đổi URI thành base64:', error);
            throw error;
        }
    };

    const handleUpdateProfile = async () => {
        if (!userId) {
            Alert.alert('Lỗi', 'Không thể cập nhật hồ sơ. Vui lòng đăng nhập lại.');
            return;
        }
        
        setLoading(true);
        setUploadingText('Đang cập nhật hồ sơ...');
        
        try {
            const updateData: any = {
                username,
                bio,
                gender
            };
            
            if (image && image.startsWith('file:')) {
                try {
                    setUploadingText('Đang chuẩn bị ảnh...');
                    
                    const base64Image = await getBase64FromUri(image);
                    updateData.avatar_base64 = base64Image;
                } catch (imageError) {
                    console.error('[UpdateProfile] Lỗi khi xử lý ảnh:', imageError);
                    Alert.alert('Lỗi', 'Không thể xử lý ảnh. Vui lòng thử lại sau.');
                    setLoading(false);
                    return;
                }
            }
            
            setUploadingText('Đang cập nhật thông tin...');
            try {
                const response = await updateUserProfile(userId, updateData);
                Alert.alert('Thành công', 'Cập nhật hồ sơ thành công!');
                router.back();
            } catch (updateError) {
                console.error('[UpdateProfile] Lỗi khi cập nhật hồ sơ:', updateError);
                Alert.alert('Lỗi', 'Không thể cập nhật hồ sơ. Vui lòng thử lại sau.');
            }
        } catch (error) {
            console.error('[UpdateProfile] Lỗi tổng thể:', error);
            Alert.alert('Lỗi', 'Đã xảy ra lỗi khi cập nhật hồ sơ!');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView>
            <View className="p-4 bg-white h-full">
                {/* Nút quay về Profile */}
                <Pressable onPress={() => router.back()} className="py-2">
                    <MaterialIcons name="arrow-back-ios" size={24} color="black" />
                </Pressable>
    
                {/* Avatar Image Picker */}
                <View className="items-center mb-4">
                    {image ? (
                        <Image source={{ uri: image }} className="w-24 h-24 rounded-full bg-slate-300" />
                    ) : (
                        <View className="w-24 h-24 rounded-full bg-slate-300" />
                    )}
                    <Text onPress={pickImage} className="text-blue-500 font-semibold mt-2">
                        Change avatar
                    </Text>
                </View>
    
                {/* Form */}
                <View className="py-4">
                    {/* Hàng Username */}
                    <View className="flex-row py-2">
                        <Text className="w-1/3 text-gray-600 font-medium">Username</Text>
                        <TextInput
                            placeholder="Enter username"
                            value={username}
                            onChangeText={setUsername}
                            className="flex-1 p-2 border-b border-gray-200"
                        />
                    </View>
    
                    {/* Hàng Bio */}
                    <View className="flex-row py-2">
                        <Text className="w-1/3 text-gray-600 font-medium">Bio</Text>
                        <TextInput
                            placeholder="Enter bio"
                            value={bio}
                            onChangeText={setBio}
                            className="flex-1 p-2 border-b border-gray-200"
                        />
                    </View>
    
                    {/* Hàng Email */}
                    <View className="flex-row py-2">
                        <Text className="w-1/3 text-gray-600 font-medium">Email</Text>
                        <TextInput
                            placeholder="Enter email"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            className="flex-1 p-2 border-b border-gray-200"
                        />
                    </View>
    
                    {/* Hàng Gender */}
                    <View className="flex-row border-b border-gray-200 py-2 pb-6">
                        <Text className="w-1/3 text-gray-600 font-medium">Gender</Text>
                        <Pressable onPress={() => router.push("/profile/gender")} className="flex-1 p-2">
                            <Text className="text-gray-500">{gender || "Select gender"}</Text>
                        </Pressable>
                    </View>
                </View>
    
                {/* Submit Button */}
                <TouchableOpacity
                    className="bg-blue-500 mt-6 p-3 rounded-lg"
                    onPress={handleUpdateProfile}
                    disabled={loading}
                >
                    <Text className="text-white text-center font-semibold">
                        {loading ? uploadingText : "Update Profile"}
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}