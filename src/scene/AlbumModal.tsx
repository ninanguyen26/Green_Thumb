import { theme } from "../theme";
import { StyleSheet, View, Text, TouchableOpacity, Pressable, ScrollView } from "react-native";
import { WATER_LABEL } from "../data/plants";
import { ALBUM } from "../data/album";
import XpIcon from "../../assets/icons/xp-icon.svg";

// Album modal — the collection: hearts unlock, coins buy (in the Shop).
// Split out of ClosedShop (2026-10-20); rendered via ClosedModals.

export interface AlbumModalProps {
  W: number;
  H: number;
  albumOpen: boolean;
  onCloseAlbum: () => void;
  unlocked: Record<string, boolean>;
  hearts: number;
  onUnlock: (slug: string, hearts: number) => void;
}

export function AlbumModal(p: AlbumModalProps) {
  const { W, H } = p;
  return (
    <>
      {/* album: the collection — hearts unlock, coins buy (in the Shop) */}
      {p.albumOpen && (
        <View style={styles.backdrop}>
          <Pressable style={styles.backdropTap} onPress={p.onCloseAlbum} />
          <View style={[styles.modal, { width: W * 0.62 }]}>
            <Text style={styles.modalTitle}>📖 Album</Text>
            <View style={styles.hintRow}>
              <Text style={styles.hint}>{ALBUM.filter((a) => p.unlocked[a.slug]).length}/{ALBUM.length} collected · </Text>
              <XpIcon width={12} height={12} />
              <Text style={styles.hint}> {p.hearts} — happy customers earn hearts; hearts unlock plants here, coins buy them in the Shop</Text>
            </View>
            <ScrollView style={{ maxHeight: H * 0.55 }} showsVerticalScrollIndicator={false}>
              {ALBUM.map((a) => {
                const isOpen = !!p.unlocked[a.slug];
                return (
                  <View key={a.slug} style={styles.row}>
                    <View style={[styles.albumDot, isOpen ? styles.albumDotOpen : styles.albumDotLocked]} />
                    <Text style={styles.rowName}>{a.name}</Text>
                    <Text style={styles.rowSub}>
                      {`${a.scientific} • ☀${a.lightMin}–${a.lightMax} • 💧${WATER_LABEL[a.water]}${a.playable ? " • in the Shop" : ""}`}
                    </Text>
                    {!isOpen && (
                      <TouchableOpacity
                        style={[styles.buyBtn, p.hearts < a.hearts && styles.disabledBtn]}
                        onPress={() => p.onUnlock(a.slug, a.hearts)}
                        disabled={p.hearts < a.hearts}
                      >
                        <View style={styles.iconRow}>
                          <XpIcon width={13} height={13} />
                          <Text style={[styles.buyText, p.hearts < a.hearts && styles.disabledText]}> {a.hearts}</Text>
                        </View>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={styles.closeBtn} onPress={p.onCloseAlbum}>
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  albumDot: { width: 30, height: 30, borderRadius: 15, marginRight: 10 },
  albumDotLocked: { backgroundColor: theme.colors.locked },
  albumDotOpen: { backgroundColor: theme.colors.success },
  backdrop: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: theme.colors.backdrop,
    alignItems: "center",
    justifyContent: "center",
  },
  backdropTap: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0 },
  buyBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  buyText: { fontSize: 14, fontFamily: "Cause_700Bold", color: theme.colors.onPrimary },
  closeBtn: {
    marginTop: 12,
    alignItems: "center",
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: 10,
    paddingVertical: 8,
  },
  closeText: { fontSize: 14, fontFamily: "Cause_700Bold", color: theme.colors.text },
  disabledBtn: { backgroundColor: theme.colors.disabled },
  disabledText: { color: theme.colors.text },
  hint: { fontSize: 13, fontFamily: "Cause_400Regular", color: theme.colors.textMuted, marginVertical: 8 },
  hintRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "center" },
  iconRow: { flexDirection: "row", alignItems: "center" },
  modal: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    maxHeight: "85%",
  },
  modalTitle: { fontSize: 18, fontFamily: "Cause_700Bold", color: theme.colors.text, marginBottom: 4 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceMuted,
  },
  rowName: { flex: 1, fontSize: 14, fontFamily: "Cause_600SemiBold", color: theme.colors.text },
  rowSub: { fontSize: 12, fontFamily: "Cause_400Regular", color: theme.colors.textMuted, marginRight: 8 },
});
