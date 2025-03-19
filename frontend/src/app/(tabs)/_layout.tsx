import { Tabs } from "expo-router";
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Feather from '@expo/vector-icons/Feather';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function TabsLayout() {
    return (
        <Tabs screenOptions={{ 
            tabBarActiveTintColor: 'black', 
            tabBarShowLabel: false 
        }}>
            <Tabs.Screen 
                name="index" 
                options={{ 
                    headerShown: false,  // Ẩn header
                    tabBarIcon: ({color}) => (
                        <FontAwesome name="home" size={26} color={color} />
                    ),
                }}
            />
            <Tabs.Screen 
                name="search" 
                options={{ 
                    headerShown: false,  // Ẩn header
                    tabBarIcon: ({color}) => (
                        <Feather name="search" size={24} color="black" />
                    ),
                }}
            />
            <Tabs.Screen 
                name="new" 
                options={{ 
                    headerShown: false,  // Ẩn header
                    tabBarIcon: ({color}) => (
                        <Feather name="plus-square" size={24} color="black" />
                    ),
                }}
            />
            <Tabs.Screen 
                name="reels" 
                options={{ 
                    headerShown: false,  // Ẩn header
                    tabBarIcon: ({color}) => (
                        <MaterialIcons name="video-library" size={24} color="black" />
                    ),
                }}
            />
            <Tabs.Screen 
                name="profile" 
                options={{ 
                    headerShown: false,  // Ẩn header
                    tabBarIcon: ({color}) => (
                        <FontAwesome name="user" size={26} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}
