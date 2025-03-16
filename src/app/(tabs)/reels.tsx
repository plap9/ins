
import { FlatList } from "react-native";
import PostListItem from "../../components/PostListItem";
import posts from "../../../assets/data/posts.json";

export default function ReelsScreen() {
    return (
    <FlatList
        data={posts}
        className=" bg-slate-400"
        renderItem={({item}) => <PostListItem posts={item} />}
        contentContainerStyle={{
            gap:10,
            alignItems: "center",
            width: "100%",
        }}
        showsVerticalScrollIndicator={false}
    />
    );
}

