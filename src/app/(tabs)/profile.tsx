import { View, Text, TextInput, Image, TouchableOpacity, Pressable } from "react-native";
import { useState } from "react";
import * as ImagePicker from 'expo-image-picker';
import ProfileScreen from "~/app/profile/index";


export default function Profile() {
    return(
        <View>
            <ProfileScreen/>
        </View>
    );
}


