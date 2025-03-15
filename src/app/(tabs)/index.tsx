
import { FlatList } from "react-native";
import PostListItem from "../../components/PostListItem";
import posts from "../../../assets/data/posts.json";

export default function FeedScreen() {
    return (
    <FlatList
        className="items-center"
        data={posts}
        contentContainerStyle={{gap:10, maxWidth: 512, flex: 1, width: '100%',}}
        renderItem={({item}) => <PostListItem posts={item} />}
        showsVerticalScrollIndicator={false}
    />
    );
}

