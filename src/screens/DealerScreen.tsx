import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import Header from "../components/Header";
import api from "../api/client";

export default function DealerScreen({ route, navigation }) {
  const { employeeId, employeeName } = route.params || {};

  const [dealers, setDealers] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingDealer, setEditingDealer] = useState<any>(null);
  const [dealerName, setDealerName] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDealers();
  }, []);

  // ============================
  // Fetch dealers from API
  // ============================
  const loadDealers = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/dealers/${employeeId}`);

      if (response.data?.success) {
        const list = response.data.dealers; // <---- FIXED
        setDealers(Array.isArray(list) ? list : []);
      } else {
        setDealers([]);
      }
    } catch (err) {
      console.error("Load dealers failed:", err);
      setDealers([]);
    } finally {
      setLoading(false);
    }
  };

  // ============================
  // Create / Update dealer
  // ============================
  const handleSaveDealer = async () => {
    if (!dealerName.trim()) return Alert.alert("Error", "Name required");
    setSaving(true);

    try {
      if (editingDealer) {
        // UPDATE
        const res = await api.put(`/api/dealers/${editingDealer._id}`, {
          name: dealerName,
        });

        if (res.data?.success) loadDealers();
      } else {
        // CREATE
        const res = await api.post(`/api/dealers`, {
          name: dealerName,
          employeeId,
        });

        if (res.data?.success) loadDealers();
      }
    } catch (err) {
      console.log("Save dealer error:", err);
    }

    setDealerName("");
    setEditingDealer(null);
    setModalVisible(false);
    setSaving(false);
  };

  // ============================
  // Delete dealer
  // ============================
  const handleDeleteDealer = (dealer) => {
    Alert.alert(
      "Delete Dealer",
      `Remove "${dealer.name}" permanently?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await api.delete(`/api/dealers/${dealer._id}`);
              if (res.data?.success) loadDealers();
            } catch (err) {
              console.log("Delete dealer error:", err);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  // ============================
  // Navigate to Billing
  // ============================
  const handleCreateInvoice = (dealer) => {
    navigation.navigate("Billing", {
      employeeId,
      employeeName,
      dealerName: dealer.name,
    });
  };

  // ============================
  // Dealer Card UI
  // ============================
  const DealerCard = ({ dealer }) => (
    <View style={styles.dealerCard}>
      <View style={styles.dealerMain}>
        <View style={styles.dealerAvatar}>
          <Icon name="store" size={24} color="#fff" />
        </View>

        <View style={styles.dealerInfo}>
          <Text style={styles.dealerName}>{dealer.name}</Text>
        </View>
      </View>

      <View style={styles.dealerActions}>
        <TouchableOpacity
          style={styles.invoiceButton}
          onPress={() => handleCreateInvoice(dealer)}
        >
          <Icon name="currency-inr" size={16} color="#fff" />
          <Text style={styles.invoiceButtonText}>Invoice</Text>
        </TouchableOpacity>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => {
              setEditingDealer(dealer);
              setDealerName(dealer.name);
              setModalVisible(true);
            }}
          >
            <Icon name="pencil" size={16} color="#3b82f6" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteDealer(dealer)}
          >
            <Icon name="delete" size={16} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // ============================
  // MAIN RENDER
  // ============================
  return (
    <View style={styles.screen}>
      <Header title={`Dealers - ${employeeName}`} />

      <View style={styles.content}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            setEditingDealer(null);
            setDealerName("");
            setModalVisible(true);
          }}
        >
          <Icon name="plus" size={20} color="#fff" />
          <Text style={styles.addButtonText}>Add Dealer</Text>
        </TouchableOpacity>

        <View style={styles.box}>
          <Text style={styles.sectionTitle}>
            Dealers ({dealers?.length || 0})
          </Text>

          {loading ? (
            <ActivityIndicator size="large" color="#22c55e" />
          ) : (
            <FlatList
              data={dealers}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => <DealerCard dealer={item} />}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={loadDealers}
                  colors={["#22c55e"]}
                />
              }
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Icon name="store-outline" size={64} color="#cbd5e1" />
                  <Text style={styles.emptyText}>No dealers added</Text>
                </View>
              }
            />
          )}
        </View>

        {/* Modal */}
        <Modal visible={modalVisible} transparent animationType="slide">
          <View style={styles.overlay}>
            <View style={styles.modal}>
              <Text style={styles.modalTitle}>
                {editingDealer ? "Edit Dealer" : "Add Dealer"}
              </Text>

              <View style={styles.inputRow}>
                <Icon name="store" size={20} color="#6b7280" />
                <TextInput
                  style={styles.input}
                  value={dealerName}
                  onChangeText={setDealerName}
                  placeholder="Dealer name"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    (!dealerName.trim() || saving) && { opacity: 0.6 },
                  ]}
                  disabled={!dealerName.trim() || saving}
                  onPress={handleSaveDealer}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Icon name="check" size={18} color="#fff" />
                      <Text style={styles.saveText}>
                        {editingDealer ? "Update" : "Save"}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f8fafc" },
  content: { flex: 1, padding: 16 },
  addButton: {
    backgroundColor: "#22c55e",
    flexDirection: "row",
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    marginBottom: 20,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 8,
  },
  box: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    elevation: 4,
  },
  sectionTitle: { fontSize: 18, fontWeight: "800", marginBottom: 16 },
  dealerCard: {
    backgroundColor: "#f8fafc",
    padding: 20,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dealerMain: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  dealerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#3b82f6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  dealerInfo: {
    flex: 1,
  },
  dealerName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2937",
  },
  dealerActions: {
    alignItems: "flex-end",
  },
  invoiceButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#22c55e",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  invoiceButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 12,
    marginLeft: 4,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  editButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#dbeafe",
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#fef2f2",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  emptyState: { alignItems: "center", marginTop: 40 },
  emptyText: { marginTop: 10, fontSize: 14, color: "#94a3b8" },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 20,
  },
  modal: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 20 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    gap: 10,
  },
  input: { flex: 1, fontSize: 16 },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  cancelText: { color: "#6b7280", fontWeight: "600" },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#22c55e",
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  saveText: { color: "#fff", fontWeight: "700", marginLeft: 6 },
});
