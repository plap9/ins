import { Tabs } from "expo-router";

import FontAwesome from '@expo/vector-icons/FontAwesome';
import AntDesign from '@expo/vector-icons/AntDesign';
import Feather from '@expo/vector-icons/Feather';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function TabsLayout() {
    return (
        <Tabs screenOptions={{ tabBarActiveTintColor: 'black', tabBarShowLabel: false }}>
            <Tabs.Screen 
            name="index" 
            options={{ 
                headerTitle: 'For you', 
                tabBarIcon: ({color}) => (
                    <FontAwesome name="home" size={26} color={color} />
                ),
            }}
            />

            <Tabs.Screen 
            name="search" 
            options={{ 
                headerTitle: 'search', 
                tabBarIcon: ({color}) => (
                    <Feather name="search" size={24} color="black" />
                ),
            }}
            />

            <Tabs.Screen 
            name="new" 
            options={{ 
                headerTitle: 'New Post', 
                tabBarIcon: ({color}) => (
                    <Feather name="plus-square" size={24} color="black" />
                ),
            }}
            />
            
            <Tabs.Screen 
            name="reels" 
            options={{ 
                headerTitle: 'Reels', 
                tabBarIcon: ({color}) => (
                    <MaterialIcons name="video-library" size={24} color="black" />
                ),
            }}
            />

            <Tabs.Screen 
            name="profile" 
            options={{ 
                headerTitle: 'Profile Screen', 
                tabBarIcon: ({color}) => (
                    <FontAwesome name="user" size={26} color={color} />
                ),
            }}
            />
        </Tabs>
    )
}
