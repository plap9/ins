import { FlatList, SafeAreaView } from "react-native";
import PostListItem from "../../components/PostListItem";
import posts from "../../../assets/data/posts.json";

export default function FeedScreen() {
    return (
    <SafeAreaView>
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

