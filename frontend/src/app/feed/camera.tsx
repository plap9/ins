// import React, { useState, useEffect, useRef } from "react";
// import { View, TouchableOpacity, Text } from "react-native";
// import { Camera } from "expo-camera";
// import type { CameraType } from "expo-camera"; // chỉ dùng làm type
// import { Ionicons, MaterialIcons } from "@expo/vector-icons";
// import { useRouter } from "expo-router";
// import { SafeAreaView } from "react-native-safe-area-context";

// // Ép kiểu Camera thành một component JSX hợp lệ.
// const Cam = Camera as unknown as React.ComponentType<any>;

// export default function CameraScreen() {
//   const [hasPermission, setHasPermission] = useState<boolean | null>(null);
//   // Sử dụng string literal cho giá trị của cameraType
//   const [cameraType, setCameraType] = useState<CameraType>("back");
//   const [isFlashOn, setIsFlashOn] = useState<boolean>(false);
//   // Sử dụng any cho ref để tránh lỗi type
//   const cameraRef = useRef<any>(null);
//   const router = useRouter();

//   useEffect(() => {
//     (async () => {
//       const { status } = await Camera.requestCameraPermissionsAsync();
//       setHasPermission(status === "granted");
//     })();
//   }, []);

//   if (hasPermission === null) {
//     return <View />;
//   }
//   if (hasPermission === false) {
//     return (
//       <View className="flex-1 items-center justify-center">
//         <Text className="text-lg">No access to camera</Text>
//       </View>
//     );
//   }

//   const takePicture = async () => {
//     if (cameraRef.current) {
//       const photo = await cameraRef.current.takePictureAsync();
//       console.log(photo);
//       // Ở đây bạn có thể chuyển hướng đến màn hình xem trước hoặc xử lý ảnh chụp
//       // router.push("/feed/camera/preview", { photo });
//     }
//   };

//   return (
//     <SafeAreaView className=" relative bg-black">
//       <Cam
//         ref={cameraRef}
//         style={{ flex: 1 }}
//         type={cameraType}
//         flashMode={isFlashOn ? "on" : "off"}
//       />
//       {/* Header - Nút Back */}
//       <View className="absolute top-10 left-4">
//         <TouchableOpacity onPress={() => router.back()}>
//           <Ionicons name="arrow-back" size={30} color="white" />
//         </TouchableOpacity>
//       </View>
//       {/* Bottom Controls */}
//       <View className="absolute bottom-10 w-full flex-row justify-around items-center">
//         {/* Flip Camera */}
//         <TouchableOpacity
//           onPress={() =>
//             setCameraType(cameraType === "back" ? "front" : "back")
//           }
//         >
//           <MaterialIcons name="flip-camera-ios" size={30} color="white" />
//         </TouchableOpacity>
//         {/* Capture Button */}
//         <TouchableOpacity
//           onPress={takePicture}
//           className="w-16 h-16 bg-white rounded-full border-4 border-gray-200"
//         />
//         {/* Flash Toggle */}
//         <TouchableOpacity onPress={() => setIsFlashOn(!isFlashOn)}>
//           <Ionicons
//             name={isFlashOn ? "flash" : "flash-off"}
//             size={30}
//             color="white"
//           />
//         </TouchableOpacity>
//       </View>
//     </SafeAreaView>
//   );
// }
