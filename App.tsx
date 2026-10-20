import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  useFonts,
  Cause_400Regular,
  Cause_600SemiBold,
  Cause_700Bold,
} from "@expo-google-fonts/cause";
import { ShopScene } from "./src/scene/ShopScene";

export default function App() {
  const [fontsLoaded] = useFonts({
    Cause_400Regular,
    Cause_600SemiBold,
    Cause_700Bold,
  });
  if (!fontsLoaded) return null;
  return (
    <GestureHandlerRootView style={styles.fill}>
      <ShopScene />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
