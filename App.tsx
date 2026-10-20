import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ShopScene } from "./src/scene/ShopScene";

export default function App() {
  return (
    <GestureHandlerRootView style={styles.fill}>
      <ShopScene />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
