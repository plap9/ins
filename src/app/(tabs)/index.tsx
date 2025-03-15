
import { FlatList } from "react-native";
import PostListItem from "../../components/PostListItem";
import posts from "../../../assets/data/posts.json";

export default function FeedScreen() {
    return (
    <FlatList
        data={posts}
        contentContainerStyle={{gap:10}}
        renderItem={({item}) => <PostListItem posts={item} />}
        showsVerticalScrollIndicator={false}
    />
    );
}

