import { StyleSheet } from "react-native";
import { useState } from "react";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  useFonts,
  Cause_400Regular,
  Cause_600SemiBold,
  Cause_700Bold,
} from "@expo-google-fonts/cause";
import { ShopScene } from "./src/scene/ShopScene";
import { HomeScreen } from "./src/scene/HomeScreen";

export default function App() {
  const [atHome, setAtHome] = useState(true);
  const [hasEntered, setHasEntered] = useState(false);
  const [fontsLoaded] = useFonts({
    Cause_400Regular,
    Cause_600SemiBold,
    Cause_700Bold,
  });
  if (!fontsLoaded) return null;
  return (
    <GestureHandlerRootView style={styles.fill}>
      <StatusBar hidden />
      {hasEntered && <ShopScene active={!atHome} onHome={() => setAtHome(true)} />}
      {atHome && (
        <HomeScreen
          returning={hasEntered}
          onEnter={() => {
            setHasEntered(true);
            setAtHome(false);
          }}
        />
      )}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
