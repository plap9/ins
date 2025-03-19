import { View, SafeAreaView} from "react-native";
import { useState } from "react";
import * as ImagePicker from 'expo-image-picker';
import ProfileScreen from "~/app/profile/index";


export default function Profile() {
    return(
        <SafeAreaView>
            <View>
                <ProfileScreen/>
            </View>
        </SafeAreaView>
    );
}


